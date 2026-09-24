import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoConsulta,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { QueryConsultaDto } from './dto/query-consulta.dto';
import { ResponderConsultaDto } from './dto/responder-consulta.dto';

const UNIDAD_RESUMEN_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  proyecto: { select: { nombre: true } },
} as const;

const CLIENTE_RESUMEN_SELECT = {
  id_cliente: true,
  nombre: true,
  apellido: true,
  email: true,
} as const;

/**
 * Lo que necesita la vista del cliente. `publicacion.unidadFuncional` y no
 * `unidadFuncional` directo: la consulta se guarda contra `FK_publicacion`
 * (ver comentario del modelo en schema.prisma), no contra la unidad.
 */
const CONSULTA_CLIENTE_SELECT = {
  id_consulta: true,
  texto: true,
  estado: true,
  respuesta: true,
  fecha_respuesta: true,
  hora_creacion: true,
  publicacion: {
    select: { unidadFuncional: { select: UNIDAD_RESUMEN_SELECT } },
  },
} as const;

/** La vista interna agrega quién es el cliente que consultó. */
const CONSULTA_INTERNA_SELECT = {
  ...CONSULTA_CLIENTE_SELECT,
  cliente: { select: CLIENTE_RESUMEN_SELECT },
} as const;

type ConsultaCliente = Prisma.CONSULTAUNIDADGetPayload<{
  select: typeof CONSULTA_CLIENTE_SELECT;
}>;
type ConsultaInterna = Prisma.CONSULTAUNIDADGetPayload<{
  select: typeof CONSULTA_INTERNA_SELECT;
}>;

@Injectable()
export class ConsultaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de una consulta (HU-26): solo sobre una unidad con publicación
   * vigente y DISPONIBLE — mismo criterio que el catálogo público
   * (`CatalogoService.obtenerDetalle`). Sin restricción de unicidad: el
   * mismo cliente puede consultar la misma unidad más de una vez.
   *
   * Requiere sesión de cliente iniciada: la resuelve el controller vía
   * `ClienteAuthGuard`, acá solo se recibe `clienteId` ya autenticado.
   */
  async crear(dto: CreateConsultaDto, clienteId: number) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findFirst({
      where: {
        FK_unidad_funcional: dto.FK_unidad_funcional,
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
      },
      select: { id_publicacion: true },
    });

    if (!publicacion) {
      throw new NotFoundException('No existe una unidad disponible con ese id');
    }

    const consulta = await this.prisma.cONSULTAUNIDAD.create({
      data: {
        FK_cliente: clienteId,
        FK_publicacion: publicacion.id_publicacion,
        texto: dto.texto,
      },
      select: CONSULTA_CLIENTE_SELECT,
    });

    return mapearConsultaCliente(consulta);
  }

  /**
   * Historial del cliente autenticado: solo las suyas, de la más reciente a
   * la más antigua, con la respuesta cuando existe. No filtra por `vigente`
   * ni por `estado_comercial` de la publicación: sigue mostrando las
   * consultas de unidades que después se despublicaron.
   */
  async listarDeCliente(clienteId: number, page: number, limit: number) {
    const where: Prisma.CONSULTAUNIDADWhereInput = { FK_cliente: clienteId };

    const [consultas, total] = await Promise.all([
      this.prisma.cONSULTAUNIDAD.findMany({
        where,
        select: CONSULTA_CLIENTE_SELECT,
        orderBy: { hora_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cONSULTAUNIDAD.count({ where }),
    ]);

    return {
      data: consultas.map(mapearConsultaCliente),
      meta: { total, page, limit },
    };
  }

  /**
   * Cola de trabajo de Comercialización para responder consultas (HU-26):
   * filtros combinables por unidad, cliente, estado y período (sobre
   * `hora_creacion`, la única fecha de la consulta). Es una cola, no un
   * dashboard: sin resúmenes ni indicadores, y mismo criterio que
   * `listarDeCliente` sobre no filtrar por vigencia de la publicación.
   */
  async listar(query: QueryConsultaDto) {
    const {
      FK_unidad_funcional,
      FK_cliente,
      estado,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.CONSULTAUNIDADWhereInput = {
      ...(FK_cliente !== undefined && { FK_cliente }),
      ...(estado !== undefined && { estado }),
      ...(FK_unidad_funcional !== undefined && {
        publicacion: { FK_unidad_funcional },
      }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        hora_creacion: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [consultas, total] = await Promise.all([
      this.prisma.cONSULTAUNIDAD.findMany({
        where,
        select: CONSULTA_INTERNA_SELECT,
        orderBy: { hora_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cONSULTAUNIDAD.count({ where }),
    ]);

    return {
      data: consultas.map(mapearConsultaInterna),
      meta: { total, page, limit },
    };
  }

  /**
   * Responde una consulta. PENDIENTE → RESPONDIDA, sin vuelta atrás:
   * responder una consulta ya respondida se rechaza, y no hay ningún
   * endpoint que edite la respuesta una vez enviada (no hay `update` sin
   * este chequeo en ningún otro lado del módulo).
   */
  async responder(id: number, dto: ResponderConsultaDto, usuarioId: number) {
    const consulta = await this.prisma.cONSULTAUNIDAD.findUnique({
      where: { id_consulta: id },
      select: { estado: true },
    });

    if (!consulta) {
      throw new NotFoundException(`No existe una consulta con id ${id}`);
    }
    if (consulta.estado === EstadoConsulta.RESPONDIDA) {
      throw new ConflictException(
        'Esta consulta ya fue respondida; no se puede volver a responder ni editar la respuesta enviada.',
      );
    }

    const actualizada = await this.prisma.cONSULTAUNIDAD.update({
      where: { id_consulta: id },
      data: {
        estado: EstadoConsulta.RESPONDIDA,
        respuesta: dto.respuesta,
        fecha_respuesta: new Date(),
        FK_usuario_respuesta: usuarioId,
      },
      select: CONSULTA_INTERNA_SELECT,
    });

    return mapearConsultaInterna(actualizada);
  }
}

function mapearConsultaCliente(consulta: ConsultaCliente) {
  return {
    id_consulta: consulta.id_consulta,
    texto: consulta.texto,
    estado: consulta.estado,
    respuesta: consulta.respuesta,
    fecha_respuesta: consulta.fecha_respuesta?.toISOString() ?? null,
    hora_creacion: consulta.hora_creacion.toISOString(),
    unidad: consulta.publicacion.unidadFuncional,
  };
}

function mapearConsultaInterna(consulta: ConsultaInterna) {
  return {
    ...mapearConsultaCliente(consulta),
    cliente: consulta.cliente,
  };
}
