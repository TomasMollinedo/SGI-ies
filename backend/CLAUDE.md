# IES Constructora — Backend

Sistema de gestión para una constructora (materia Sistemas III, Scrum). Equipo de 3 personas con conocimiento básico-intermedio desarrollando este backend. Respondé siempre en español.

## Backend y frontend: dos universos separados
No hay código, tipos ni constantes compartidas con `frontend/` — ni siquiera para cosas fijas como los roles. El único punto de contacto es la API HTTP documentada en Swagger. Nunca proponer ni crear un mecanismo de compartición (workspace, paquete común, tipos exportados).

## Documentación del proyecto
La documentación profunda (arquitectura, decisiones, actas) vive en el Drive del equipo, no en este repo — no crear una carpeta `docs/` acá. Sí debe existir un `README.md` en la raíz con los pasos para levantar el proyecto en local (`docker compose up`, copiar `.env.example`, etc.).

## Stack
- Node.js 24 (LTS), TypeScript 5.9
- NestJS 11 — monolito modular (sin microservicios)
- PostgreSQL 18 vía Docker, Prisma 7 como ORM (config en `prisma.config.ts`)
- Zod + nestjs-zod para validación — nunca class-validator ni class-transformer
- JWT vía Passport (`@nestjs/passport`, `passport-jwt`)
- Swagger (`@nestjs/swagger`) — ver sección aparte, es el contrato completo con el frontend
- `@nestjs/config` para variables de entorno (ver sección aparte)
- npm como package manager

## Comandos
- `npm run start:dev` — server en watch mode
- `npm test` / `npm run test:e2e` — tests
- `npm run lint` — ESLint + Prettier. Correlo antes de dar cualquier tarea por terminada
- `npx prisma generate` — regenerar el cliente después de tocar `schema.prisma`
- `npx prisma migrate dev` — aplica migraciones (ver restricciones abajo: no lo corras vos)

## Variables de entorno
Todo dato sensible (`DATABASE_URL`, `JWT_SECRET`, etc.) sale de `process.env` vía `@nestjs/config` — nunca hardcodeado en el código. Las env vars se validan con un schema Zod al arrancar la aplicación: si falta o está mal una variable obligatoria, el servidor no debe levantar (fail-fast), en vez de fallar más adelante en el primer request que la necesite.

## Arquitectura
Un dominio de negocio = un Nest Module en `src/modules/<dominio>/`. Autenticación va primero, porque los demás dependen de él. Los módulos de negocio concretos (Almacén, y los que se vayan sumando — es probable que aparezca Usuarios además de Autenticación) pueden cambiar a medida que avanza el backlog. Para saber cuáles existen hoy, mirá `src/modules/` directamente en vez de asumir una lista fija acá.

Un dominio grande (ej. Almacén) puede agrupar varios submódulos propios, cada uno con su propia carpeta: `src/modules/almacen/marca/`, `src/modules/almacen/articulo/`, `src/modules/almacen/deposito/`, etc. Cada submódulo se registra directo en `AppModule` (no hace falta un módulo "paraguas" tipo `AlmacenModule` mientras no aporte nada propio).

Estructura dentro de cada módulo:
```
<dominio>/
├── <dominio>.module.ts
├── <dominio>.controller.ts
├── <dominio>.service.ts
└── dto/
    ├── create-<entidad>.dto.ts
    └── update-<entidad>.dto.ts
```

Todas las rutas cuelgan de un prefijo global `/api` (`app.setGlobalPrefix('api')` en `main.ts`) — un controller se registra con su path relativo nomás (ej. `@Controller('marcas')`), nunca hardcodeando `api/` a mano. Ejemplo: `GET http://localhost:3000/api/health`.

Prisma se inyecta siempre a través de un `PrismaService` (extiende `PrismaClient`, con `$connect()` en `onModuleInit` y `$disconnect()` en `onModuleDestroy`) expuesto por un `PrismaModule`. Nunca instanciar `new PrismaClient()` suelto en un archivo.

