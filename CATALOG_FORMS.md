# Category selection and dynamic forms

`CategorySelector` uses Laravel's public category and child endpoints recursively. `DynamicFormRenderer` accepts the `/api/v1/categories/{category}/form-schema` fields and renders supported controls without category-specific markup.

Live API inspection on 2026-07-19 found that all seeded roots (`vehicles`, `real-estate`, `goods`, `jobs`) are leaves and expose empty schemas. The category response does not provide `status`, `is_selectable`, `allow_listings`, icons, images, field sections, or enough dependency metadata to enforce every requested rule. Zod is not installed, so only native required controls are applied; Laravel validation remains authoritative.
