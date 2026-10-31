'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getSettings, AppSettings } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const data = await getSettings();
        if (isMounted) {
          setSettings(data);
          setIsBackendHealthy(true);
        }
      } catch {
        if (isMounted) {
          setIsBackendHealthy(false);
        }
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Compass },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 flex items-center justify-center p-0.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Pathwise Logo" 
                width={40} 
                height={40} 
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Pathwise</span>
              <span className="hidden sm:inline-block ml-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                AI Learning
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Backend Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
            {isBackendHealthy === true ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700">API Connected</span>
                {settings && (
                  <span className="text-slate-400 border-l border-slate-200 pl-1.5 uppercase font-mono text-[10px]">
                    {settings.ai_provider}
                  </span>
                )}
              </>
            ) : isBackendHealthy === false ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-700">Connecting...</span>
              </>
            ) : (
              <span className="text-slate-400">Checking...</span>
            )}
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-medium text-xs flex items-center justify-center ring-2 ring-indigo-100">
              DS
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800">Demo Student</div>
              <div className="text-[11px] text-slate-500">Self-Paced Learner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
