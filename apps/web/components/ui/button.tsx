import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-acid text-night hover:bg-[#efff71] disabled:bg-acid/[0.35] disabled:text-night/[0.45]",
  secondary: "bg-white/5 text-ink border border-white/10 hover:border-white/20 hover:bg-white/10 disabled:text-ink/35",
  ghost: "bg-transparent text-ink hover:bg-white/[0.08] disabled:text-ink/35",
  danger: "bg-coral text-white hover:bg-[#e75f4d] disabled:bg-coral/[0.35]"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
          "focus:outline-none focus:ring-2 focus:ring-acid/60 focus:ring-offset-2 focus:ring-offset-night",
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
}
