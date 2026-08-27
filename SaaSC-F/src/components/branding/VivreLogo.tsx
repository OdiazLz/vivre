import { useId } from 'react';

export function VivreMark({ className = 'h-9 w-9' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const primaryId = `vivre-primary-${uid}`;
  const accentId = `vivre-accent-${uid}`;

  return <svg className={className} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={primaryId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5"/>
        <stop offset="100%" stopColor="#7C3AED"/>
      </linearGradient>
      <linearGradient id={accentId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill={`url(#${primaryId})`}/>
    <rect x="42" y="32" width="44" height="60" rx="6" fill="#FFFFFF"/>
    <rect x="50" y="42" width="10" height="10" rx="2" fill="#E0E7FF"/>
    <rect x="68" y="42" width="10" height="10" rx="2" fill="#E0E7FF"/>
    <rect x="50" y="58" width="10" height="10" rx="2" fill="#E0E7FF"/>
    <rect x="68" y="58" width="10" height="10" rx="2" fill="#E0E7FF"/>
    <path d="M60 92V76C60 74.3 61.3 73 63 73H65C66.7 73 68 74.3 68 76V92Z" fill="#4F46E5"/>
    <circle cx="96" cy="92" r="18" fill={`url(#${accentId})`} stroke="#FFFFFF" strokeWidth="3"/>
    <path d="M88 92L94 98L104 87" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export function VivreLogo({ compact = false, inverse = false, className = '' }: { compact?: boolean; inverse?: boolean; className?: string }) {
  return <div className={`flex select-none items-center gap-3 ${className}`} aria-label="Vivre Condos">
    <VivreMark className="h-10 w-10 shrink-0"/>
    {!compact && <div className="flex flex-col justify-center leading-none">
      <span className={`text-xl font-extrabold tracking-tight ${inverse ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>VIVRE</span>
      <span className={`mt-1 text-[9px] font-bold uppercase tracking-[0.35em] ${inverse ? 'text-indigo-200' : 'text-indigo-500'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CONDOS</span>
    </div>}
  </div>;
}

export function SidebarLogo({ collapsed = false }: { collapsed?: boolean }) {
  return <VivreLogo compact={collapsed} inverse/>;
}
