"use client";

import { cn } from "@/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses = {
  primary:
    "bg-amber-500 hover:bg-amber-400 text-obsidian-300 font-semibold shadow-lg shadow-amber-500/20 border border-amber-400/30",
  secondary:
    "bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600 hover:border-slate-500",
  ghost:
    "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-slate-100",
  danger:
    "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-400/50",
  outline:
    "bg-transparent border border-slate-600 hover:border-amber-500/50 text-slate-300 hover:text-amber-400",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
