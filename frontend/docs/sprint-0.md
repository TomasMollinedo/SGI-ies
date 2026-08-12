# Sprint 0 — Preparación técnica del Frontend

**Proyecto:** SGI IES Constructora
**Período:** 2026-08-12 — 2026-08-12
**Estado:** Cerrado

## 1. Objetivo

Dejar el frontend listo para que el Sprint 1 comience directamente con historias de usuario, sin tiempo perdido en configuración.

## 2. Alcance

### Hecho en este Sprint 0

- [x] Proyecto React + Vite + TypeScript dentro de `frontend/`
- [x] TailwindCSS v4 con tokens semánticos provisorios
- [x] Dependencias base instaladas (ver `docs/tecnologias.md`)
- [x] Estructura de carpetas por features
- [x] Routing centralizado con páginas placeholder
- [x] Layout base (sidebar, header, contenido)
- [x] Oxlint, Prettier, TypeScript y convenciones

### Explícitamente pospuesto (no es un olvido, es una decisión)

- **Comunicación con backend** (`.env`, cliente HTTP, tipos de request/response): se pospuso porque todavía no existe el contrato de API del backend. Es la primera tarea técnica a resolver apenas el backend tenga su primer endpoint.
- **Componentes reutilizables** (`FormParametrico`, `TablaConFiltros`, `ModalConfirmacion`): se pospusieron para extraerlos de casos reales (regla de tres) en vez de abstraer sin datos. Disparador: al terminar el tercer ABM simple del Sprint 1.
- **Identidad visual definitiva**: los tokens de `theme.css` son provisorios hasta que se defina la paleta e identidad del sistema.
- **Sub-rutas por HU dentro de cada módulo** (ej. `/almacen/marcas`, `/almacen/articulos`): el router solo tiene la ruta raíz de cada módulo (`/almacen`, `/compras`, etc.). Las rutas específicas de cada pantalla se agregan a medida que se planifican, no todas de entrada.

## 3. Stack y versiones

| Paquete               | Versión |
| --------------------- | ------- |
| react                 | 19.2.8  |
| react-dom             | 19.2.8  |
| vite                  | 8.2.1   |
| typescript            | 6.0.3   |
| tailwindcss           | 4.3.3   |
| @tailwindcss/vite     | 4.3.3   |
| react-router          | 8.3.0   |
| axios                 | 1.19.0  |
| react-hook-form       | 7.85.0  |
| zod                   | 4.4.3   |
| @tanstack/react-query | 5.101.4 |
| clsx                  | 2.1.1   |
| tailwind-merge        | 3.6.0   |
| lucide-react          | 1.31.0  |
| date-fns              | 4.4.0   |
| prettier              | 3.9.6   |
| oxlint                | 1.78.0  |

Detalle de para qué sirve cada uno en `docs/tecnologias.md`.

## 4. Estructura de carpetas

```
src/
├── app/
│   ├── App.tsx
│   └── router/
│       ├── index.tsx
│       └── paths.ts
├── features/
│   ├── sistema/
│   ├── almacen/
│   ├── compras/
│   ├── tesoreria/
│   ├── proyectos/
│   └── comercial/
├── shared/
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── layouts/
│   ├── MainLayout.tsx
│   └── components/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── NotFoundPage.tsx
│   └── PlaceholderPage.tsx
├── styles/
│   ├── index.css
│   └── theme.css
└── main.tsx
```

Las carpetas de `features/` y `shared/*` están vacías (solo `.gitkeep`) a la espera de contenido real en Sprint 1.

## 5. Decisiones técnicas

### Tokens semánticos en lugar de colores literales de Tailwind

- **Decisión:** los componentes usan `bg-primary`, `text-content`, etc. definidos en `theme.css`.
- **Por qué:** la identidad visual no está definida; esto permite cambiarla editando un solo archivo.
- **Revisar:** cuando se entregue la paleta definitiva.

### Arquitectura por features

- **Decisión:** `src/features/<modulo>` en vez de carpetas por tipo (`components/`, `hooks/`, etc.).
- **Por qué:** el backlog ya está organizado por módulos y el equipo es de 6 personas trabajando en
  paralelo; features minimiza conflictos de merge y espeja el dominio.
- **Regla de promoción:** un archivo se mueve a `shared/` solo cuando lo usa un segundo módulo.

### Dependencias de Sprint 1 instaladas de entrada

- **Decisión:** se instalaron ahora `react-hook-form`, `zod`, `@tanstack/react-query`, `clsx`, `tailwind-merge`, `lucide-react` y `date-fns`
- **Por qué:** el Sprint 1 arranca inmediatamente después de este Sprint 0; el equipo decidió no fragmentar la instalación entre ambos sprints.
- **Nota:** `@tanstack/react-query` no tiene todavía ningún `QueryClientProvider` configurado — se configura junto con el cliente HTTP, cuando exista el contrato de backend.

### Oxlint en vez de ESLint

- **Decisión:** se mantuvo Oxlint (el linter que trae el template actual de `create-vite`) en vez de forzar el setup clásico de ESLint + `typescript-eslint`
- **Por qué:** Oxlint ya viene configurado y funcionando con el template; forzar ESLint hubiera sido desinstalar algo que funciona para instalar un equivalente. No hay conflicto con Prettier porque Oxlint no reformatea código.

### Router solo con rutas raíz por módulo

- **Decisión:** `paths.ts` y `router/index.tsx` solo definen la ruta raíz de cada módulo
  (`/almacen`, `/compras`, etc.), no una por cada HU planificada.
- **Por qué:** listar de entrada todas las sub-rutas de HUs que todavía no se planificaron en detalle anticipa estructura que puede no coincidir con cómo terminen diseñándose las pantallas.
- **Regla:** las sub-rutas se agregan cuando la pantalla correspondiente se planifica, no antes.
