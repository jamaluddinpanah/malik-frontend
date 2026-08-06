export type ApiCategory = {
  id: number;
  slug: string;
  name: string | null;
  description: string | null;
  children: ApiCategory[];
  is_leaf?: boolean;
  is_selectable?: boolean;
  allow_listings?: boolean;
  root_type?: string | null;
  icon?: string | null;
  image?: string | null;
  sort_order?: number;
  requires_moderation?: boolean;
  status?: boolean;
};
export type CategoryPath = ApiCategory[];
export type SchemaOption = {
  id: number;
  value: string;
  slug: string;
  parent_option_id: number | null;
  label: string | null;
};
export type SchemaSection = {
  id?: number;
  code: string;
  name?: string | null;
  description?: string | null;
  sort_order?: number;
  fields?: SchemaField[];
};
export type SchemaField = {
  attribute_id: number;
  code: string;
  data_type: string;
  input_type: string;
  label: string | null;
  placeholder: string | null;
  help_text: string | null;
  required: boolean;
  validation: Record<string, unknown> | null;
  conditional_rules: unknown;
  dependent_rules?: unknown;
  options: SchemaOption[];
  section_id?: number | null;
  section_code?: string | null;
  section?: string | null;
};
export type CategoryFormSchema = {
  category: { id: number; slug: string };
  sections: SchemaSection[];
  fields: SchemaField[];
};
export type DynamicFormValues = Record<
  string,
  string | number | boolean | string[] | Record<string, string> | null
>;
