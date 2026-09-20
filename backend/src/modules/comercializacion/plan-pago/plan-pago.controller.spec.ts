import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PlanPagoController } from './plan-pago.controller';
import { PlanPagoService } from './plan-pago.service';
import { createPlanPagoSchema } from './dto/create-plan-pago.dto';
import { updatePlanPagoSchema } from './dto/update-plan-pago.dto';
import { queryPlanPagoSchema } from './dto/query-plan-pago.dto';
import { simularCuotasSchema } from './dto/simular-cuotas.dto';

/**
 * El controller solo enruta: las reglas de negocio están probadas en
 * `plan-pago.service.spec.ts` y el cálculo en `motor-cuotas.spec.ts`. Acá se
 * verifica que cada endpoint llame al método correcto, con los parámetros
 * correctos, y devuelva lo que el service devolvió.
 *
 * El `@Roles` del controller no se prueba acá: lo cubre
 * `src/common/guards/roles.guard.spec.ts`, que lee la metadata real con un
 * `Reflector`.
 */
describe('PlanPagoController', () => {
  let controller: PlanPagoController;
  let service: {
    create: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    findByPublicacion: jest.Mock;
    simularCuotas: jest.Mock;
  };

  const ID_PLAN = 10;
  const ID_PUBLICACION = 1;

  const usuario: AuthenticatedUser = {
    id: 7,
    email: 'admin@axontech.test',
    rol: RolNombre.ADMINISTRADOR,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id_plan_pago: ID_PLAN }),
      update: jest.fn().mockResolvedValue({ id_plan_pago: ID_PLAN }),
      findOne: jest.fn().mockResolvedValue({ id_plan_pago: ID_PLAN }),
      findByPublicacion: jest.fn().mockResolvedValue([]),
      simularCuotas: jest.fn().mockReturnValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanPagoController],
      providers: [{ provide: PlanPagoService, useValue: service }],
    }).compile();

    controller = module.get(PlanPagoController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /planes-pago', () => {
    it('llama a create con el dto y el id del usuario autenticado, no con uno del body', async () => {
      const dto = createPlanPagoSchema.parse({
        FK_publicacion: ID_PUBLICACION,
        nombre: 'Contado 1-A',
        tipo: 'CONTADO',
        precio: 19000000,
        anticipo_porcentaje: 100,
      });

      const resultado = await controller.create(dto, usuario);

      expect(service.create).toHaveBeenCalledWith(dto, usuario.id);
      expect(resultado).toEqual({ id_plan_pago: ID_PLAN });
    });
  });

  describe('PATCH /planes-pago/:id', () => {
    it('llama a update con el id de la ruta, el dto y el usuario autenticado', async () => {
      const dto = updatePlanPagoSchema.parse({ precio: 21000000 });

      const resultado = await controller.update(ID_PLAN, dto, usuario);

      expect(service.update).toHaveBeenCalledWith(ID_PLAN, dto, usuario.id);
      expect(resultado).toEqual({ id_plan_pago: ID_PLAN });
    });
  });

  describe('GET /planes-pago/:id', () => {
    it('llama a findOne con el id de la ruta', async () => {
      const resultado = await controller.findOne(ID_PLAN);

      expect(service.findOne).toHaveBeenCalledWith(ID_PLAN);
      expect(resultado).toEqual({ id_plan_pago: ID_PLAN });
    });
  });

  describe('GET /planes-pago', () => {
    it('llama a findByPublicacion con los filtros ya parseados', async () => {
      const query = queryPlanPagoSchema.parse({
        FK_publicacion: String(ID_PUBLICACION),
      });

      await controller.findByPublicacion(query);

      // El schema coacciona el id a number y aplica el default estado: true.
      expect(service.findByPublicacion).toHaveBeenCalledWith({
        FK_publicacion: ID_PUBLICACION,
        estado: true,
      });
    });

    it('pasa estado=todos tal cual cuando el cliente lo pide', async () => {
      const query = queryPlanPagoSchema.parse({
        FK_publicacion: String(ID_PUBLICACION),
        estado: 'todos',
      });

      await controller.findByPublicacion(query);

      expect(service.findByPublicacion).toHaveBeenCalledWith({
        FK_publicacion: ID_PUBLICACION,
        estado: 'todos',
      });
    });
  });

  describe('POST /planes-pago/simular-cuotas', () => {
    const cuotas = [
      {
        numero: 0,
        importe: new Prisma.Decimal('5400000.00'),
        fecha_vencimiento: new Date('2026-04-14T00:00:00.000Z'),
      },
      {
        numero: 1,
        importe: new Prisma.Decimal('3600000.00'),
        fecha_vencimiento: new Date('2026-05-14T00:00:00.000Z'),
      },
    ];

    it('devuelve el array de cuotas tal cual lo dio el service, sin tocar nada más', () => {
      service.simularCuotas.mockReturnValue(cuotas);
      const dto = simularCuotasSchema.parse({
        tipo: 'FINANCIADO',
        precio: 27000000,
        anticipo_porcentaje: 20,
        cantidad_cuotas: 6,
        periodicidad: 'MENSUAL',
      });

      const resultado = controller.simularCuotas(dto);

      expect(service.simularCuotas).toHaveBeenCalledWith(dto);
      expect(resultado).toBe(cuotas);
      // Simular no escribe: ningún endpoint de escritura se toca.
      expect(service.create).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
    });

    it('no necesita FK_publicacion ni nombre: el dto ni siquiera los acepta', () => {
      const dto = simularCuotasSchema.parse({
        tipo: 'CONTADO',
        precio: 19000000,
        anticipo_porcentaje: 100,
        FK_publicacion: 99,
        nombre: 'no se usa',
      });

      controller.simularCuotas(dto);

      const enviado = (
        service.simularCuotas.mock.calls as Record<string, unknown>[][]
      )[0][0];
      expect(enviado).not.toHaveProperty('FK_publicacion');
      expect(enviado).not.toHaveProperty('nombre');
    });
  });
});
