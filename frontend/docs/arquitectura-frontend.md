# Arquitectura Frontend — Mapa General

> Diagrama complementario: [`arquitectura-frontend-mapa general.excalidraw`](./arquitectura-frontend-mapa%20general.excalidraw) (abrir en [excalidraw.com](https://excalidraw.com) → _Open_ → seleccionar el archivo, o con la extensión de Excalidraw en VS Code). Sigue el mismo flujo que este documento.
>
> Este documento da una idea general de cómo se arma el frontend. Para el detalle técnico de autenticación (doble token, refresh automático, logout, diagrama paso a paso) ver [`arquitectura-auth.md`](./arquitectura-auth.md).

## 1. Idea general

Para entender el frontend conviene separarlo en dos preguntas:

1. **¿Cómo arranca React y decide qué página mostrar?**
2. **¿Cómo una página pide o envía datos al backend?**

El recorrido general es:

```text
index.html
   ↓
main.tsx
   ↓
QueryProvider
   ↓
App.tsx
   ↓
RouterProvider
   ↓
router/index.tsx
   ↓
ProtectedRoute (si la ruta es privada)
   ↓
MainLayout
   ↓
Página del sistema
```

`paths.ts` no es un paso del renderizado. Es un archivo auxiliar que centraliza las URLs y es utilizado por el router, botones, links y redirecciones.

---

## 2. Cómo arranca y renderiza React

### `index.html`

Es el HTML base que carga el navegador. Contiene el elemento donde React monta toda la aplicación, normalmente:

```html
<div id="root"></div>
```

Por sí solo no contiene las pantallas del ERP.

### `main.tsx`

Es el **punto de entrada del frontend**. Busca el `root` del HTML y comienza a renderizar React.

También coloca los providers globales que necesita toda la aplicación.

```text
index.html
   ↓
main.tsx
   ↓
<QueryProvider>
   <App />
</QueryProvider>
```

### `app/providers/QueryProvider.tsx`

Habilita **TanStack React Query** para toda la aplicación.

Su función principal es permitir que los componentes y hooks manejen consultas al backend, cache, estados de carga y errores sin repetir esa lógica en cada pantalla.

No decide qué página mostrar y no realiza autenticación por sí solo.

### `App.tsx`

Es el componente raíz de React.

Su responsabilidad principal es iniciar el sistema de navegación mediante `RouterProvider`.

```text
App.tsx
   ↓
RouterProvider
```

### `app/router/index.tsx`

Define la relación entre las **URLs** y las **pantallas** del sistema.

Conceptualmente:

```text
/login                 → LoginPage
/almacen/articulos     → ArticulosPage
/almacen/stock         → StockPage
```

También define qué partes del sistema son públicas y cuáles deben pasar por `ProtectedRoute`.

### `app/router/paths.ts`

Es la fuente central de las URLs internas.

En lugar de repetir strings como:

```ts
navigate('/almacen/articulos')
```

el sistema puede usar una constante definida en `paths.ts`.

Su función es evitar URLs duplicadas o escritas de manera diferente en distintos archivos.

> `paths.ts` **no renderiza, no autentica y no redirige por sí mismo**. Solo contiene las rutas que otros archivos utilizan.

### `app/router/ProtectedRoute.tsx`

Es el **control de acceso de las rutas privadas**.

Antes de mostrar una pantalla del ERP comprueba si existe un usuario autenticado mediante `useAuthUser()`.

```text
ProtectedRoute
      ↓
¿hay usuario autenticado?
    /          \
  no            sí
  ↓              ↓
/login      continúa al sistema
```

El detalle de cómo `useAuthUser()` sabe si hay sesión (tokens, refresh, etc.) está en [`arquitectura-auth.md`](./arquitectura-auth.md).

### `layouts/MainLayout.tsx`

Es la estructura visual compartida por las páginas internas del ERP.

Por ejemplo, mantiene elementos como el sidebar y deja un espacio para que React Router renderice la página correspondiente a la URL actual.

```text
MainLayout
├── Sidebar
├── menú / usuario
└── contenido de la página actual
```

---

## 3. Cómo una página se comunica con el backend

La mayoría de las funcionalidades siguen el mismo recorrido:

```text
Página
  ↓
Hook
  ↓
Service
  ↓
httpClient
  ↓
Backend
```

Por ejemplo, conceptualmente:

```text
ArticulosPage
   ↓
useArticulos()
   ↓
articulos.service.ts
   ↓
httpClient.ts
   ↓
Backend
```

### Página

Muestra la interfaz y responde a las acciones del usuario.

### Hook

Coordina lo que necesita la pantalla: cargar datos, ejecutar una acción, manejar loading/error y actualizar la cache de React Query.

### Service

Define las llamadas concretas de una funcionalidad al backend.

Ejemplos:

```text
auth.service.ts       → /auth/*
articulos.service.ts  → endpoints de artículos
stock.service.ts      → endpoints de stock
```

### `shared/api/httpClient.ts`

Es la **puerta común del frontend hacia el backend**.

La idea importante no es memorizar cómo está programado Axios, sino saber que centraliza comportamientos que no conviene repetir en cada service.

Entre ellos:

- usa la URL base del backend;
- envía cookies cuando corresponde;
- agrega el `accessToken` a requests protegidos;
- detecta un `401`;
- intenta renovar la sesión;
- normaliza errores antes de entregarlos a los hooks o componentes.

---

## 4. Dónde entra la autenticación

AUTH utiliza exactamente la misma arquitectura general de la sección 3 — no es un mecanismo aparte:

```text
LoginPage
   ↓
useLogin()
   ↓
auth.service.ts
   ↓
httpClient.ts
   ↓
Backend: AuthController
```

Lo particular de AUTH (esquema de doble token, renovación automática con `401`, logout, qué pasa al recargar la página) está documentado con su propio diagrama en [`arquitectura-auth.md`](./arquitectura-auth.md) — no se repite acá para no tener dos fuentes de verdad.

---

## 5. Referencia rápida de archivos

| Archivo                           | Responsabilidad principal                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| `index.html`                       | Contenedor HTML donde React monta la aplicación                 |
| `main.tsx`                         | Punto de entrada de React                                       |
| `app/providers/QueryProvider.tsx`  | Habilita React Query globalmente                                 |
| `App.tsx`                          | Componente raíz; inicia el router                                |
| `app/router/index.tsx`             | Relaciona URLs con páginas y organiza rutas públicas/privadas    |
| `app/router/paths.ts`              | Centraliza las URLs internas                                     |
| `app/router/ProtectedRoute.tsx`    | Controla el acceso a rutas privadas                              |
| `layouts/MainLayout.tsx`           | Estructura visual común del sistema                              |
| `shared/api/httpClient.ts`         | Cliente HTTP central; token, refresh, reintentos y errores       |

---

## 6. Forma corta de explicar toda la arquitectura

> El navegador carga `index.html` y `main.tsx` monta React. `QueryProvider` habilita React Query y `App.tsx` inicia el router. `router/index.tsx` decide qué página corresponde a la URL y, si la ruta es privada, pasa primero por `ProtectedRoute`. Las páginas hablan con el backend mediante hooks, services y un `httpClient` común — AUTH sigue exactamente ese mismo patrón, con su propio detalle técnico documentado aparte.

Ese es el nivel de arquitectura que conviene poder explicar: **qué responsabilidad tiene cada archivo, quién llama a quién y qué ocurre a continuación**, sin necesidad de memorizar la implementación interna de Axios, React Query o JWT.
