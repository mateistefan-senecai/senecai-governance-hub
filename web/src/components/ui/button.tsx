import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ink" | "ghost";
type Size = "md" | "sm";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "border-transparent bg-ink text-rail-text shadow-sm hover:bg-ink-hover hover:shadow-md",
  ink: "border-transparent bg-ink text-panel shadow-sm hover:bg-ink-hover hover:shadow-md",
  ghost: "border-ink/15 bg-white/60 text-ink hover:border-ink/40 hover:bg-white",
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
  const classes = `inline-flex items-center justify-center gap-1.5 rounded-[10px] border font-semibold transition-colors ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`;

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
