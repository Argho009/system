import React from 'react';

export const EmptyState = ({ message, icon: Icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
      {Icon && <Icon className="mx-auto h-12 w-12 text-slate-400" />}
      <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};
