import React from 'react';
import { cn } from './Button';

export const Input = React.forwardRef(({ className, wrapperClassName, label, error, ...props }, ref) => {
  return (
    <div className={cn("flex flex-col space-y-1", wrapperClassName)}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-shadow",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
