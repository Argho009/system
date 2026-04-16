import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from './Button';

export const StatCard = ({ title, value, subtitle, color = 'indigo', icon: Icon, link, className }) => {
  const colorMap = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
  };

  const titleColorMap = {
    indigo: "text-indigo-600",
    green: "text-green-600",
    red: "text-red-600",
    slate: "text-slate-600",
  };

  const CardContent = (
    <div className={cn("rounded-lg border p-6 shadow-sm transition-all hover:shadow-md", colorMap[color], className)}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className={cn("text-sm font-semibold uppercase tracking-wider", titleColorMap[color])}>
            {title}
          </h3>
          <div className="flex items-baseline gap-x-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
          </div>
          {subtitle && <p className="mt-1 text-sm opacity-80">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-md bg-white/50", titleColorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block group">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
};
