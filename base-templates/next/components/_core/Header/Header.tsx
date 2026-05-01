'use client';

import type { ReactNode } from 'react';

export interface HeaderProps {
  className?: string;
  type?: 'standard' | 'gameplay' | 'navigation';
  variant?: 'default' | 'transparent';
  // Standard
  showLogo?: boolean;
  showMenuButton?: boolean;
  logo?: ReactNode;
  menuButton?: ReactNode;
  onMenuClick?: () => void;
  center?: ReactNode;
  // Gameplay
  score?: number;
  time?: string;
  powerUps?: ReactNode;
  // Navigation
  showBackButton?: boolean;
  backButton?: ReactNode;
  onBackClick?: () => void;
}

export default function Header({
  className = '',
  type = 'standard',
  variant = 'default',
  showLogo = true,
  showMenuButton = true,
  logo,
  menuButton,
  onMenuClick,
  center,
  score,
  time,
  powerUps,
  showBackButton = true,
  backButton,
  onBackClick,
}: HeaderProps) {
  const base    = 'grid grid-cols-3 items-center px-4 w-full relative z-[100]';
  const bg      = variant === 'transparent'
    ? 'bg-transparent'
    : 'bg-[var(--surface-strong)] backdrop-blur-md border-b border-[var(--line-soft)]';
  const height  = type === 'gameplay' ? 'min-h-[112px] py-4' : 'h-[88px] py-6';
  const classes = `${base} ${height} ${bg} ${className}`.trim();

  if (type === 'standard') {
    return (
      <header className={classes}>
        <div className="flex items-center justify-start">
          {showLogo && logo && <div className="w-[122px] h-10">{logo}</div>}
        </div>
        <div className="flex items-center justify-center">{center}</div>
        <div className="flex items-center justify-end">
          {showMenuButton && menuButton && (
            <button onClick={onMenuClick} aria-label="Menu" className="flex items-center justify-center w-10 h-10">
              {menuButton}
            </button>
          )}
        </div>
      </header>
    );
  }

  if (type === 'gameplay') {
    return (
      <header className={classes}>
        <div className="flex flex-col items-start gap-2">
          {score !== undefined && <div className="text-[var(--text-primary)] text-2xl font-bold">{score}</div>}
          {time && <div className="text-[var(--text-secondary)] text-sm">{time}</div>}
        </div>
        <div className="flex items-center justify-center">{center}</div>
        <div className="flex items-center justify-end">{powerUps}</div>
      </header>
    );
  }

  if (type === 'navigation') {
    return (
      <header className={classes}>
        <div className="flex items-center justify-start">
          {showBackButton && backButton ? (
            <button onClick={onBackClick} aria-label="Back" className="flex items-center justify-center w-10 h-10">
              {backButton}
            </button>
          ) : (
            showLogo && logo && <div className="w-10 h-10" aria-hidden="true" />
          )}
        </div>
        <div className="flex items-center justify-center">{center}</div>
        <div className="flex items-center justify-end">
          {showLogo && logo && <div className="w-[122px] h-10">{logo}</div>}
        </div>
      </header>
    );
  }

  return null;
}
