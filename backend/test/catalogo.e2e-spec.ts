import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface CatalogoItem {
  id_unidad_funcional: number;
  identificador: string;
  tipologia: string;
  precio_desde: number;
  condicion_entrega: {
    codigo: string;
    texto: string;
    fecha_referencia: string | null;
  };
  proyecto: { nombre: string; localidad: string };
}

interface CatalogoListadoBody {
  data: CatalogoItem[];
  meta: { total: number; page: number; limit: number };
}

interface CatalogoDetalleBody {
  identificador: string;
  planes: { nombre: string; precio: number }[];
}

interface ProyectosDestacadosBody {
  data: { cantidad_disponibles: number; precio_desde: number }[];
}

/**
 * API pública del ecommerce (T107). Sin login: ninguno de estos requests manda
 * `Authorization`.
 *
 * Requiere la base de datos migrada y ambos seeds corridos: `seed.ts` y,
 * puntualmente, `seed-comercializacion.ts` (10 proyectos, unidades,
 * publicaciones y planes de pago — ver `npm run seed:comercializacion`). El id
 * 1 (`LOTE-08`, VENDIDA) es fijo de ese seed y se usa a propósito para probar
 * el caso "no está en el catálogo".
 */
describe('Catálogo público (e2e)', () => {
  let app: INestApplication;

  const get = (url: string) => request(app.getHttpServer()).get(url);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde sin token', async () => {
    await get('/api/catalogo').expect(200);
    await get('/api/catalogo/destacados').expect(200);
  });

  it('no se rompe si viene un token inválido, de otro tipo de usuario', async () => {
    await request(app.getHttpServer())
      .get('/api/catalogo')
      .set('Authorization', 'Bearer esto-no-es-un-jwt-valido')
      .expect(200);
  });

  it('el listado no expone costo, presupuesto, margen ni datos de cliente/venta', async () => {
    const res = await get('/api/catalogo?limit=50').expect(200);

    expect(JSON.stringify(res.body)).not.toMatch(
      /"costo"|presupuesto|margen|porcentaje_ganancia|cliente|dni_cuil|google_sub/i,
    );
  });

  it('el precio "desde" de una unidad coincide con el menor precio entre sus planes activos', async () => {
    const res = await get('/api/catalogo?limit=50').expect(200);
    const body = res.body as CatalogoListadoBody;

    const unidad1A = body.data.find((item) => item.identificador === '1-A');
    expect(unidad1A).toBeDefined();
    // Del seed: "Contado 1-A" a $19.000.000 y "Financiado 12 cuotas 1-A" a
    // $21.000.000, ambos activos — el menor es el de contado.
    expect(unidad1A!.precio_desde).toBe(19000000);
  });

  it('combina los filtros de localidad, tipología y condición de entrega con la paginación', async () => {
    const res = await get(
      '/api/catalogo?localidad=Santa%20Fe&tipologia=DOS_DORMITORIOS&entregada=false&page=1&limit=5',
    ).expect(200);
    const body = res.body as CatalogoListadoBody;

    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(5);
    for (const item of body.data) {
      expect(item.tipologia).toBe('DOS_DORMITORIOS');
      expect(item.proyecto.localidad).toContain('Santa Fe');
      expect(item.condicion_entrega.codigo).toMatch(/^A_ENTREGAR/);
    }
  });

  it('el detalle de una unidad vendida no existe para el catálogo público', async () => {
    await get('/api/catalogo/1').expect(404);
  });

  it('el detalle devuelve los planes activos con su precio', async () => {
    const res = await get('/api/catalogo/2').expect(200);
    const body = res.body as CatalogoDetalleBody;

    expect(body.identificador).toBe('1-A');
    expect(body.planes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nombre: 'Contado 1-A', precio: 19000000 }),
      ]),
    );
  });

  it('destacados devuelve hasta 4 proyectos, ordenados por cantidad de unidades disponibles', async () => {
    const res = await get('/api/catalogo/destacados').expect(200);
    const body = res.body as ProyectosDestacadosBody;
    const proyectos = body.data;

    expect(proyectos.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < proyectos.length; i++) {
      expect(proyectos[i - 1].cantidad_disponibles).toBeGreaterThanOrEqual(
        proyectos[i].cantidad_disponibles,
      );
    }
  });
});
