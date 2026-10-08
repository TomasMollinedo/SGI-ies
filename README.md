# SGI-IES

Sistema de gestión para una constructora (proyecto de la materia Sistemas III).

Este repo tiene dos partes: `backend` (API NestJS) y `frontend` (React + Vite).

## Requisitos

- Node.js (18 o superior)
- Docker Desktop (para la base de datos y el almacenamiento de imágenes)

## Levantar el entorno de desarrollo

### 1. Infraestructura (Docker)

Desde la raíz del repo:

```bash
docker compose up -d
```

Esto levanta:

- **postgres**: la base de datos, en `localhost:5434`.
- **minio**: el servidor de almacenamiento de imágenes, en `localhost:9000` (API) y `localhost:9001` (consola web, usuario/contraseña en `docker-compose.yml`).
- **minio-init**: corre una sola vez y crea el bucket `ies-imagenes` con lectura pública y el bucket privado `ies-comprobantes` (comprobantes de pago). No hace falta crear nada a mano en MinIO.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

Completar en `.env` los secretos (`JWT_SECRET`, `JWT_REFRESH_SECRET`); el resto de los valores por defecto ya coinciden con lo que levanta `docker-compose.yml`.

La API queda en `http://localhost:3000/api`, y el Swagger (documentación interactiva de todos los endpoints) en esa misma URL.

#### Datos de prueba (opcional)

`npx prisma db seed` corre `prisma/seed.ts`, que deja lo mínimo para usar el sistema: roles, usuarios de prueba (`gerente@axontech.test`, `admin@axontech.test`, etc.) y formas de pago (desde Prisma 7, `migrate dev` ya no lo corre solo). Para tener además datos de Comercialización y del portal del cliente, con Docker levantado:

```bash
npx prisma db seed
npm run seed:cuenta-corriente-prueba
npm run seed:comercializacion   # proyectos, unidades, publicaciones, ventas, cobros y declaraciones
npm run seed:t112-cliente1      # un cliente para entrar al portal (ver SEED_CLIENTE_EMAIL en .env)
```

Se pueden correr las veces que haga falta: no duplican datos. Las fechas son relativas al día en que se corren (las cuotas vencidas siguen vencidas) y los comprobantes de las declaraciones se suben al bucket `ies-comprobantes`, así que MinIO tiene que estar levantado. `npm run seed:muestra -- --reset` borra los proyectos: no combinarlo con estos seeds.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Queda en `http://localhost:5173`.

## Reiniciar todo desde cero

Si en algún momento hace falta borrar los datos y arrancar de nuevo (`docker compose down -v` para borrar los volúmenes de Docker), alcanza con repetir los pasos de arriba: `docker compose up -d` y `npx prisma migrate dev` dejan la base de datos y el bucket de imágenes listos otra vez, sin ningún paso manual adicional.
