# TenantTracker — Project Guidelines

## Project Structure

Monorepo with two top-level folders:

- **`TenantTracker/src2/`** — Backend API (Express + MongoDB + Mongoose)
- **`TenantTracker-Web/src2/`** — Frontend SPA (React + Redux Toolkit + Vite + Tailwind v4/DaisyUI)

> Legacy code lives in `TenantTracker/src/` and `TenantTracker-Web/src/`. Active development targets `src2/` in both.

## Build and Test

### Backend (`TenantTracker/src2/`)
```bash
cd TenantTracker/src2 && npm install
npm run dev          # nodemon dev server (port 5001)
npm start            # production
npm test             # Jest
npm run lint         # ESLint
npm run seed         # seed database
```
Requires: Node ≥16, MongoDB running locally. Config via `.env` — see `src2/README.md`.

### Frontend (`TenantTracker-Web/`)
```bash
cd TenantTracker-Web && npm install
npm run dev:src2     # Vite dev server (port 5173, config: vite-src2.config.js)
npm run build:src2   # production build → dist-src2/
npm run lint         # ESLint
```

Run backend and frontend side-by-side during development.

## Architecture

### Backend
- **Entry**: `src2/app.js` — Express app with Helmet, CORS (credentials: true), compression, rate limiting (production only)
- **Routes**: `src2/routes/index.js` mounts all route modules under `/`
- **Pattern**: Routes → Controllers → Models/Services → Response utils
- **Validation**: Joi schemas in `src2/validators/index.js`, applied via `src2/middleware/validation.js`
- **Error handling**: Global `src2/middleware/errorHandler.js` catches Mongoose, JWT, and MongoDB errors
- **Logging**: Winston (`src2/utils/logger.js`) + Morgan for HTTP logs

### Frontend
- **Entry**: `src2/main.jsx` — Redux Provider + BrowserRouter
- **Routing**: `src2/App.jsx` — public & protected routes via `ProtectedRoute` wrapper
- **State**: Redux Toolkit slices in `src2/store/slices/` (auth, user, ui, tenant, property, bill)
- **API layer**: Axios client at `src2/services/apiClient.js` with automatic 401 → silent token refresh
- **Auth hook**: `src2/hooks/useAuth.js` exposes login/register/logout

### Authentication
- **Dual JWT support**: RS256 (OAuth2/OIDC) and HS256 (legacy). Middleware auto-detects via JWT `alg` header.
- **Access tokens**: In-memory only (never localStorage) — managed by `src2/services/tokenManager.js`
- **Refresh tokens**: httpOnly Secure SameSite=Strict cookies with family-based rotation and replay detection
- **OAuth 2.0**: Authorization Code + PKCE (S256) for Google/GitHub. Config in `src2/config/oauth.js` (frontend) and `src2/services/oauthProviderService.js` (backend)
- **Proactive refresh**: Tokens refreshed ~1 min before expiry; requests queue during refresh

### API Response Format
All backend endpoints return:
```json
{ "success": true, "message": "...", "data": {}, "pagination": {} }
```

## Conventions

### File Naming
- **Backend**: camelCase — `authController.js`, `tokenService.js`, `errorHandler.js`
- **Frontend components/pages**: PascalCase JSX — `LoginPage.jsx`, `ProtectedRoute.jsx`, `AppLayout.jsx`
- **Frontend services/utils/config**: camelCase JS — `apiClient.js`, `tokenManager.js`, `authSlice.js`

### Code Patterns
- Always `async/await` with try/catch; never raw `.then()` chains
- Backend responses use helpers from `src2/utils/response.js` — never manual `res.json()`
- Frontend API calls go through `src2/services/apiClient.js` — never raw `axios` or `fetch`
- Form validation: Joi on backend, component-level on frontend
- Toast notifications via `react-hot-toast` — no `alert()` or `window.confirm()`

### Security (Non-negotiable)
- Never store tokens in localStorage or sessionStorage — access tokens stay in memory
- Always use `withCredentials: true` for Axios requests
- Validate all inputs server-side with Joi even if validated client-side
- Use parameterized Mongoose queries — never string-concatenate user input into queries
- PKCE required for all OAuth flows

## Common Pitfalls

- **CORS / API URL**: Dev frontend hits `http://localhost:5001` (not 3000). Check `src2/config/api.js` when debugging connection issues.
- **Rate limiting off in dev**: `app.js` only enables rate limiter in production — don't rely on it during testing.
- **Token refresh endpoint**: `/auth/token/refresh` uses httpOnly cookie only — no Bearer token required or expected.
- **Redux persistence**: User data persists in localStorage, but actual auth is validated on init via `GET /auth/profile` with the httpOnly cookie.
- **Dual user roles**: User model has `role` field (owner/tenant/admin). API authorization checks role after authentication.
