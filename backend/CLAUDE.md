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

Prisma se inyecta siempre a través de un `PrismaService` (extiende `PrismaClient`, con `$connect()` en `onModuleInit` y `$disconnect()` en `onModuleDestroy`) expuesto por un `PrismaModule`. Nunca instanciar `new PrismaClient()` suelto en un archivo.

Al modelar un `enum` en `schema.prisma` (estados operativos, estados de confirmación, etc.), pensar el conjunto completo de valores con el equipo antes de migrar — sacar o reordenar un valor de un enum de Postgres después de aplicada la migración genera fricción.

## Guards y permisos
`JwtAuthGuard` se registra global (`APP_GUARD`), no ruta por ruta — así ningún endpoint nuevo queda desprotegido por olvido. Los pocos endpoints públicos (login) se marcan con un decorador `@Public()` que el guard respeta. `RolesGuard` también va global, leyendo el decorador `@Roles(...)` en cada ruta que lo necesite; una ruta sin `@Roles(...)` queda accesible para cualquier usuario autenticado.

## Validación
Todo DTO se define como schema Zod + `createZodDto()` de nestjs-zod, en el mismo archivo `*.dto.ts`. Nunca decoradores de class-validator.

## Swagger: es el contrato, no un detalle opcional
Como no hay nada compartido con el frontend, Swagger ES la única fuente de verdad sobre la forma de la API. Todo endpoint nuevo necesita, sin excepción:
- `@ApiTags(...)` a nivel controller
- `@ApiOperation({ summary: '...' })` por endpoint
- `@ApiBearerAuth()` en los endpoints protegidos, para poder probarlos autenticados desde la UI de Swagger
- `@ApiParam(...)` para parámetros de ruta (ej. `:id`) — el body no hace falta documentarlo aparte, sale solo del DTO Zod
- `@ApiResponse(...)` por cada código de estado real que el endpoint puede devolver (400, 401, 403, 404 si aplican, no solo 200/201) — tiene que coincidir con las excepciones que tira el service (ver Convenciones de código)

## Paginación
Todo endpoint de listado que pueda crecer sin límite soporta `?page=1&limit=10` y devuelve `{ data: [...], meta: { total, page, limit } }`. No hace falta en catálogos chicos y fijos por diseño (ej. tipos de movimiento, roles).

## Testing
- Unit tests de la lógica de negocio en los services: al menos uno por historia de usuario.
- E2E solo para flujos críticos (login, alta de movimiento). No exhaustivo en todo — ajustable si la cátedra pide más cobertura.

## Convenciones de código
- Seguir el ESLint/Prettier ya configurado.
- Nomenclatura: variables y funciones en `camelCase`, clases en `PascalCase`, archivos en `kebab-case`, constantes en `UPPER_SNAKE_CASE`.
- Entidades y conceptos de dominio, en español, calzando con la HU: `Articulo`, `Movimiento`, `Rol`, `AlmacenModule`. Lo genérico y técnico, en inglés: `service`, `controller`, `guard`.
- Mensajes de error: en español, descriptivos.
- Errores: tirar las excepciones propias de Nest (`NotFoundException`, `BadRequestException`, `ConflictException`, etc.) desde el service. El `HttpExceptionFilter` central las atrapa y formatea — nunca try/catch suelto en un controller.
- Comentarios en formato JSDoc en los métodos públicos de los services y en cualquier decisión no obvia. No hace falta en cada función trivial — el nombre y los tipos ya documentan eso.
- Priorizar código simple y legible por sobre soluciones "inteligentes": el objetivo es aprendizaje, escalabilidad y mantenibilidad, no solo que funcione.

## Alcance y ambigüedad
Implementá lo que pide la historia de usuario. No generalices de más ni sumes funcionalidad que no se pidió. Si un pedido es ambiguo sobre QUÉ tiene que hacer algo (ej. "una función para los clientes" sin decir si es listar, buscar por id o crear), preguntá antes de escribir código en vez de asumir.

## Qué NO hacer sin que se te pida explícitamente
- No hacer `commit`, `push`, ni abrir o mergear PRs. Dejá los cambios sin commitear.
- No correr migraciones (`prisma migrate dev/deploy/reset`) ni `db seed`. Está bien proponer el cambio al schema; la persona corre el comando y revisa la migración generada.
- No agregar dependencias nuevas al `package.json` sin avisar primero.
- Antes de tocar más de un módulo o el schema de la base, proponé el plan y esperá confirmación.
