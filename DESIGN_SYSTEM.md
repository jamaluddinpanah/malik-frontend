# Malik design system

The reusable UI foundation is in `src/components/ui`. It preserves Malik's blue, yellow, slate, rounded-card visual language by using the existing global design tokens instead of a new theme.

```tsx
import { Alert, Button, FormField, Input, StatusBadge } from "@/components/ui";

<FormField label="Listing title" required error={titleError}>
  <Input value={title} onChange={onTitleChange} error={Boolean(titleError)} />
</FormField>
<Button variant="primary" loading={saving}>Save listing</Button>
<StatusBadge status="pending" />
<Alert tone="warning" title="Review required">Complete the required fields.</Alert>
```

`Dialog`, `Drawer`, `MobileBottomSheet`, and `ConfirmationDialog` trap focus while open, return focus to the trigger on close, and close with Escape. Use `Dialog` on wider layouts and `MobileBottomSheet` for touch-first flows. The library uses CSS logical properties and mirrors only directional chevrons in RTL.

No component showcase route is included: the system is private to imports and documentation, so no showcase is exposed in production.
