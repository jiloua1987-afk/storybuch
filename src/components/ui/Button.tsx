"use client";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className,
  type = "button",
  fullWidth,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-[#1A1410] text-white hover:bg-[#2D2620] focus:ring-[#1A1410]",
    secondary:
      "bg-white text-[#1A1410] border-2 border-[#E8D9C0] hover:border-[#8B7355] hover:bg-[#F5EDE0] focus:ring-[#E8D9C0]",
    ghost:
      "bg-transparent text-[#8B7355] hover:bg-[#F5EDE0] focus:ring-[#E8D9C0]",
    danger:
      "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
