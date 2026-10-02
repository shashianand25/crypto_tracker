import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  GitCompare,
  History,
  Bell,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'MARKETS',
    items: [
      { label: 'Overview', path: '/', icon: LayoutDashboard, exact: true },
      { label: 'Asset Detail', path: '/assets/BTCUSDT', icon: LineChart },
      { label: 'Compare', path: '/compare', icon: GitCompare },
      { label: 'Replay', path: '/replay', icon: History },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { label: 'Alerts', path: '/alerts', icon: Bell },
      { label: 'Anomalies', path: '/anomalies', icon: Activity },
    ],
  },
  {
    title: 'SYSTEM',
    items: [{ label: 'Data Health', path: '/health', icon: HeartPulse }],
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 select-none h-full">
      <div className="flex flex-col">
        {/* Terminal Header */}
        <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-2xs" />
            <span className="font-mono text-xs font-bold tracking-tight text-slate-900 uppercase">
              TERMINAL // DATA
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded-2xs">
            v1.0
          </span>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2 text-2xs font-mono font-semibold text-slate-400 tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2 py-1.5 text-xs font-medium rounded-sm transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      )
                    }
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 text-2xs font-mono text-slate-500">
        <div className="flex items-center justify-between">
          <span>PIPELINE</span>
          <span className="text-emerald-700 font-medium">REALTIME</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
          <span>PORT</span>
          <span>3000 // WS+REST</span>
        </div>
      </div>
    </aside>
  );
};
