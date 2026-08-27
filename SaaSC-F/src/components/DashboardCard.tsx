import { type LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export default function DashboardCard({ title, value, description, icon: Icon, color }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
