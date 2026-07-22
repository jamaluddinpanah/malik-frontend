# Malik Next.js migration

## Existing project analysis

`sahibinden_clone` is a hybrid static marketplace and Express/MySQL API. The browser UI is implemented as seven standalone HTML pages with substantial inline CSS and JavaScript. The Node backend exposes `/api/health`, authentication, categories, public listing search/detail, protected listing creation, and protected account-listing endpoints. MySQL tables are `users`, `categories`, `listings`, `listing_images`, and `favorites`.

### Feature inventory

| Existing area | Previous implementation | Next.js status |
| --- | --- | --- |
| Home / category browsing | `index.html` | Migrated: server-rendered home, category links, featured cards, search |
| Search and sorting | `search.html`, `GET /api/listings` | Migrated: query-driven search; repository supports the original filtering/sort vocabulary |
| Listing detail | `listing.html`, `GET /api/listings/:slug` | Migrated: dynamic route, details, seller and view counting |
| Real estate landing | `real-estate.html` | Covered by category search and copied real-estate assets; dedicated editorial layout remains work |
| Create listing | `post-ad.html`, `POST /api/listings` | Migrated: validated client form and Route Handler; persistence remains work |
| Sign in/register | `sign-in.html`, JWT routes | Not yet migrated: needs chosen auth/session provider and password persistence |
| Account / ads | `my-account.html`, account routes | Migrated as a repository-backed ad summary; advanced static settings remain work |
| Account settings | modal-heavy inline client code | Identified as presentational prototype only; no matching backend endpoints exist |
| Brand / real-estate assets | `assets/` | Copied to `public/assets/` |

### Existing business rules and integrations

- Listing search accepts text, category (including parent category), city, price range, featured flag, pagination, and newest/price/popular ordering.
- Listings must have a valid category, 8–180 character title, 20–5000 character description, nonnegative price, location, and 1–12 image URLs. Active listings are visible; account deletion of a listing is a soft delete.
- Registration requires unique email, phone, city and a 10+ character password. Passwords are bcrypt hashes; Express issues JWT bearer tokens.
- The old API is MySQL-only, uses named SQL placeholders/transactions, Zod request validation, Helmet, CORS, compression, rate limiting, and Pino logging.

## Architecture decisions

The application uses App Router and TypeScript, with Server Components by default. Interactive searching and ad submission are Client Components only where browser state/event handlers are required.

- `src/domain`: listing/category entities and repository contracts.
- `src/application`: search, detail, and category use cases.
- `src/infrastructure`: composition root and temporary in-memory repository. A MySQL repository can implement the same contracts from `DATABASE_URL`.
- `src/presentation`: reusable site chrome, search form and listing card.
- `src/app`: routes, loading/not-found states, and the listing submission Route Handler.
- `.env.example`: names the future database and auth configuration rather than embedding it in code.

## DRY improvements

The prior HTML duplicates header/footer/navigation, category trees, card markup, account menu markup, CSS tokens, and direct DOM interactions across pages. This rebuild centralizes global visual tokens in `globals.css`, site chrome in components, and all listing-card money/markup in `ListingCard`. Search behavior is one component and listing access travels through one use-case/repository boundary rather than being coupled to a page or SQL handler.

## File mapping

| Old files | New destination |
| --- | --- |
| `index.html` | `src/app/page.tsx`, presentation components |
| `search.html` | `src/app/search/page.tsx` |
| `listing.html` and the long named listing HTML | `src/app/listing/[slug]/page.tsx` |
| `post-ad.html` | `src/app/post-ad/page.tsx`, `src/app/api/listings/route.ts` |
| `my-account.html` | `src/app/account/page.tsx` |
| `real-estate.html` | category search plus `public/assets/real-estate/` |
| `src/routes/listings.routes.js`, `categories.routes.js` | domain contracts, listing use cases and infrastructure repository |
| `database/schema.sql`, `seed.sql` | documented source for future MySQL repository migration |

## Completed work

- Created separate `malik-next` project with Next.js 16.2.10 (current generated stable release), React 19, TypeScript, ESLint, and App Router.
- Implemented a running reusable marketplace UI and primary public flows.
- Added loading, not-found, form validation/error responses, responsive styling, and empty search state.
- Copied required local assets without altering `sahibinden_clone`.

## Remaining work and assumptions

- The in-memory repository is seeded from the original SQL sample data for a self-contained migration. Replace it with MySQL/Prisma/Drizzle persistence before production; the repository contract intentionally isolates that change.
- Auth, favorites, pagination, image upload/storage, account profile/settings, listing edits/soft deletes, the dedicated real-estate editorial page, and the old account UI’s payment/security/notification controls require their missing backend models/endpoints and are not represented as functioning features yet.
- The original pages also include external Pexels images. Those URLs are retained only for sample seed-equivalent records; Next image optimization is not used so external-domain configuration is unnecessary.
- The old static account controls often only display success messages. They are not claimed as fully migrated functionality.
