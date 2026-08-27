import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface LoginResponseBody {
  accessToken: string;
}

interface ListadoResponseBody<T> {
  data: T[];
  meta: { total: number };
}

interface TipoMovimientoItem {
  id_tipo_movimiento: number;
  indicador_entrada: boolean;
}

interface StockBody {
  id_stock: number;
  cantidad: number;
}

interface MovimientoBody {
  id_movimiento: number;
  stockMovimientos: {
    FK_Stock: number;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
  }[];
}

/**
 * Flujo crítico de HU-07, marcado como E2E obligatorio en CLAUDE.md.
 *
 * Requiere la base de datos migrada y el seed corrido (ver prisma/seed.ts):
 * usa el usuario de prueba de Almacén, y los tipos de movimiento, categorías,
 * unidades de medida y depósitos que crea el seed. El artículo y la ficha de
 * stock los crea el propio test, con un nombre único por corrida para no
 * chocar con la validación de nombre único entre activos.
 */
describe('Movimientos (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  let idDeposito: number;
  let idTipoEntrada: number;
  let idTipoSalida: number;
  let idStock: number;

  const CANTIDAD_INICIAL = 25;

  const get = (url: string) =>
    request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${accessToken}`);

  const post = (url: string, body: object) =>
    request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts no corre en los tests, así que hay que replicar acá lo que
    // configura del app (prefijo global y cookies).
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'almacen@axontech.test', password: 'Password123!' })
      .expect(200);
    accessToken = (login.body as LoginResponseBody).accessToken;

    // Datos del seed
    const depositos = await get('/api/depositos').expect(200);
    idDeposito = (
      depositos.body as ListadoResponseBody<{ id_deposito: number }>
    ).data[0].id_deposito;

    const tipos = await get('/api/tipos-movimiento').expect(200);
    const tiposData = (tipos.body as ListadoResponseBody<TipoMovimientoItem>)
      .data;
    idTipoEntrada = tiposData.find(
      (t) => t.indicador_entrada,
    )!.id_tipo_movimiento;
    idTipoSalida = tiposData.find(
      (t) => !t.indicador_entrada,
    )!.id_tipo_movimiento;

    const categorias = await get('/api/categorias').expect(200);
    const unidades = await get('/api/unidades-medida').expect(200);

    // Artículo y ficha propios del test, con nombre único por corrida.
    const articulo = await post('/api/articulos', {
      nombre: `Artículo e2e movimientos ${Date.now()}`,
      FK_Categoria: (
        categorias.body as ListadoResponseBody<{ id_categoria: number }>
      ).data[0].id_categoria,
      FK_UnidadMedida: (
        unidades.body as ListadoResponseBody<{ id_unidad_medida: number }>
      ).data[0].id_unidad_medida,
    }).expect(201);

    const stock = await post('/api/stock', {
      FK_articulo: (articulo.body as { id_articulo: number }).id_articulo,
      FK_deposito: idDeposito,
      umbral_minimo: 5,
    }).expect(201);
    idStock = (stock.body as StockBody).id_stock;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un movimiento de entrada y sube el stock de la ficha', async () => {
    const respuesta = await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoEntrada,
      FK_Deposito: idDeposito,
      referencia: 'Remito e2e 001',
      detalle: [
        {
          FK_Stock: idStock,
          cantidad: CANTIDAD_INICIAL,
          observacion: 'Carga inicial del test',
        },
      ],
    }).expect(201);

    const movimiento = respuesta.body as MovimientoBody;
    expect(movimiento.id_movimiento).toEqual(expect.any(Number));
    expect(movimiento.stockMovimientos).toHaveLength(1);
    // La ficha arranca en 0 porque el alta de stock nunca setea cantidad.
    expect(movimiento.stockMovimientos[0]).toMatchObject({
      FK_Stock: idStock,
      cantidad: CANTIDAD_INICIAL,
      stock_anterior: 0,
      stock_nuevo: CANTIDAD_INICIAL,
    });

    const ficha = await get(`/api/stock/${idStock}`).expect(200);
    expect((ficha.body as StockBody).cantidad).toBe(CANTIDAD_INICIAL);
  });

  it('registra una salida y baja el stock de la ficha', async () => {
    await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoSalida,
      FK_Deposito: idDeposito,
      detalle: [{ FK_Stock: idStock, cantidad: 5 }],
    }).expect(201);

    const ficha = await get(`/api/stock/${idStock}`).expect(200);
    expect((ficha.body as StockBody).cantidad).toBe(CANTIDAD_INICIAL - 5);
  });

  it('una salida con stock insuficiente no deja rastros: ni cabecera ni stock tocado', async () => {
    const antesListado = await get(
      `/api/movimientos?FK_Deposito=${idDeposito}`,
    ).expect(200);
    const totalAntes = (antesListado.body as ListadoResponseBody<unknown>).meta
      .total;

    const antesFicha = await get(`/api/stock/${idStock}`).expect(200);
    const cantidadAntes = (antesFicha.body as StockBody).cantidad;

    await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoSalida,
      FK_Deposito: idDeposito,
      detalle: [{ FK_Stock: idStock, cantidad: cantidadAntes + 1 }],
    }).expect(409);

    const despuesListado = await get(
      `/api/movimientos?FK_Deposito=${idDeposito}`,
    ).expect(200);
    expect(
      (despuesListado.body as ListadoResponseBody<unknown>).meta.total,
    ).toBe(totalAntes);

    const despuesFicha = await get(`/api/stock/${idStock}`).expect(200);
    expect((despuesFicha.body as StockBody).cantidad).toBe(cantidadAntes);
  });

  it('rechaza el detalle con la misma ficha repetida', async () => {
    await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoEntrada,
      FK_Deposito: idDeposito,
      detalle: [
        { FK_Stock: idStock, cantidad: 1 },
        { FK_Stock: idStock, cantidad: 2 },
      ],
    }).expect(400);
  });

  it('rechaza una fecha de movimiento futura', async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoEntrada,
      FK_Deposito: idDeposito,
      fecha_movimiento: manana.toISOString(),
      detalle: [{ FK_Stock: idStock, cantidad: 1 }],
    }).expect(400);
  });

  // El caso "la ficha existe pero es de otro depósito" (400) está cubierto en
  // los unit tests del service; acá se prueba el depósito inexistente, que
  // corta antes.
  it('rechaza un depósito inexistente en la cabecera', async () => {
    await post('/api/movimientos', {
      FK_TipoMovimiento: idTipoEntrada,
      FK_Deposito: 999999,
      detalle: [{ FK_Stock: idStock, cantidad: 1 }],
    }).expect(404);
  });
});
