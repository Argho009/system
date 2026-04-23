import React from 'react';
import { cn } from './Button';

export const Toggle = ({ option1, option2, value, onChange, label }) => {
  return (
    <div className="flex flex-col space-y-2">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <div className="flex items-center space-x-0 w-fit border border-slate-300 rounded overflow-hidden">
        <button
          type="button"
          className={cn(
            "px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none",
            value === option1.value ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => onChange(option1.value)}
        >
          {option1.label}
        </button>
        <button
          type="button"
          className={cn(
            "px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none border-l border-slate-200",
            value === option2.value ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => onChange(option2.value)}
        >
          {option2.label}
        </button>
      </div>
    </div>
  );
};