Al modelar un `enum` en `schema.prisma` (estados operativos, estados de confirmación, etc.), pensar el conjunto completo de valores con el equipo antes de migrar — sacar o reordenar un valor de un enum de Postgres después de aplicada la migración genera fricción.


### Reutilización de código entre módulos
No extraer lógica a una zona común "por las dudas". Si una validación, helper o lógica de negocio se repite igual en 2 o más submódulos (ej. `almacen/marca` y `almacen/articulo`, o entre distintos dominios como `almacen` y `ventas`), ahí sí se extrae a `src/common/`. La primera vez que se escribe algo, vive dentro de su propio módulo — aunque se sepa que probablemente se vaya a reutilizar después.

**Excepción — búsqueda de texto en listados:** `condicionBusquedaPorPalabras` (`src/common/validaciones/busqueda-por-palabras.ts`) es la única excepción a la regla de arriba: se extrajo a `common/` desde su primer uso (Proveedor), a propósito, para fijar un único criterio de búsqueda en todo el proyecto en vez de que cada submódulo reinvente el suyo. Arma una condición de Prisma que exige que **cada palabra** de la búsqueda esté contenida en el campo (sin importar el orden ni que sean contiguas) — a diferencia de un `contains` de la frase completa, que exigiría el orden exacto. Todo endpoint de listado que agregue un filtro de búsqueda de texto libre (`busqueda`, sea por nombre, razón social, etc.) tiene que usar este helper en vez de un `contains` manual. Los módulos que ya tenían su propio `contains` antes de esta convención (Marca, Artículo, ...) no se migraron retroactivamente — no hace falta tocarlos salvo que se toquen por otro motivo.

### Nomenclatura de modelos en `schema.prisma`
Los nombres de `model` van siempre en MAYÚSCULA (`USUARIO`, `ROL`, `ARTICULO`, `MOVIMIENTO`, etc.), sin excepción — es la convención que ya traía el schema y se mantiene para todo modelo nuevo. Esto afecta el nombre de la tabla en Postgres y el accessor que expone el cliente de Prisma generado (ej. `prisma.uSUARIO.findUnique(...)`, `prisma.rOL.findMany(...)` — Prisma solo baja a minúscula la primera letra del nombre del modelo). Los campos, relaciones y enums dentro del modelo siguen en `camelCase`/español normal (`id_usuario`, `usuarioCreador`, `RolNombre`).


## Autenticación y autorización
El login (`AuthModule`) usa un esquema de doble token:
- **`accessToken`**: JWT de vida corta (`JWT_EXPIRES_IN`, default `15m`), viaja en el body de `POST /auth/login` y en cada request protegido como header `Authorization: Bearer <accessToken>`. El frontend lo guarda en memoria, nunca en `localStorage`.
- **`refreshToken`**: JWT de vida larga (`JWT_REFRESH_EXPIRES_IN`, default `7d`), firmado con un secreto distinto (`JWT_REFRESH_SECRET` ≠ `JWT_SECRET`), viaja únicamente como cookie `httpOnly` seteada por el backend — nunca en el body ni accesible desde JS. Se rota en cada `POST /auth/refresh` y se revoca server-side comparando contra un hash bcrypt guardado en `USUARIO.refreshTokenHash` (sesión única por usuario, sin blacklist de tokens ni tabla de sesiones por dispositivo — ver `AuthService`).

