"use client";

import "quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import styles from "./rich-text-editor.module.css";
const sanitizeRichText = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

type Props = { value: string; onChange: (value: string) => void; placeholder?: string; dir?: "ltr" | "rtl"; disabled?: boolean };

export function RichTextEditor({ value, onChange, placeholder, dir, disabled }: Props) {
  const toolbar = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<import("quill").default | null>(null);
  const lastEditorValue = useRef(value);
  const latest = useRef({ value, placeholder, dir, disabled });
  const emitChange = useEffectEvent((html: string) => onChange(html));

  useEffect(() => {
    let active = true;
    const hostNode = host.current;
    const toolbarNode = toolbar.current;
    void import("quill").then(({ default: Quill }) => {
      if (!active || !hostNode || !toolbarNode) return;
      const initialProps = latest.current;
      const instance = new Quill(hostNode, {
        theme: "snow",
        placeholder: initialProps.placeholder ?? "",
        readOnly: Boolean(initialProps.disabled),
        modules: { toolbar: { container: toolbarNode } },
      });
      instance.clipboard.dangerouslyPasteHTML(sanitizeRichText(initialProps.value), "silent");
      lastEditorValue.current = instance.root.innerHTML;
      instance.root.setAttribute("dir", initialProps.dir ?? "auto");
      instance.root.setAttribute("lang", initialProps.dir === "rtl" ? "fa" : "en");
      instance.root.setAttribute("spellcheck", initialProps.dir === "rtl" ? "false" : "true");
      instance.enable(!Boolean(initialProps.disabled));
      instance.on("text-change", () => {
        const html = sanitizeRichText(instance.root.innerHTML);
        lastEditorValue.current = html;
        emitChange(html);
      });
      editor.current = instance;
    });
    return () => {
      active = false;
      editor.current?.off("text-change");
      editor.current = null;
      if (hostNode) {
        hostNode.replaceChildren();
        hostNode.className = "";
        hostNode.removeAttribute("spellcheck");
      }
    };
  }, []);

  useEffect(() => {
    latest.current = { value, placeholder, dir, disabled };
    const instance = editor.current;
    if (instance && !instance.hasFocus() && value !== lastEditorValue.current) {
      instance.clipboard.dangerouslyPasteHTML(sanitizeRichText(value), "silent");
      lastEditorValue.current = instance.root.innerHTML;
    }
    instance?.enable(!Boolean(disabled));
    instance?.root.setAttribute("dir", dir ?? "auto");
    instance?.root.setAttribute("lang", dir === "rtl" ? "fa" : "en");
    instance?.root.setAttribute("spellcheck", dir === "rtl" ? "false" : "true");
    instance?.root.setAttribute("data-placeholder", placeholder ?? "");
  }, [value, placeholder, dir, disabled]);

  return <div className={styles.editor} dir={dir ?? "auto"}>
    <div ref={toolbar} className="ql-toolbar ql-snow">
      <span className="ql-formats"><button type="button" className="ql-header" value="1" aria-label="Heading 1" /><button type="button" className="ql-header" value="2" aria-label="Heading 2" /><button type="button" className="ql-header" value="3" aria-label="Heading 3" /></span>
      <span className="ql-formats"><button type="button" className="ql-bold" /><button type="button" className="ql-italic" /><button type="button" className="ql-underline" /><button type="button" className="ql-strike" /></span>
      <span className="ql-formats"><select className="ql-color" defaultValue="" /><select className="ql-background" defaultValue="" /></span>
      <span className="ql-formats"><button type="button" className="ql-list" value="ordered" /><button type="button" className="ql-list" value="bullet" /></span>
      <span className="ql-formats"><select className="ql-align" defaultValue="" /><button type="button" className="ql-direction" value="rtl" /></span>
      <span className="ql-formats"><button type="button" className="ql-blockquote" /><button type="button" className="ql-code-block" /><button type="button" className="ql-link" /></span>
      <span className="ql-formats"><button type="button" className="ql-clean" /></span>
    </div>
    <div ref={host} />
  </div>;
}

export function RichText({ html, className = "" }: { html: string; className?: string }) {
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);
  const [sanitizedHtml, setSanitizedHtml] = useState("");
  const outputClassName = [styles.output, className].filter(Boolean).join(" ");
  useEffect(() => {
    const timer = window.setTimeout(() => setSanitizedHtml(hasHtml ? sanitizeRichText(html) : ""), 0);
    return () => window.clearTimeout(timer);
  }, [hasHtml, html]);

  if (!hasHtml) return <div className={outputClassName}>{html}</div>;
  return <div className={outputClassName} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
