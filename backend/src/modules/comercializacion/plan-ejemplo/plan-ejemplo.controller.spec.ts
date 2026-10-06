import { Test, TestingModule } from '@nestjs/testing';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PlanEjemploController } from './plan-ejemplo.controller';
import { PlanEjemploService } from './plan-ejemplo.service';
import { createPlanEjemploSchema } from './dto/create-plan-ejemplo.dto';
import { updatePlanEjemploSchema } from './dto/update-plan-ejemplo.dto';
import { queryPlanEjemploSchema } from './dto/query-plan-ejemplo.dto';
import { simularPlanEjemploSchema } from './dto/simular-plan-ejemplo.dto';

/**
 * El controller solo enruta: las reglas de negocio están probadas en
 * `plan-ejemplo.service.spec.ts` y el cálculo en `importes-plan-ejemplo.spec.ts`
 * y `motor-cuotas.spec.ts`. El `@Roles` lo cubre
 * `src/common/guards/roles.guard.spec.ts`.
 */
describe('PlanEjemploController', () => {
  let controller: PlanEjemploController;
  let service: {
    create: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    findByPublicacion: jest.Mock;
    simular: jest.Mock;
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
      create: jest.fn().mockResolvedValue({ id_plan_ejemplo: ID_PLAN }),
      update: jest.fn().mockResolvedValue({ id_plan_ejemplo: ID_PLAN }),
      findOne: jest.fn().mockResolvedValue({ id_plan_ejemplo: ID_PLAN }),
      findByPublicacion: jest.fn().mockResolvedValue([]),
      simular: jest.fn().mockResolvedValue({ valor_cuota: '945595.97' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanEjemploController],
      providers: [{ provide: PlanEjemploService, useValue: service }],
    }).compile();

    controller = module.get(PlanEjemploController);
  });

  it('POST /planes-ejemplo llama a create con el dto y el id del usuario autenticado', async () => {
    const dto = createPlanEjemploSchema.parse({
      FK_publicacion: ID_PUBLICACION,
      nombre: 'Anticipo 30 % + 12 cuotas',
      anticipo_porcentaje: 30,
      FK_plazo_financiacion: 3,
    });

    const resultado = await controller.create(dto, usuario);

    expect(service.create).toHaveBeenCalledWith(dto, usuario.id);
    expect(resultado).toEqual({ id_plan_ejemplo: ID_PLAN });
  });

  it('PATCH /planes-ejemplo/:id llama a update con el id de la ruta, el dto y el usuario', async () => {
    const dto = updatePlanEjemploSchema.parse({ estado: false });

    await controller.update(ID_PLAN, dto, usuario);

    expect(service.update).toHaveBeenCalledWith(ID_PLAN, dto, usuario.id);
  });

  it('GET /planes-ejemplo/:id llama a findOne con el id de la ruta', async () => {
    await controller.findOne(ID_PLAN);

    expect(service.findOne).toHaveBeenCalledWith(ID_PLAN);
  });

  it('GET /planes-ejemplo llama a findByPublicacion con los filtros ya parseados', async () => {
    const query = queryPlanEjemploSchema.parse({
      FK_publicacion: String(ID_PUBLICACION),
    });

    await controller.findByPublicacion(query);

    expect(service.findByPublicacion).toHaveBeenCalledWith({
      FK_publicacion: ID_PUBLICACION,
      estado: true,
    });
  });

  it('POST /planes-ejemplo/simular llama a simular y no toca ningún endpoint de escritura', async () => {
    const dto = simularPlanEjemploSchema.parse({
      FK_publicacion: ID_PUBLICACION,
      anticipo_porcentaje: 50,
      FK_plazo_financiacion: 3,
      // El nombre no forma parte de la simulación: se descarta.
      nombre: 'no se usa',
    });

    const resultado = await controller.simular(dto);

    expect(service.simular).toHaveBeenCalledWith({
      FK_publicacion: ID_PUBLICACION,
      anticipo_porcentaje: 50,
      FK_plazo_financiacion: 3,
    });
    expect(resultado).toEqual({ valor_cuota: '945595.97' });
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });
});