`JwtAuthGuard` y `RolesGuard` se registran una sola vez, como `APP_GUARD` globales dentro de `AuthModule` — no hay que volver a registrarlos en otros módulos. De esto se desprende:
- **Todo endpoint nuevo queda protegido por defecto** (requiere `Authorization: Bearer <accessToken>` válido), salvo que se marque explícitamente `@Public()` (hoy solo `login` y `refresh`).
- **Todo módulo de negocio tiene un rol "dueño" del recurso**, declarado con `@Roles(RolNombre.<ROL>)` a nivel `Controller` (no endpoint por endpoint, salvo que un mismo controller vaya a mezclar endpoints con distinto rol requerido — no pasó todavía). Ejemplo ya implementado: `MarcaController`, `CategoriaController` y `UnidadMedidaController` son los tres `@Roles(RolNombre.ADMINISTRADOR)`, igual que el resto de los submódulos de Almacén. Al sumar un módulo de negocio nuevo, preguntar (si no surge obvio de la HU) qué rol de `RolNombre` es el dueño, aplicar el mismo patrón y sumar el controller a `roles.guard.spec.ts` (ver Testing).
- `GERENTE_GENERAL` tiene acceso transversal a todo (el propio `RolesGuard` lo bypassea) — nunca hace falta agregarlo a la lista de roles de un endpoint.
- En el módulo de Alertas, `ADMINISTRADOR` tiene las mismas facultades que `GERENTE_GENERAL`: ve y atiende las alertas de cualquier rol destinatario, no solo las del suyo (ver `AlertaService.veTodasLasAlertas`). Ese bypass es solo de Alertas — a nivel `RolesGuard` el `ADMINISTRADOR` no bypassea nada, entra a los endpoints donde figura en `@Roles(...)`.
- Un controller **sin** `@Roles(...)` queda accesible para cualquier usuario autenticado, sea cual sea su rol — reservarlo para recursos que de verdad no son específicos de un rol (ej. `GET /auth/me`).
- Para leer el usuario autenticado dentro de un controller, usar `@CurrentUser() user: AuthenticatedUser` (expone `id`, `email`, `rol`) — nunca decodificar el JWT a mano.
- Todo endpoint protegido documenta en Swagger `@ApiBearerAuth()` + `@ApiUnauthorizedResponse` (401) y, si además tiene `@Roles(...)`, también `@ApiForbiddenResponse` (403) — ver sección Swagger.

### Auditoría (`FK_usuario_creador` / `FK_usuario_actualizador`)
Los campos de auditoría de cada entidad se completan siempre con el `id` del usuario autenticado (`@CurrentUser().id`), pasado como parámetro explícito del service — **nunca** se leen del DTO/body. El DTO Zod de un módulo de negocio no debe incluir `FK_usuario_creador`, `FK_usuario_actualizador` ni timestamps de auditoría: son responsabilidad exclusiva del servidor, porque si viajaran en el body cualquier cliente podría falsificar quién hizo un cambio. Patrón esperado en el service:
```ts
async create(dto: CreateXDto, usuarioId: number) {
  return this.prisma.eNTIDAD.create({
    data: { ...dto, FK_usuario_creador: usuarioId, FK_usuario_actualizador: usuarioId },
  });
}
```
y en el controller, extraer `usuarioId` de `@CurrentUser()` y pasarlo al service — nunca de un valor fijo ni de algo que mande el cliente.

## Validación
Todo DTO se define como schema Zod + `createZodDto()` de nestjs-zod, en el mismo archivo `*.dto.ts`. Nunca decoradores de class-validator.

## Swagger: es el contrato, no un detalle opcional
Como no hay nada compartido con el frontend, Swagger ES la única fuente de verdad sobre la forma de la API. El ideal es que el equipo de frontend resuelva casi todo mirando Swagger, y solo le pregunte a backend lo que no le haya quedado claro — no al revés. Por eso la documentación tiene que alcanzar para eso, no ser un trámite. Todo endpoint nuevo necesita, sin excepción:
- `@ApiTags(...)` a nivel controller
- `@ApiOperation({ summary: '...' })` por endpoint
- `@ApiBearerAuth()` en los endpoints protegidos, para poder probarlos autenticados desde la UI de Swagger
- `@ApiParam(...)` para parámetros de ruta (ej. `:id`) — el body no hace falta documentarlo aparte, sale solo del DTO Zod (`createZodDto` ya expone la metadata que `@nestjs/swagger` necesita)
- `@ApiQuery(...)` para cada query param de filtros/paginación — a diferencia del body, un DTO Zod usado con `@Query()` NO se documenta solo (no hay plugin de Nest CLI activado en este proyecto), así que cada parámetro se declara a mano: nombre, si es obligatorio, tipo y una descripción corta
- `@ApiResponse(...)` (o su variante corta `@ApiOkResponse`/`@ApiCreatedResponse`/etc.) por cada código de estado real que el endpoint puede devolver (400, 401, 403, 404 si aplican, no solo 200/201) — tiene que coincidir con las excepciones que tira el service (ver Convenciones de código). Las respuestas 2xx siempre llevan `type: <DTO>` apuntando a un DTO Zod con el shape real devuelto — una `description` sin `type` no le sirve al frontend para saber qué campos vienen en la respuesta

