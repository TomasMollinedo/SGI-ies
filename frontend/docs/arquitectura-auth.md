# Arquitectura de Autenticación — Frontend

> Diagrama complementario: [`arquitectura-auth.excalidraw`](./arquitectura-auth.excalidraw) (abrir en [excalidraw.com](https://excalidraw.com) → _Open_ → seleccionar el archivo, o con la extensión de Excalidraw en VS Code). Sigue el mismo flujo numerado que este documento.
>
> Para el mapa general de cómo se arma el frontend (fuera de AUTH) ver [`arquitectura-frontend.md`](./arquitectura-frontend.md).

## El esquema: doble token

El backend (`AuthController`, `@Controller('auth')` bajo el prefijo global `/api`) usa doble token:

| Token          | Vida                       | Dónde viaja                                                                        | Dónde vive en el frontend                                                                          |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `accessToken`  | corta (15 min por defecto) | body de la respuesta, luego header `Authorization: Bearer <token>` en cada request | variable en memoria de JS (`shared/api/httpClient.ts`) — **nunca** `localStorage`/`sessionStorage` |
| `refreshToken` | larga (7 días por defecto) | cookie `httpOnly` que setea el backend                                             | el navegador la guarda y reenvía solo — el JS de esta app **nunca** la lee ni la escribe           |

Guardar el `accessToken` en memoria (no en storage persistente) y el `refreshToken` en una cookie `httpOnly` es la mitigación contra robo por XSS: aunque un script malicioso corra en la página, no tiene forma de leer la cookie, y el `accessToken` desaparece solo con recargar.

## Piezas involucradas

```
LoginPage (UI)
   ↓
useLogin / useLogout / useAuthUser   (features/auth/hooks)
   ↓
auth.service.ts                       (features/auth/services) → login · refresh · logout · me
   ↓
httpClient.ts                         (shared/api) → instancia axios + interceptores
   ↓
Backend: AuthController → /api/auth/*
```

- **TanStack React Query** (`app/providers/QueryProvider.tsx`) es la capa de cache: guarda la respuesta de `GET /auth/me` bajo la key `['auth','me']`, con `staleTime`/`gcTime: Infinity` (no se revalida sola — solo cambia por login, logout, o un refresh fallido).
- **`ProtectedRoute`** (`app/router/ProtectedRoute.tsx`) lee `useAuthUser()`: si no hay usuario, redirige a `/login`; si lo hay, deja pasar.
- El **logout** vive en el bloque de usuario abajo del sidebar (`layouts/components/Sidebar.tsx`, componente `UserMenu`): clic ahí abre un menú con "Salir".

## El flujo, paso a paso (ver diagrama, mismos números)

1. **Login** — `LoginPage` llama `useLogin()` → `POST /auth/login { email, password }` con `withCredentials: true` (necesario para que el navegador acepte la cookie que va a llegar).
2. El backend valida las credenciales y responde `200` con `{ accessToken, usuario }` en el body, y setea la cookie `refreshToken` (`httpOnly`) en la respuesta.
3. El frontend guarda el `accessToken` en memoria (`setAccessToken`) y precarga `['auth','me']` con `usuario` — evita un round-trip extra a `/auth/me` justo después de loguearse.
4. A partir de acá, **todo request protegido** lleva `Authorization: Bearer <accessToken>` — lo agrega solo el interceptor de request de `httpClient`, ningún código de feature lo hace a mano.
5. Cuando el `accessToken` vence, el backend responde `401`.
6. El interceptor de response de `httpClient` lo detecta y dispara el refresh **una sola vez**, aunque haya varios requests en `401` al mismo tiempo (se encolan y esperan el mismo refresh — evita mandar N refreshes en paralelo).
7. `POST /auth/refresh` — la cookie viaja sola, sin que ningún código JS la toque. El backend valida el `refreshToken` contra el hash guardado (`USUARIO.refreshTokenHash`, bcrypt — sesión única por usuario, sin blacklist ni tabla de sesiones por dispositivo), rota la cookie y devuelve un `accessToken` nuevo. El request original se reintenta solo: la pantalla que lo disparó nunca se entera de que hubo un 401 en el medio.
8. Si el refresh **también** falla (cookie vencida o inválida de verdad): se limpia la sesión — `accessToken` en memoria y `['auth','me']` en cache — y `ProtectedRoute` redirige a `/login` en el próximo render.
9. **Logout manual**: clic en el usuario → "Salir" → `POST /auth/logout` → se limpia todo igual que en el punto 8 → `/login`. Esto pasa en `onSettled` (no `onSuccess`): el logout del lado del cliente tiene que pasar sí o sí, incluso si la llamada al backend falla (ej. el token ya había vencido).

**Al recargar la página (F5):** el `accessToken` en memoria se pierde (era una variable de JS), pero la cookie `refreshToken` sigue viva. El primer request protegido que se dispare (típicamente `useAuthUser` al montar `ProtectedRoute`) va a dar `401` y automáticamente repite los pasos 6-7 — la sesión se reconstruye sola, sin pedirle el login de nuevo al usuario.

## Errores tipados

Todo error de `httpClient` (incluida una respuesta `401` que agota el refresh) se normaliza a `ApiErrorResponse` (`shared/types/api.types.ts`) antes de llegar a un hook o componente — nadie fuera de `httpClient.ts` maneja un error crudo de axios.
