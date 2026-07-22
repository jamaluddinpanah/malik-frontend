# Malik frontend

The Next.js frontend uses locale-prefixed routes and cookie-based Laravel Sanctum
authentication against the sibling `malik-api` project.

## Local development

```bash
npm install
npm run dev
```

Configure the browser-visible API origin in `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Localization

Supported locales are English (`en`), Dari (`fa`), and Pashto (`ps`). Every
public, authentication, account, and admin URL is canonicalized to one of these
prefixes, for example `/en/login`, `/fa/search`, or `/ps/admin`. Visiting an
unprefixed URL redirects to the locale stored in `NEXT_LOCALE`; if none is set,
English is used.

`src/i18n/config.ts` is the single locale registry. The shared typed message
namespaces live in `messages/<locale>/common.json`. The language switcher
preserves the current path and query string, stores only the non-sensitive
`NEXT_LOCALE` preference cookie, and applies RTL document direction for Dari and
Pashto. The centralized API client sends the active locale through
`Accept-Language` on every API request.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
