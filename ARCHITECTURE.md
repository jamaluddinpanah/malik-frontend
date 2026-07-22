# Malik Next.js architecture

## Phase 0 baseline

- **Framework:** Next.js 16.2.10 with the App Router. There is no `pages/` directory.
- **Styling:** CSS Modules plus global CSS custom properties in `src/app/globals.css`; Tailwind is not installed or configured.
- **Client state:** React context (`AuthProvider`) and local React state. No Redux, Zustand, React Query, or similar state library is installed.
- **Forms:** native React form handling and `FormData`; no form library is installed.
- **Tests:** no automated frontend test runner is configured. The repository has lint, TypeScript, and production-build checks.
- **Localization:** `next-intl`, with `en`, `fa` (Dari), and `ps` (Pashto). `src/i18n/config.ts` is the locale registry, while `messages/<locale>/common.json` stores messages. Middleware canonicalizes URLs to locale-prefixed routes and the root layout applies the corresponding `lang` and `dir` values.
- **Authentication:** cookie-based Laravel Sanctum. No authentication token is stored in browser storage.

## Routing

`src/app` is the only route root. Existing locale-prefixed pages live under `src/app/[locale]`, with unprefixed compatibility entries currently kept in place. `account` and `admin` are already sectioned beneath the locale segment. Future public and auth routes should use route groups such as `src/app/[locale]/(public)` and `src/app/[locale]/(auth)` only when moving a route does not alter its public URL.

Page files should compose feature components and remain small. Server Components are the default. Use a Client Component only for browser APIs, event handlers, or interactive form state.

## Source layout

```
src/
  app/[locale]/          locale-aware App Router entrypoints
  components/            design-system and cross-feature presentation
    ui/                  primitive controls when introduced
    layout/              reusable chrome when migrated
    feedback/            loading, empty, error, and forbidden states
    shared/              non-business-specific components
  features/              bounded feature modules (auth, profiles, catalog,
                         listings, search, favorites, messaging,
                         notifications, payments, admin)
  hooks/                 reusable client hooks
  lib/
    api/                 single Laravel HTTP client and API contracts
    formatting/          locale-aware formatting helpers
    i18n/                future public i18n helpers; current registry remains
                         in src/i18n for next-intl compatibility
    auth/, validation/, utilities/  shared helpers as needed
  providers/             application-wide React providers as they are split out
  types/                 transport-neutral shared TypeScript types
```

The existing `application`, `domain`, `infrastructure`, and `presentation` modules remain intact in Phase 0 to avoid changing working pages. New cross-cutting code belongs in the layout above. Legacy API imports re-export the centralized client so migration can be incremental rather than disruptive.

## API boundary

`src/lib/api/api-client.ts` is the sole implementation for browser-to-Laravel HTTP. It always sends `credentials: "include"`, applies the active locale to `Accept-Language` and `X-Malik-Locale`, supports JSON, `FormData`, and `AbortSignal`, and normalizes Laravel/network errors into `ApiError`.

## Sanctum authentication

The browser uses Laravel's HTTP-only Sanctum session cookie and `GET /sanctum/csrf-cookie` before state-changing authentication requests. `AuthService` is the typed UI boundary for `/api/v1/auth/*`; tokens are never persisted in local or session storage. The Laravel session cookie belongs to the API origin, so server components cannot reliably inspect it from Next.js. Account protection therefore performs its authenticated session check in `ProtectedRoute` after hydration.

Registration and profile fields follow the current Laravel validators. Laravel currently does not validate or persist `profile.last_name` and `profile.organization_type` at registration, and profile updates only accept `display_name`/`slug`; the UI collects organization type as required by the product brief but does not claim it is persisted until the backend contract is extended.

Use `ApiResponse<T>` for Laravel's `{ data, message? }` envelope. Use `LaravelPagination<T>` for direct paginator responses and `PaginatedApiResponse<T>` for endpoints that wrap a paginator in `data`. API routes live in `src/lib/routes.ts`; only add a route after confirming it in Laravel.

`src/app/api/listings/route.ts` is a pre-existing local prototype route used by the current post-ad demonstration. It duplicates listing validation and is not part of the Laravel contract. It is deliberately left unchanged in Phase 0 to preserve the page; replacing it requires the real category/form/media posting workflow and is a follow-up feature task.

## Naming conventions

- Files: lowercase kebab case (`error-state.tsx`, `api-client.ts`).
- React components: PascalCase named exports (`ErrorState`).
- Types: PascalCase; avoid `any`. Prefer `unknown` at untrusted boundaries.
- Functions/variables: camelCase. Constants: camelCase unless a platform convention requires uppercase.
- Route builders use plural resource names and encode dynamic segments.
- Laravel request/response fields retain Laravel's snake_case at the transport boundary; map them to UI/domain models only inside the relevant feature.

## Design, responsive, and RTL baseline

The approved design tokens are CSS variables in `globals.css`: `--blue`, `--deep`, `--yellow`, `--ink`, `--muted`, `--line`, `--wash`, and `--foot`. Existing mobile-first responsive rules use breakpoints around 1100, 900, 700, 620, and 390px. RTL is enabled for Dari and Pashto through document direction plus targeted logical layout overrides. New styles must reuse these tokens, use logical properties where possible, preserve visible keyboard focus, and work in both LTR and RTL.

Seller-created titles, descriptions, names, and other listing content are rendered verbatim in their original language. Locale selection changes interface text and formatting only; it must never machine-translate user content.

## Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | No | Browser-safe display name; defaults to `Malik`. |
| `NEXT_PUBLIC_API_URL` | No for local development | Browser-safe Laravel origin; defaults to `http://localhost:8000`. Use an absolute URL with no secrets. |

Laravel session, database, payment, and other secrets must never be prefixed with `NEXT_PUBLIC_` or added to this project.

## API endpoints confirmed for the foundation

- `GET /sanctum/csrf-cookie`
- `/api/v1/auth/register`, `/login`, `/logout`, and `/session`
- `/api/v1/listings`, `/api/v1/me/listings`, and `/api/v1/listings/{listing}`

The listing creation endpoint currently accepts `category_id`, `title`, `description`, `price_type`, optional `price`, and optional `currency_id`; it does not yet provide the full post-ad form/media workflow. Phase 0 does not invent a replacement endpoint.
