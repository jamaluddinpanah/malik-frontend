"use client";
/* eslint-disable @next/next/no-img-element -- File previews use local blob URLs. */

import { Eye, EyeOff, Search, Upload } from "lucide-react";
import {
  cloneElement,
  createContext,
  useContext,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import styles from "./ui.module.css";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const FormPendingContext = createContext(false);

/** React state alone cannot guard reentrant submits before the next render. */
export function Form({ onSubmit, children, ...props }: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => unknown | Promise<unknown>;
}) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  return <FormPendingContext.Provider value={pending}><form {...props} aria-busy={pending || undefined} onSubmit={async (event) => {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try { await onSubmit(event); }
    finally { locked.current = false; setPending(false); }
  }}>{children}</form></FormPendingContext.Provider>;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  onClick,
  type = "submit",
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => unknown | Promise<unknown>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  const formPending = useContext(FormPendingContext);
  const locked = useRef(false);
  const [clickPending, setClickPending] = useState(false);
  const busy = loading || clickPending || (type === "submit" && formPending);
  return (
    <button
      {...props}
      type={type}
      data-ui="button"
      data-variant={variant}
      data-size={size}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={onClick ? async (event) => {
        if (locked.current || disabled || busy) { event.preventDefault(); return; }
        locked.current = true;
        try {
          const result = onClick(event);
          if (result && typeof (result as PromiseLike<unknown>).then === "function") {
            setClickPending(true);
            await result;
          }
        } finally { locked.current = false; setClickPending(false); }
      } : undefined}
      className={`${styles.button} ${styles[`button_${variant}`]} ${styles[`size_${size}`]} ${className}`}
    >
      {busy ? <SpinnerLabel /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`${styles.iconButton} ${className}`}
    >
      {children}
    </button>
  );
}

function SpinnerLabel() {
  return <span className={styles.inlineSpinner} aria-hidden="true" />;
}

type FieldControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  error?: boolean;
};
export function Input({ error, className = "", ...props }: FieldControlProps) {
  return (
    <input
      {...props}
      aria-invalid={error || undefined}
      className={`${styles.control} ${error ? styles.invalid : ""} ${className}`}
    />
  );
}
export function Textarea({
  error,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={error || undefined}
      className={`${styles.control} ${styles.textarea} ${error ? styles.invalid : ""} ${className}`}
    />
  );
}
export function Select({
  error,
  className = "",
  children,
  onChange,
  disabled,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  error?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => unknown | Promise<unknown>;
}) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  return (
    <select
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onChange={onChange ? async (event) => {
        if (locked.current) return;
        locked.current = true;
        try {
          const result = onChange(event);
          if (result && typeof (result as PromiseLike<unknown>).then === "function") {
            setPending(true);
            await result;
          }
        } finally { locked.current = false; setPending(false); }
      } : undefined}
      aria-invalid={error || undefined}
      className={`${styles.control} ${error ? styles.invalid : ""} ${className}`}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className={`${styles.choice} ${className}`}>
      <input {...props} type="checkbox" />
      <span>
        <b>{label}</b>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className={styles.radioGroup} disabled={disabled}>
      <legend>{label}</legend>
      {options.map((option) => (
        <label className={styles.choice} key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>
            <b>{option.label}</b>
            {option.description ? <small>{option.description}</small> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={styles.switchRow}>
      <span>
        <b>{label}</b>
        {description ? <small>{description}</small> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
      >
        <span />
      </button>
    </label>
  );
}

export function DateInput(props: FieldControlProps) {
  return <Input {...props} type="date" />;
}
export function TimeInput(props: FieldControlProps) {
  return <Input {...props} type="time" />;
}
export function SearchInput({ className = "", ...props }: FieldControlProps) {
  return (
    <span className={`${styles.withIcon} ${className}`}>
      <Search aria-hidden="true" size={18} />
      <Input {...props} type="search" />
    </span>
  );
}

export function PasswordInput({ className = "", ...props }: FieldControlProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("accessibility");
  return (
    <span className={`${styles.withAction} ${className}`}>
      <Input {...props} type={visible ? "text" : "password"} />
      <IconButton
        type="button"
        label={t(visible ? "hidePassword" : "showPassword")}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </IconButton>
    </span>
  );
}

export function PhoneInput({
  countryCode = "+93",
  onCountryCodeChange,
  ...props
}: FieldControlProps & {
  countryCode?: string;
  onCountryCodeChange?: (value: string) => void;
}) {
  const t = useTranslations("accessibility");
  return (
    <span className={styles.phone}>
      <Select
        aria-label={t("countryCode")}
        value={countryCode}
        onChange={(event) => onCountryCodeChange?.(event.target.value)}
      >
        <option value="+93">+93</option>
      </Select>
      <Input {...props} type="tel" inputMode="tel" />
    </span>
  );
}

export function CurrencyInput({
  currency = "AFN",
  ...props
}: FieldControlProps & { currency?: string }) {
  return (
    <span className={styles.currency}>
      <Input {...props} type="number" inputMode="decimal" />
      <b>{currency}</b>
    </span>
  );
}

type FieldChildProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};
export function FormField({
  label,
  description,
  error,
  required,
  children,
  className = "",
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactElement<FieldChildProps>;
  className?: string;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [children.props["aria-describedby"], descriptionId, errorId]
      .filter(Boolean)
      .join(" ") || undefined;
  const control = cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });
  return (
    <div className={`${styles.field} ${className}`}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {description ? (
        <HelperText id={descriptionId}>{description}</HelperText>
      ) : null}
      <div>{control}</div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export function Label({
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label {...props} className={styles.label}>
      {children}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
}
export function HelperText({
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p {...props} className={styles.helper}>
      {children}
    </p>
  );
}
export function FieldError({
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p {...props} className={styles.fieldError} role="alert">
      {children}
    </p>
  );
}

export function FileUploadField({
  label,
  accept,
  multiple = false,
  disabled,
  onFiles,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputId = useId();
  const change = (event: ChangeEvent<HTMLInputElement>) =>
    onFiles(Array.from(event.target.files ?? []));
  return (
    <div className={styles.fileUpload}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={change}
      />
      <label htmlFor={inputId}>
        <Upload size={19} />
        <span>{label}</span>
      </label>
    </div>
  );
}

export function ImagePreview({
  file,
  alt,
  onRemove,
}: {
  file: File | string;
  alt: string;
  onRemove?: () => void;
}) {
  const t = useTranslations("accessibility");
  const [url] = useState(() =>
    typeof file === "string" ? file : URL.createObjectURL(file),
  );
  useEffect(
    () => () => {
      if (typeof file !== "string") URL.revokeObjectURL(url);
    },
    [file, url],
  );
  return (
    <figure className={styles.imagePreview}>
      <img src={url} alt={alt} />
      {onRemove ? (
        <IconButton type="button" label={t("removeImage")} onClick={onRemove}>
          ×
        </IconButton>
      ) : null}
    </figure>
  );
}
