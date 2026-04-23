import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  const baseStyle = "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 text-base",
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyle, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

Button.displayName = "Button";
