import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-bg px-3 py-2 text-base disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };

export function Btn({ variant = "primary", className = "", ...props }: BtnProps) {
  const v = variant === "primary" ? "bg-accent text-white" : variant === "danger" ? "bg-bad text-white" : "bg-surface-2 text-fg";
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-bold transition hover:brightness-105 disabled:opacity-50 ${v} ${className}`} />;
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-bad">{error instanceof Error ? error.message : String(error)}</p>;
}
