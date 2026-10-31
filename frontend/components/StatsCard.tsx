import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'sky';
}

const colorStyles = {
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    icon: 'text-indigo-600',
    accent: 'bg-indigo-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: 'text-emerald-600',
    accent: 'bg-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: 'text-amber-600',
    accent: 'bg-amber-600',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    icon: 'text-violet-600',
    accent: 'bg-violet-600',
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    icon: 'text-sky-600',
    accent: 'bg-sky-600',
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
}: StatsCardProps) {
  const styles = colorStyles[color] || colorStyles.indigo;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${styles.bg} ${styles.icon} border ${styles.border}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
