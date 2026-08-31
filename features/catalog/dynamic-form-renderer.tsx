"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type {
  DynamicFormValues,
  SchemaField,
  SchemaSection,
} from "./category-types";
import { LocationSelector } from "./location-selector";
import { VehicleBodyConditionMap } from "./vehicle-body-condition-map";
import styles from "./catalog-forms.module.css";

const supported = new Set([
  "text",
  "textarea",
  "integer",
  "decimal",
  "number",
  "password",
  "email",
  "url",
  "checkbox",
  "radio",
  "select",
  "multi-select",
  "date",
  "datetime",
  "time",
  "range",
  "location",
  "vehicle-condition-map",
]);

function visible(
  field: SchemaField,
  values: DynamicFormValues,
  fieldsById: Map<number, SchemaField>,
) {
  const raw = field.conditional_rules ?? field.dependent_rules;
  if (!raw || typeof raw !== "object") return true;
  const rules = Array.isArray(raw) ? raw : [raw];
  return rules.every((item) => {
    if (!item || typeof item !== "object") return true;
    const rule = item as Record<string, unknown>;
    const key = rule.field ?? rule.depends_on ?? rule.attribute_id;
    const parent =
      typeof key === "number" ? fieldsById.get(key)?.code : key;
    if (typeof parent !== "string") return true;
    const actual = values[parent];
    const expected = rule.equals ?? rule.value;
    if (expected === undefined) return true;
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    const equals = Array.isArray(actual)
      ? actual.some((value) => expectedValues.map(String).includes(String(value)))
      : actual === expected || String(actual) === String(expected);
    if (rule.operator === "exists") return actual !== undefined && actual !== null && actual !== "";
    if (rule.operator === "not_equals") return !equals;
    if (rule.operator === "in") return expectedValues.map(String).includes(String(actual));
    if (rule.operator === "contains") return Array.isArray(actual) && actual.map(String).includes(String(expected));
    return equals;
  });
}

export function DynamicFormRenderer({
  fields,
  sections = [],
  values,
  errors = {},
  onChange,
}: {
  fields: SchemaField[];
  sections?: SchemaSection[];
  values: DynamicFormValues;
  errors?: Record<string, string[]>;
  onChange: (code: string, value: DynamicFormValues[string]) => void;
}) {
  const unknown = useMemo(
    () => fields.filter((field) => !supported.has(field.input_type)),
    [fields],
  );
  const fieldsById = new Map(fields.map((field) => [field.attribute_id, field]));
  const t = useTranslations("categoryForms");
  const grouped = sections.length
    ? sections.map((section) => ({
        ...section,
        fields: section.fields?.length
          ? section.fields
          : fields.filter(
              (field) =>
                field.section_id === section.id ||
                field.section_code === section.code ||
                field.section === section.code,
            ),
      }))
    : [{ code: "default", fields }];
  const assigned = new Set(
    grouped
      .flatMap((section) => section.fields ?? [])
      .map((field) => field.attribute_id),
  );
  if (sections.length)
    grouped.push({
      code: "other",
      fields: fields.filter((field) => !assigned.has(field.attribute_id)),
    });
  return (
    <div className={styles.formSections}>
      {unknown.length ? (
        <p className={styles.unknown}>
          {t("unsupported", {
            fields: unknown
              .map((field) => `${field.code} (${field.input_type})`)
              .join(", "),
          })}
        </p>
      ) : null}
      {grouped
        .filter((section) => section.fields?.length)
        .map((section) => (
          <fieldset className={styles.formSection} key={section.code}>
            <legend>
              {section.name ??
                (section.code === "default" || section.code === "other"
                  ? ""
                  : section.code)}
            </legend>
            {section.description ? (
              <p className={styles.sectionDescription}>{section.description}</p>
            ) : null}
            <div className={styles.dynamicForm}>
              {section.fields
                ?.filter(
                  (field) =>
                    supported.has(field.input_type) &&
                    visible(field, values, fieldsById),
                )
                .map((field) => (
                  <DynamicField
                    key={field.attribute_id}
                    field={field}
                    value={values[field.code]}
                     error={fieldError(errors, field)}
                    onChange={onChange}
                  />
                ))}
            </div>
          </fieldset>
        ))}
    </div>
  );
}

