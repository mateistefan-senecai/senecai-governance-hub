import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ink" | "ghost";
type Size = "md" | "sm";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "border-ink bg-gold text-white hover:bg-gold-hover",
  ink: "border-ink bg-ink text-panel hover:bg-ink-hover",
  ghost: "border-ink bg-transparent text-ink hover:bg-gold-tint",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "px-4 py-2 text-[12.5px]",
  sm: "px-3 py-1.5 text-[11px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  href,
  children,
  ...rest
}: CommonProps & { href?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const classes = `inline-flex items-center justify-center gap-1.5 rounded-none border-2 font-semibold transition-none ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
