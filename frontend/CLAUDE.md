# CLAUDE.md

## Rol

Actuá como un **desarrollador frontend senior**. Priorizá soluciones simples, mantenibles y consistentes con el código existente.

Trabajá únicamente dentro de `frontend/`. No modifiques `backend/`.

## Al implementar una HU

Antes de programar:

- Revisá la estructura, componentes y utilidades existentes relacionados.
- Reutilizá componentes, hooks, primitives y utilidades cuando tenga sentido.
- Si una pieza nueva es claramente reutilizable, separala en un componente o primitive apropiado.
- Evitá duplicación, pero también abstracciones prematuras o infraestructura para necesidades futuras.
- No inventes endpoints, contratos, modelos ni comportamiento que la HU no requiera.

Priorizá resolver bien la HU actual y dejar el código fácil de mantener y extender.

## Arquitectura

El código de negocio vive principalmente en:

`src/features/<modulo>/`

Mantené el código dentro de su feature salvo que realmente sea compartido; en ese caso puede ir a `src/shared/`.

Usá imports internos con `@/`.

Las rutas se definen en `src/app/router/paths.ts`. No escribas URLs internas directamente en componentes.

## UI

Antes de crear un componente nuevo, verificá si existe uno reutilizable.

Preferí componentes pequeños y enfocados. Si un componente crece demasiado o mezcla responsabilidades, separalo cuando la división sea natural.

Usá TailwindCSS con los tokens semánticos definidos en `src/styles/theme.css`. Evitá colores literales o hexadecimales en componentes.

## Criterios del proyecto

Seguí las convenciones y tecnologías ya definidas en:

- `docs/convenciones.md`
- `docs/tecnologias.md`

No cambies decisiones existentes salvo que la HU realmente lo necesite.

## Validación

Antes de terminar:

```bash
npm run build
npm run lint
npm run format:check
```

Corregí cualquier problema producido por tus cambios.

## Qué NO hacer sin que se te pida explícitamente

- No hacer `commit`, `push`, ni abrir o mergear PRs. Dejá los cambios sin commitear.
- No agregar ni cambiar dependencias en `package.json` sin avisar primero, aunque la HU lo necesite.
- Antes de tocar `src/shared/`, proponé el plan y esperá confirmación.
