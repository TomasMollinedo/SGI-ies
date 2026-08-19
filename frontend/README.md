# SGI IES Constructora — Frontend

Sistema de gestión integral (SGI) de IES Constructora: proyectos, compras, almacén, tesorería y comercial.

## Stack

| Tecnología            | Versión |
| --------------------- | ------- |
| React                 | 19.2.8  |
| Vite                  | 8.2.1   |
| TypeScript            | 6.0.3   |
| TailwindCSS           | 4.3.3   |
| React Router          | 8.3.0   |
| Axios                 | 1.19.0  |
| @tanstack/react-query | 5.101.4 |
| React Hook Form       | 7.85.0  |
| Zod                   | 4.4.3   |

Detalle completo de dependencias (para qué sirve cada una y por qué se instaló) en
[`docs/tecnologias.md`](./docs/tecnologias.md).

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0` (requerido por Vite 8; Node 21.x no es compatible)
- npm ≥ 10 (viene incluido con las versiones de Node de arriba)

## Instalación y ejecución

```bash
npm install
npm run dev
```

## Scripts disponibles

| Script                 | Qué hace                                               |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Levanta el servidor de desarrollo (Vite)               |
| `npm run build`        | Type-checks (`tsc -b`) y genera el build de producción |
| `npm run preview`      | Sirve localmente el build de producción                |
| `npm run lint`         | Corre Oxlint                                           |
| `npm run format`       | Formatea todo el código con Prettier                   |
| `npm run format:check` | Verifica el formateo sin modificar archivos            |

## Estructura del proyecto

```
src/
├── app/
│   └── router/        # Configuración de rutas (paths.ts, index.tsx)
├── features/           # Módulos de negocio: sistema, almacen, compras, tesoreria, proyectos, comercial
├── shared/              # Código compartido entre 2+ features (api, components, hooks, types, utils)
├── layouts/              # Layout base de la app (MainLayout, Sidebar, Header)
├── pages/                 # Páginas de nivel superior (HomePage, NotFoundPage, PlaceholderPage)
├── styles/                 # Tailwind + tokens semánticos (theme.css, index.css)
└── main.tsx                 # Entry point
```

Un archivo nace dentro de su feature y solo se promueve a `shared/` cuando lo necesita un segundo
módulo — nunca antes.

Convenciones de nombres, carpetas e idioma en [`docs/convenciones.md`](./docs/convenciones.md).

## Estado del proyecto

Sprint 0 completado. El frontend levanta con placeholders; no hay funcionalidad de negocio ni
comunicación con backend implementada todavía. Detalle completo en
[`docs/sprint-0.md`](./docs/sprint-0.md).
