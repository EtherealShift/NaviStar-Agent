import React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "default", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        variant === "outline" && "border border-border bg-background hover:bg-accent",
        variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        size === "default" && "h-9 px-3",
        size === "sm" && "h-8 px-3 text-xs",
        size === "icon" && "size-9",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition",
        "placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-3 text-sm outline-none transition",
        "placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition",
        "focus:border-ring focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({ className, variant = "secondary", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "border border-border text-muted-foreground",
        variant === "success" && "bg-success text-success-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function Switch({ checked, onChange, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-10 rounded-full border border-border bg-secondary transition",
        checked && "bg-primary",
        className,
      )}
      onClick={() => onChange?.(!checked)}
      {...props}
    >
      <span
        className={cn(
          "absolute left-1 top-1 size-4 rounded-full bg-foreground transition-transform",
          checked && "translate-x-4 bg-primary-foreground",
        )}
      />
    </button>
  );
}
