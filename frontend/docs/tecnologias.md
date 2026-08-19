# Tecnologías y dependencias — Frontend SGI

## Stack base

| Tecnología  | Versión | Rol                                      |
| ----------- | ------- | ---------------------------------------- |
| React       | 19.2.8  | Librería de UI                           |
| Vite        | 8.2.1   | Build tool y dev server                  |
| TypeScript  | 6.0.3   | Tipado estático                          |
| TailwindCSS | 4.3.3   | Estilos (v4, config en CSS con `@theme`) |

## Dependencias de producción instaladas

| Paquete                 | Versión | Para qué sirve                                     | Por qué se instala en Sprint 0                                                |
| ----------------------- | ------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `react-router`          | 8.3.0   | Enrutamiento del SPA                               | El routing centralizado es entregable de Sprint 0                             |
| `axios`                 | 1.19.0  | Cliente HTTP                                       | Se usará al preparar la comunicación con backend (pospuesto, ver sprint-0.md) |
| `react-hook-form`       | 7.85.0  | Manejo de formularios (estado, validación)         | Base de casi todas las HU (ABMs paramétricos)                                 |
| `zod`                   | 4.4.3   | Validación de esquemas + inferencia de tipos       | Se usa junto a react-hook-form y para validar respuestas de API               |
| `@tanstack/react-query` | 5.101.4 | Cache y estados de carga de datos del servidor     | Se usará apenas exista el primer endpoint real                                |
| `clsx`                  | 2.1.1   | Composición condicional de clases CSS              | Necesario para componentes con variantes (ej. botones)                        |
| `tailwind-merge`        | 3.6.0   | Resolver conflictos de clases Tailwind al combinar | Complementa a `clsx` en componentes reutilizables                             |
| `lucide-react`          | 1.31.0  | Íconos                                             | Uso en sidebar/acciones de tablas                                             |
| `date-fns`              | 4.4.0   | Formateo y manejo de fechas                        | Varias HU muestran fechas (movimientos, vencimientos, cronogramas)            |

## Dependencias de desarrollo instaladas

| Paquete    | Versión | Para qué sirve                                          |
| ---------- | ------- | ------------------------------------------------------- |
| `prettier` | 3.9.6   | Formateo automático de código                           |
| `oxlint`   | 1.78.0  | Linting (viene con el template de Vite; ver nota abajo) |

> **Nota sobre linting:** el template actual de `create-vite` para `react-ts` trae **Oxlint** en vez de ESLint/`typescript-eslint`. Se decidió mantener Oxlint en vez de forzar el setup clásico de ESLint. `eslint-config-prettier` no se instaló porque no aplica sin ESLint; la integración Prettier + Oxlint se resuelve en la Etapa 8 (Oxlint no reformatea código, así que no hay conflicto de reglas que resolver).