## Paginación
Todo endpoint de listado que pueda crecer sin límite soporta `?page=1&limit=10` y devuelve `{ data: [...], meta: { total, page, limit } }`. No hace falta en catálogos chicos y fijos por diseño (ej. tipos de movimiento, roles).

## Testing
- Unit tests de la lógica de negocio en los services: al menos uno por historia de usuario.
- E2E solo para flujos críticos (login, alta de movimiento). No exhaustivo en todo — ajustable si la cátedra pide más cobertura.
- **Al sumar un controller con `@Roles(...)`, agregarlo a `src/common/guards/roles.guard.spec.ts`.** Ese spec importa los controllers de verdad y lee su metadata con un `Reflector` real, así que es lo que fija por escrito qué rol es dueño de cada módulo: cubre que el rol dueño entra, que otro rol recibe 403, y que `GERENTE_GENERAL` bypassea. Si el spec no conoce un controller, ese controller no tiene protegido su `@Roles` contra un cambio accidental.
- Los tests unitarios de los services **no** pasan por `JwtAuthGuard` ni `RolesGuard` (instancian el service pelado), y los services de negocio reciben solo `usuarioId: number`, nunca el rol. O sea: un cambio de roles no puede romper un spec de service, y tampoco puede estar cubierto por uno — para eso está el spec del guard.
- Los E2E se loguean con un usuario del seed (`prisma/seed.ts`), así que el email tiene que ser el del rol dueño del módulo que se está probando, o todo el `beforeAll` se cae con 403.

## Convenciones de código
- Seguir el ESLint/Prettier ya configurado.
- Nomenclatura: variables y funciones en `camelCase`, clases en `PascalCase`, archivos en `kebab-case`, constantes en `UPPER_SNAKE_CASE`.
- Entidades y conceptos de dominio, en español, calzando con la HU: `Articulo`, `Movimiento`, `Rol`, `AlmacenModule` (nombres de clases TypeScript en `PascalCase` — no confundir con el nombre del `model` en `schema.prisma`, que va en mayúscula, ver sección de Nomenclatura de modelos). Lo genérico y técnico, en inglés: `service`, `controller`, `guard`.
- Mensajes de error: en español, descriptivos.
- Errores: tirar las excepciones propias de Nest (`NotFoundException`, `BadRequestException`, `ConflictException`, etc.) desde el service. El `HttpExceptionFilter` central las atrapa y formatea — nunca try/catch suelto en un controller.
- Comentarios en formato JSDoc en los métodos públicos de los services y en cualquier decisión no obvia. No hace falta en cada función trivial — el nombre y los tipos ya documentan eso.
- Priorizar código simple y legible por sobre soluciones "inteligentes": el objetivo es aprendizaje, escalabilidad y mantenibilidad, no solo que funcione.

## Alcance y ambigüedad
Implementá lo que pide la historia de usuario. No generalices de más ni sumes funcionalidad que no se pidió. Si un pedido es ambiguo sobre QUÉ tiene que hacer algo (ej. "una función para los clientes" sin decir si es listar, buscar por id o crear), preguntá antes de escribir código en vez de asumir.

## Qué NO hacer sin que se te pida explícitamente
- No hacer `commit`, `push`, ni abrir o mergear PRs. Dejá los cambios sin commitear.
- No correr migraciones (`prisma migrate dev/deploy/reset`) ni `db seed`. Está bien proponer el cambio al schema; la persona corre el comando y revisa la migración generada.
- No editar ni borrar migraciones ya mergeadas a `main` salvo que el equipo lo haya acordado explícitamente (ver sección Migraciones de Prisma).
- No agregar dependencias nuevas al `package.json` sin avisar primero.
- Antes de tocar más de un módulo o el schema de la base, proponé el plan y esperá confirmación.
