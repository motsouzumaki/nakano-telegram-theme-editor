import React from 'react';
import { Smartphone, Sparkles, Palette, SlidersHorizontal } from 'lucide-react';

export type MobileTab = 'preview' | 'studio' | 'colors' | 'inspect';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const NAV_ITEMS: {
  id: MobileTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'preview', label: 'Preview', icon: Smartphone },
  { id: 'studio', label: 'Studio', icon: Sparkles },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'inspect', label: 'Inspect', icon: SlidersHorizontal },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="relative z-30 shrink-0 border-t border-surface-border bg-surface-panel/92 backdrop-blur-xl pb-safe select-none transition-colors duration-300"
    >
      <div className="grid grid-cols-4 h-[60px] px-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer ${
                isActive ? 'text-brand-400' : 'text-slate-400 active:text-slate-200'
              }`}
            >
              <span
                className={`flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/18 text-brand-400 shadow-xs'
                    : 'bg-transparent text-slate-400'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span
                className={`text-[10.5px] leading-none tracking-tight transition ${
                  isActive ? 'font-semibold text-white' : 'font-medium text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
