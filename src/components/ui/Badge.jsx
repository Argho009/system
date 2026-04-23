import React from 'react';
import { cn } from './Button';

export const Badge = ({ children, variant = "default", className }) => {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    indigo: "bg-indigo-100 text-indigo-800",
    purple: "bg-purple-100 text-purple-800",
    blue: "bg-blue-100 text-blue-800",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
};
