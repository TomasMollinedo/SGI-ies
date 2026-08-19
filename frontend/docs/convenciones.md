# Convenciones del proyecto — Frontend SGI

| Elemento            | Convención                                         | Ejemplo                                         |
| ------------------- | -------------------------------------------------- | ----------------------------------------------- |
| Carpetas            | `kebab-case`, en español                           | `features/almacen/`, `shared/components/`       |
| Componentes         | `PascalCase`, `.tsx`                               | `MarcaForm.tsx` → `export function MarcaForm()` |
| Páginas             | `PascalCase` + sufijo `Page`                       | `MarcasPage.tsx`                                |
| Hooks               | `camelCase` con prefijo `use`                      | `useMarcas.ts`                                  |
| Services            | `<entidad>.service.ts`                             | `marcas.service.ts`                             |
| Types               | `<entidad>.types.ts`; interfaces en `PascalCase`   | `marca.types.ts` → `interface Marca`            |
| Utilidades          | `camelCase`, `.ts`                                 | `formatearFecha.ts`                             |
| Constantes          | `SCREAMING_SNAKE_CASE`                             | `PATHS`                                         |
| Variables/funciones | `camelCase`, en español                            | `listarMarcas`, `marcaSeleccionada`             |
| Booleanos           | prefijo `es`/`tiene`/`puede`                       | `esActivo`, `tieneStock`                        |
| Exports             | Nombrados, no `default` (salvo que React lo exija) | `export function Sidebar()`                     |
| Imports internos    | Siempre con alias `@/`, nunca `../../`             | `import { PATHS } from '@/app/router/paths'`    |

**Regla de `any`:** prohibido. Si no se sabe el tipo, usar `unknown` y estrechar.

**Idioma:** el dominio (nombres de negocio) va en español porque el backlog, el PO y la cátedra hablan en español. Las APIs técnicas de React/librerías quedan en inglés (`useState`, `onClick`). No mezclar dentro de un mismo identificador (`getMarcas` NO → `listarMarcas` SI).

**Orden interno de un archivo de componente:** imports → tipos/props → componente → helpers locales.

**Linting y formateo:** el template de Vite trae **Oxlint** en vez de ESLint; se mantuvo así (ver
`docs/tecnologias.md`). Oxlint corre el lint (`npm run lint`) y Prettier corre el formateo
(`npm run format` / `npm run format:check`) — no hay conflicto de reglas porque Oxlint no reformatea código, solo señala/corrige problemas de correctitud.
