"use client";

import { ChevronDown, X } from "lucide-react";
import { type ReactNode, useEffect, useEffectEvent, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import styles from "./ui.module.css";

function useFocusTrap(
  active: boolean,
  onClose: () => void,
  container: React.RefObject<HTMLElement | null>,
) {
  const previous = useRef<HTMLElement | null>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!active) return;
    previous.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = container.current;
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const nodes = focusable();
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous.current?.focus();
    };
  }, [active, container]);
}

export function DropdownMenu({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={detailsRef} className={styles.dropdown}>
      <summary>
        {label}
        <ChevronDown size={16} />
      </summary>
      <div role="menu">{children}</div>
    </details>
  );
}
export function DropdownMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect?: () => void;
}) {
  return (
    <button type="button" role="menuitem" onClick={onSelect}>
      {children}
    </button>
  );
}

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: OverlayProps) {
  const t = useTranslations("accessibility");
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className={styles.overlay} role="presentation">
      <button
        className={styles.backdrop}
        aria-label={t("closeDialog")}
        onClick={onClose}
      />
      <div
        ref={ref}
        className={`${styles.dialog} ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={t("closeDialog")} onClick={onClose}>
            <X />
          </button>
        </header>
        <div className={styles.overlayBody}>{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
export function ConfirmationDialog({
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  ...props
}: OverlayProps & {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      {...props}
      footer={
        <>
          <button
            type="button"
            className={styles.textButton}
            onClick={props.onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "end",
}: OverlayProps & { side?: "start" | "end" }) {
  const t = useTranslations("accessibility");
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useFocusTrap(open, onClose, ref);
  if (!open) return null;
  return (
    <div className={styles.overlay} role="presentation">
      <button
        className={styles.backdrop}
        aria-label={t("closeDrawer")}
        onClick={onClose}
      />
      <aside
        ref={ref}
        className={`${styles.drawer} ${side === "start" ? styles.drawerStart : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={t("closeDrawer")} onClick={onClose}>
            <X />
          </button>
        </header>
        <div className={styles.overlayBody}>{children}</div>
      </aside>
    </div>
  );
}
export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: OverlayProps) {
  const t = useTranslations("accessibility");
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useFocusTrap(open, onClose, ref);
  if (!open) return null;
  return (
    <div className={styles.overlay} role="presentation">
      <button
        className={styles.backdrop}
        aria-label={t("closeSheet")}
        onClick={onClose}
      />
      <section
        ref={ref}
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <span className={styles.sheetHandle} />
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={t("closeSheet")} onClick={onClose}>
            <X />
          </button>
        </header>
        <div className={styles.overlayBody}>{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </div>
  );
}

export function Tabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: readonly { id: string; label: string; content: ReactNode }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) =>
        tab.id === activeId ? (
          <div key={tab.id} role="tabpanel" className={styles.tabPanel}>
            {tab.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
