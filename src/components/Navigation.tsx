'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Calculator,
  Building2,
  HardHat,
  Stethoscope,
  FileCheck,
  Bot,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Wifi,
  WifiOff,
  Bell,
  Sparkles,
  Download,
  Menu,
  X,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  Layers,
  TrendingUp,
  User,
  Activity,
  Settings,
  Edit2,
} from 'lucide-react';
import { UserRole, AgencyProfile, UserProfile } from '@/types';
import {
  getStoredAgencyProfile,
  getStoredActiveUserProfile,
  saveStoredActiveUserId,
  getStoredUserProfiles,
  syncFromServer,
} from '@/lib/storage';
import ProfileModal from './ProfileModal';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [isOnline, setIsOnline] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Agency & User Profile States
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>(getStoredAgencyProfile());
  const [activeUser, setActiveUser] = useState<UserProfile>(getStoredActiveUserProfile());
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(getStoredUserProfiles());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<'USER' | 'AGENCY' | 'LOGO'>('USER');

  const openProfileModal = (tab: 'USER' | 'AGENCY' | 'LOGO' = 'USER') => {
    setProfileModalTab(tab);
    setShowProfileModal(true);
  };

  useEffect(() => {
    // Online / Offline handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Profile listener
    const refreshProfiles = () => {
      setAgencyProfile(getStoredAgencyProfile());
      const active = getStoredActiveUserProfile();
      setActiveUser(active);
      setUserProfiles(getStoredUserProfiles());
      setCurrentRole(active.roleType);
    };
    refreshProfiles();
    window.addEventListener('praxis_profile_updated', refreshProfiles);
    window.addEventListener('praxis_data_synced', refreshProfiles);

    // Initial server sync
    const triggerSync = async () => {
      const res = await syncFromServer();
      setIsDbConnected(res.connected);
    };
    triggerSync();
    const syncTimer = setInterval(triggerSync, 25000);
    window.addEventListener('focus', triggerSync);

    // Saved role
    const savedRole = localStorage.getItem('wappy_current_role_v1') as UserRole;
    if (savedRole) setCurrentRole(savedRole);

    // Saved theme
    const savedTheme = localStorage.getItem('wappy_theme_v1') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } else {
      document.documentElement.classList.add('dark');
    }

    // Saved collapsed state
    const savedCollapsed = localStorage.getItem('wappy_sidebar_collapsed');
    if (savedCollapsed === 'true') setIsCollapsed(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('praxis_profile_updated', refreshProfiles);
      window.removeEventListener('praxis_data_synced', refreshProfiles);
      window.removeEventListener('focus', triggerSync);
      clearInterval(syncTimer);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('wappy_theme_v1', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('wappy_sidebar_collapsed', String(nextState));
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('wappy_current_role_v1', role);
  };

  const navItems = [
    {
      href: '/',
      label: 'Panel Principal',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'INGENIERO_SST', 'MEDICO_LABORAL', 'ASESOR_COMERCIAL'],
    },
    {
      href: '/arl-config',
      label: 'Directorio y Matriz ARL',
      icon: Shield,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'ASESOR_COMERCIAL'],
    },
    {
      href: '/comisiones',
      label: 'Motor Comisiones & PILA',
      icon: Calculator,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO'],
    },
    {
      href: '/clientes',
      label: 'CRM & Pipeline Leads',
      icon: Building2,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'INGENIERO_SST', 'ASESOR_COMERCIAL'],
    },
    {
      href: '/campo-sst',
      label: 'Módulo de Campo SST',
      icon: HardHat,
      roles: ['ADMIN', 'INGENIERO_SST'],
    },
    {
      href: '/medico',
      label: 'Indicadores & Ausentismo SST',
      icon: Activity,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'INGENIERO_SST', 'MEDICO_LABORAL', 'ASESOR_COMERCIAL'],
    },
    {
      href: '/rui-mintrabajo',
      label: 'Registro RUI MinTrabajo',
      icon: FileCheck,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'INGENIERO_SST'],
    },
    {
      href: '/wappy-ia',
      label: 'PRAXIS IA & WhatsApp',
      icon: Bot,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO', 'INGENIERO_SST', 'MEDICO_LABORAL', 'ASESOR_COMERCIAL'],
    },
    {
      href: '/backup',
      label: 'Base de Datos & Backup',
      icon: Database,
      roles: ['ADMIN', 'ANALISTA_FINANCIERO'],
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200 print:h-auto print:w-full print:overflow-visible print:bg-white print:block">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-50 shadow-sm no-print print:hidden">
        <div
          onClick={() => openProfileModal('AGENCY')}
          className="flex items-center gap-2.5 cursor-pointer"
          title="Configurar Perfil & Empresa"
        >
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agencyProfile.logoUrl || '/praxis-logo.png'}
              alt={agencyProfile.shortName}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight tracking-tight">
              {agencyProfile.shortName}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">{agencyProfile.tagline}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Cambiar Modo Claro/Oscuro"
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile Menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) - Fixed full height */}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3 z-50 transition-all duration-300 shadow-xl md:shadow-none h-full shrink-0 no-print print:hidden ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 w-72 flex' : 'hidden md:flex'
        } ${isCollapsed ? 'md:w-20 md:p-2.5' : 'md:w-72'}`}
      >
        <div className="overflow-y-auto overflow-x-hidden pr-0.5 space-y-3">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-200 dark:border-slate-800/80">
            {(!isCollapsed || mobileMenuOpen) ? (
              <div
                onClick={() => openProfileModal('AGENCY')}
                className="flex items-center justify-between w-full group cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                title="Configurar datos de la empresa y logotipo"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="h-11 w-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={agencyProfile.logoUrl || '/praxis-logo.png'}
                      alt={agencyProfile.shortName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                        {agencyProfile.shortName}
                      </span>
                      <span className="text-[9px] uppercase font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {agencyProfile.suffix}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                      {agencyProfile.tagline}
                    </p>
                  </div>
                </div>

                <div className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity">
                  <Settings size={15} />
                </div>
              </div>
            ) : (
              <div
                onClick={() => openProfileModal('LOGO')}
                className="mx-auto flex flex-col items-center cursor-pointer group"
                title="Configurar logo de la empresa"
              >
                <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agencyProfile.logoUrl || '/praxis-logo.png'}
                    alt={agencyProfile.shortName}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Close button on mobile */}
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Role & Profile Switcher */}
          {(!isCollapsed || mobileMenuOpen) ? (
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <UserCheck size={12} className="text-blue-500 dark:text-blue-400" /> Perfil Activo
                </label>
                <button
                  type="button"
                  onClick={() => openProfileModal('USER')}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                >
                  <Edit2 size={10} /> Editar
                </button>
              </div>
              <select
                value={activeUser.id}
                onChange={(e) => {
                  const newUserId = e.target.value;
                  saveStoredActiveUserId(newUserId);
                  const found = userProfiles.find((u) => u.id === newUserId);
                  if (found) {
                    setActiveUser(found);
                    handleRoleChange(found.roleType);
                  }
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {userProfiles.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name} ({u.roleTitle.split('&')[0].trim()})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                onClick={() => openProfileModal('USER')}
                className="h-9 w-9 rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:scale-105 transition-transform"
                title={`Perfil Activo: ${activeUser.name} (${activeUser.roleTitle})`}
              >
                <UserCheck size={16} />
              </div>
            </div>
          )}

          {/* Navigation Links - Clean Minimalist */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const hasAccess = item.roles.includes(currentRole);

              if (isCollapsed && !mobileMenuOpen) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`h-11 w-11 mx-auto rounded-2xl flex items-center justify-center transition-all relative group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : hasAccess
                        ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'text-slate-300 dark:text-slate-700 opacity-50'
                    }`}
                  >
                    <Icon size={19} className="transition-transform group-hover:scale-110" />
                    {isActive && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white ring-2 ring-blue-600" />
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : hasAccess
                      ? 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      : 'text-slate-400 dark:text-slate-600 hover:text-slate-500 opacity-60'
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0'
                    }
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer & Status */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
              isCollapsed && !mobileMenuOpen ? 'h-10 w-10 mx-auto p-0' : ''
            }`}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} className="text-amber-400" />
                {(!isCollapsed || mobileMenuOpen) && <span>Modo Claro</span>}
              </>
            ) : (
              <>
                <Moon size={15} className="text-blue-600" />
                {(!isCollapsed || mobileMenuOpen) && <span>Modo Oscuro</span>}
              </>
            )}
          </button>

          {(!isCollapsed || mobileMenuOpen) ? (
            <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className={`flex items-center gap-1.5 font-medium ${isDbConnected ? 'text-emerald-600 dark:text-emerald-400' : isOnline ? 'text-sky-600 dark:text-sky-400' : 'text-amber-500'}`}>
                <span className={`h-2 w-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : isOnline ? 'bg-sky-500' : 'bg-amber-500'}`} />
                {isDbConnected ? 'PostgreSQL Activo' : isOnline ? 'Caché Local' : 'Offline'}
              </span>
              <span className="font-mono text-[10px] text-slate-400">Dokploy</span>
            </div>
          ) : (
            <div className="flex justify-center py-0.5" title={isDbConnected ? 'PostgreSQL Conectado y Sincronizado' : isOnline ? 'Modo Local / Esperando BD' : 'Modo Offline PWA'}>
              <span className={`h-2.5 w-2.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : isOnline ? 'bg-sky-500' : 'bg-amber-500'}`} />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200 print:overflow-visible print:h-auto print:bg-white print:p-0 print:m-0">
        {/* Top Header - Sticky */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-sm no-print print:hidden">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden md:block"
              title={isCollapsed ? 'Expandir menú lateral' : 'Ocultar panel y dejar solo iconos'}
            >
              {isCollapsed ? <PanelLeftOpen size={19} className="text-blue-600 dark:text-blue-400" /> : <PanelLeftClose size={19} />}
            </button>

            <div className="flex items-center gap-2 truncate">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Plataforma Integral de Intermediación
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
              title="Alternar Modo Claro / Modo Oscuro"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-blue-600" />
              )}
            </button>

            <Link
              href="/wappy-ia"
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
            >
              <Bot size={14} /> Asistente IA
            </Link>

            <Link
              href="/campo-sst"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
            >
              <HardHat size={14} /> <span className="hidden sm:inline">Nueva Visita</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:border-slate-800 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => openProfileModal('USER')}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer text-left"
              title={`Perfil: ${activeUser.name} (${activeUser.roleTitle}) - Clic para editar`}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white dark:bg-blue-500 flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-blue-500/20 group-hover:scale-105 transition-transform">
                {activeUser.initials || activeUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left text-xs">
                <span className="block font-semibold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {activeUser.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] block">
                  {activeUser.roleTitle.split('&')[0].trim()}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content with Fluid Responsive Padding */}
        <div className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-7 max-w-[1600px] w-full mx-auto animate-fade-in space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0">
          {children}
        </div>
      </main>

      {/* Global Profile & Corporate Identity Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        defaultTab={profileModalTab}
      />
    </div>
  );
}
