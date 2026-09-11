'use client';

import React from 'react';

interface ARLLogoProps {
  arlId: string;
  customLogo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ARLLogo({ arlId, customLogo, size = 'md', className = '' }: ARLLogoProps) {
  const normalized = arlId.toLowerCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  // If a custom image (URL or base64) is provided, render it cleanly
  if (customLogo && (customLogo.startsWith('data:image') || customLogo.startsWith('http') || customLogo.startsWith('/'))) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden p-1 shrink-0 ${className}`}
        title={arlId}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={customLogo} alt={arlId} className="w-full h-full object-contain rounded-xl" />
      </div>
    );
  }

  // Official Vector Brands
  if (normalized.includes('sura')) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-[#0033A0] text-white flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0 ${className}`} title="ARL SURA">
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5 fill-current">
          <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15 Z" fill="#0033A0" />
          <path d="M30 40 Q50 25 70 40 Q75 60 50 78 Q25 60 30 40 Z" fill="#FFC72C" />
          <path d="M42 45 Q50 38 58 45 Q50 65 42 45 Z" fill="#0033A0" />
          <circle cx="38" cy="45" r="3" fill="#0033A0" />
          <circle cx="62" cy="45" r="3" fill="#0033A0" />
        </svg>
      </div>
    );
  }

  if (normalized.includes('positiva')) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-[#C8102E] text-white flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0 ${className}`} title="Positiva Compañía de Seguros">
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <path d="M50 12 L82 28 C82 60 50 86 50 86 C50 86 18 60 18 28 Z" fill="#C8102E" />
          <path d="M50 20 L74 33 C74 58 50 78 50 78 C50 78 26 58 26 33 Z" fill="#FFFFFF" />
          <path d="M45 35 L55 35 L55 45 L65 45 L65 55 L55 55 L55 65 L45 65 L45 55 L35 55 L35 45 L45 45 Z" fill="#C8102E" />
        </svg>
      </div>
    );
  }

  if (normalized.includes('bolivar')) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-[#00853F] text-white flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0 ${className}`} title="Seguros Bolívar">
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <circle cx="50" cy="50" r="38" fill="#00853F" />
          <circle cx="50" cy="50" r="30" fill="#00A34F" />
          <path d="M50 22 C65 22 78 35 78 50 C78 65 65 78 50 78 C35 78 22 65 22 50 C22 35 35 22 50 22 Z" fill="none" stroke="#FDB913" strokeWidth="6" />
          <text x="50" y="58" fontSize="24" fontWeight="900" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif">B</text>
        </svg>
      </div>
    );
  }

  if (normalized.includes('colpatria')) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-[#002B49] text-white flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0 ${className}`} title="AXA Colpatria">
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <rect x="15" y="15" width="70" height="70" rx="16" fill="#002B49" />
          <path d="M50 22 L76 50 L50 78 L24 50 Z" fill="#E21D24" />
          <path d="M50 32 L66 50 L50 68 L34 50 Z" fill="#FFFFFF" />
          <path d="M50 40 L58 50 L50 60 L42 50 Z" fill="#002B49" />
        </svg>
      </div>
    );
  }

  if (normalized.includes('colmena')) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-[#E65100] text-white flex items-center justify-center font-black shadow-sm overflow-hidden shrink-0 ${className}`} title="Colmena Seguros">
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <path d="M50 15 L80 32 L80 68 L50 85 L20 68 L20 32 Z" fill="#FFB300" />
          <path d="M50 23 L72 36 L72 64 L50 77 L28 64 L28 36 Z" fill="#E65100" />
          <ellipse cx="50" cy="50" rx="14" ry="18" fill="#FFC107" />
          <line x1="38" y1="44" x2="62" y2="44" stroke="#212121" strokeWidth="3" />
          <line x1="38" y1="52" x2="62" y2="52" stroke="#212121" strokeWidth="3" />
          <line x1="40" y1="60" x2="60" y2="60" stroke="#212121" strokeWidth="3" />
          <circle cx="45" cy="38" r="2" fill="#212121" />
          <circle cx="55" cy="38" r="2" fill="#212121" />
        </svg>
      </div>
    );
  }

  // Fallback for custom added ARLs
  return (
    <div className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm shrink-0 ${className}`}>
      {arlId.slice(0, 2).toUpperCase()}
    </div>
  );
}
