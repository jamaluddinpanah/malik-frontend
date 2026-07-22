import { icons, type LucideIcon } from "lucide-react";

// lucide-react exposes its complete installed icon registry through `icons`.
const iconEntries = (Object.entries(icons) as Array<[
  string,
  LucideIcon,
]>).sort(([a], [b]) => a.localeCompare(b));

export const categoryIconOptions = iconEntries.map(([name, icon]) => ({
  name,
  icon,
}));

export const categoryIconMap = Object.fromEntries(
  categoryIconOptions.map(({ name, icon }) => [name, icon]),
) as Record<string, LucideIcon>;