function fieldError(errors: Record<string, string[]>, field: SchemaField) {
  const code = field.code;
  const key = Object.keys(errors).find(
    (candidate) =>
      candidate === code ||
      candidate === `attributes.${code}` ||
      candidate === `attributes.${field.attribute_id}` ||
      candidate.startsWith(`${code}.`) ||
      candidate.startsWith(`attributes.${code}.`) ||
      candidate.startsWith(`attributes.${field.attribute_id}.`),
  );
  return key ? errors[key]?.[0] : undefined;
}

function DynamicField({
  field,
  value,
  error,
  onChange,
}: {
  field: SchemaField;
  value: DynamicFormValues[string];
  error?: string;
  onChange: (code: string, value: DynamicFormValues[string]) => void;
}) {
  const id = `field-${field.attribute_id}`;
  const label = field.label ?? field.code;
  const common = {
    id,
    name: field.code,
    required: field.required,
    "aria-invalid": Boolean(error),
  };
  const t = useTranslations("categoryForms");
  const set = (next: DynamicFormValues[string]) => onChange(field.code, next);
  let control: React.ReactNode;
  if (field.input_type === "textarea")
    control = (
      <textarea
        {...common}
        placeholder={field.placeholder ?? undefined}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => set(event.target.value)}
      />
    );
  else if (field.input_type === "checkbox")
    control = (
      <input
        {...common}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => set(event.target.checked)}
      />
    );
  else if (field.input_type === "radio")
    control = (
      <span className={styles.options}>
        {field.options.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name={field.code}
              checked={value === option.value}
              onChange={() => set(option.value)}
            />
            {option.label ?? option.value}
          </label>
        ))}
      </span>
    );
  else if (field.input_type === "location")
    control = (
      <LocationSelector
        value={typeof value === "number" ? value : undefined}
        onChange={(area) => set(area?.id ?? null)}
      />
    );
  else if (field.input_type === "vehicle-condition-map")
    control = (
      <VehicleBodyConditionMap
        value={value && typeof value === "object" && !Array.isArray(value) ? value : null}
        onChange={set}
      />
    );
  else if (field.input_type === "select")
    control = (
      <select
        {...common}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => set(event.target.value)}
      >
        <option value="">{field.placeholder ?? t("select")}</option>
        {field.options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    );
  else if (field.input_type === "multi-select")
    control = (
      <select
        {...common}
        multiple
        value={Array.isArray(value) ? value : []}
        onChange={(event) =>
          set(
            Array.from(
              event.currentTarget.selectedOptions,
              (option) => option.value,
            ),
          )
        }
      >
        {field.options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    );
  else {
    const numeric = ["integer", "decimal", "number", "range"].includes(
      field.input_type,
    );
    const type = numeric
      ? field.input_type === "range"
        ? "range"
        : "number"
      : field.input_type === "datetime"
        ? "datetime-local"
        : ["date", "time", "password", "email", "url"].includes(
              field.input_type,
            )
          ? field.input_type
          : "text";
    control = (
      <input
        {...common}
        type={type}
        step={field.input_type === "decimal" ? "any" : undefined}
        min={
          typeof field.validation?.min === "number"
            ? field.validation.min
            : undefined
        }
        max={
          typeof field.validation?.max === "number"
            ? field.validation.max
            : undefined
        }
        placeholder={field.placeholder ?? undefined}
        value={
          typeof value === "string" || typeof value === "number" ? value : ""
        }
        onChange={(event) =>
          set(
            numeric
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
    );
  }
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {field.required ? " *" : null}
      </label>
      {field.help_text ? <small>{field.help_text}</small> : null}
      {control}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
