'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  User,
  Building2,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  Settings,
  Shield,
  Calculator,
  FileCheck,
  Database,
  Key,
  Bot,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { UserProfile, AgencyProfile, UserRole } from '@/types';
import {
  getStoredAgencyProfile,
  saveStoredAgencyProfile,
  getStoredUserProfiles,
  saveStoredUserProfiles,
  getStoredActiveUserId,
  saveStoredActiveUserId,
  getStoredGeminiKeys,
  saveStoredGeminiKeys,
  notifyProfileUpdated
} from '@/lib/storage';
import { extractKeyPool } from '@/lib/geminiRotator';

export type ProfileModalTab = 'USER' | 'GENERAL' | 'RUI' | 'DATABASE' | 'AI_KEYS' | 'AGENCY' | 'LOGO';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: ProfileModalTab;
}

export default function ProfileModal({ isOpen, onClose, defaultTab = 'USER' }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileModalTab>(defaultTab);

  // Agency state
  const [agency, setAgency] = useState<AgencyProfile>(getStoredAgencyProfile());
  const [logoPreview, setLogoPreview] = useState<string>('/praxis-logo.png');

  // Users state
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(getStoredUserProfiles());
  const [activeUserId, setActiveUserId] = useState<string>(getStoredActiveUserId());
  const [selectedUser, setSelectedUser] = useState<UserProfile>(userProfiles[0]);

  // AI Keys state
  const [rawGeminiKeys, setRawGeminiKeys] = useState<string>('');
  const [detectedKeysCount, setDetectedKeysCount] = useState<number>(0);

  // Form feedback
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const loadedAgency = getStoredAgencyProfile();
      const loadedUsers = getStoredUserProfiles();
      const loadedActiveId = getStoredActiveUserId();
      const loadedKeys = getStoredGeminiKeys();

      setAgency(loadedAgency);
      setLogoPreview(loadedAgency.logoUrl || '/praxis-logo.png');
      setUserProfiles(loadedUsers);
      setActiveUserId(loadedActiveId);

      const found = loadedUsers.find((u) => u.id === loadedActiveId) || loadedUsers[0];
      setSelectedUser(found);
      setActiveTab(defaultTab);
      setSavedSuccess(null);

      setRawGeminiKeys(loadedKeys);
      setDetectedKeysCount(extractKeyPool(loadedKeys).length);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  // --- Handlers for User Profiles ---
  const handleSaveActiveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = userProfiles.map((u) => (u.id === selectedUser.id ? selectedUser : u));
    setUserProfiles(updatedUsers);
    saveStoredUserProfiles(updatedUsers);

    if (selectedUser.id === activeUserId) {
      saveStoredActiveUserId(selectedUser.id);
      localStorage.setItem('wappy_current_role_v1', selectedUser.roleType);
    }

    notifyProfileUpdated();
    showNotification(`✓ Perfil de "${selectedUser.name}" guardado exitosamente`);
  };

  const handleActivateUser = (userId: string) => {
    setActiveUserId(userId);
    saveStoredActiveUserId(userId);
    const user = userProfiles.find((u) => u.id === userId);
    if (user) {
      localStorage.setItem('wappy_current_role_v1', user.roleType);
      showNotification(`👑 Ahora operando como: ${user.name} (${user.roleTitle})`);
    }
    notifyProfileUpdated();
  };

  const handleCreateNewUser = () => {
    const newId = `user-${Date.now().toString().slice(-4)}`;
    const newUser: UserProfile = {
      id: newId,
      name: 'Nuevo Asesor / Profesional',
      roleTitle: 'Especialista en Seguros & SST',
      roleType: 'ASESOR_COMERCIAL',
      licenseSST: '',
      email: '',
      phone: '',
      initials: 'NA',
    };
    const updated = [...userProfiles, newUser];
    setUserProfiles(updated);
    saveStoredUserProfiles(updated);
    setSelectedUser(newUser);
    setActiveUserId(newId);
    saveStoredActiveUserId(newId);
    notifyProfileUpdated();
    showNotification('✨ Nuevo perfil de usuario creado. Completa sus datos a continuación.');
  };

  const handleDeleteUser = (userId: string) => {
    if (userProfiles.length <= 1) {
      alert('Debe existir al menos un perfil de usuario registrado.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este perfil de usuario?')) {
      const updated = userProfiles.filter((u) => u.id !== userId);
      setUserProfiles(updated);
      saveStoredUserProfiles(updated);

      if (activeUserId === userId) {
        const nextActive = updated[0];
        setActiveUserId(nextActive.id);
        saveStoredActiveUserId(nextActive.id);
        setSelectedUser(nextActive);
      } else if (selectedUser.id === userId) {
        setSelectedUser(updated[0]);
      }
      notifyProfileUpdated();
      showNotification('Perfil de usuario eliminado.');
    }
  };

  // --- Handlers for Agency Data ---
  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredAgencyProfile(agency);
    notifyProfileUpdated();
    showNotification('✓ Información de la empresa actualizada en todo el sistema');
  };

  // --- Handlers for Logo Upload ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      alert('La imagen no debe superar los 2.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLogoPreview(base64);
        const updatedAgency = { ...agency, logoUrl: base64 };
        setAgency(updatedAgency);
        saveStoredAgencyProfile(updatedAgency);
        notifyProfileUpdated();
        showNotification('🎉 ¡Logo actualizado con éxito en toda la plataforma!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultLogo = () => {
    const defaultLogo = '/praxis-logo.png';
    setLogoPreview(defaultLogo);
    const updatedAgency = { ...agency, logoUrl: defaultLogo };
    setAgency(updatedAgency);
    saveStoredAgencyProfile(updatedAgency);
    notifyProfileUpdated();
    showNotification('Logo restaurado al diseño institucional predeterminado');
  };

  // --- Handlers for Gemini AI Keys ---
  const handleSaveGeminiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredGeminiKeys(rawGeminiKeys);
    const count = extractKeyPool(rawGeminiKeys).length;
    setDetectedKeysCount(count);
    showNotification(`🤖 ¡Pool de Gemini guardado! (${count} claves activas en rotación dual-axis)`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-sm">
              <Settings size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                ADMINISTRACIÓN & CENTRO DE CONTROL
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Perfil de Usuario & Configuración General
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation - Enhanced Responsive Bar */}
        <div className="px-4 sm:px-6 pt-2 border-b border-slate-200 dark:border-slate-800 flex gap-1 sm:gap-2 bg-slate-50 dark:bg-slate-950/60 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('USER')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'USER'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User size={13} />
            <span>Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('GENERAL')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'GENERAL'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield size={13} className="text-blue-500" />
            <span>General (ARL & PILA)</span>
          </button>

          <button
            onClick={() => setActiveTab('RUI')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'RUI'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCheck size={13} className="text-emerald-500" />
            <span>Registro RUI</span>
          </button>

          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'DATABASE'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database size={13} className="text-indigo-500" />
            <span>Base de Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('AI_KEYS')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'AI_KEYS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Key size={13} className="text-amber-500" />
            <span>Claves IA (Gemini)</span>
          </button>

          <button
            onClick={() => setActiveTab('AGENCY')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'AGENCY'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 size={13} />
            <span>Empresa & Logo</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {savedSuccess && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        {/* Modal Content Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PERFILES DE USUARIO */}
          {activeTab === 'USER' && (
            <div className="space-y-4">
              {/* Profile Selector Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Seleccionar o Crear Perfil de Usuario ({userProfiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateNewUser}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-sm transition-all"
                  >
                    <Plus size={12} /> Nuevo Perfil
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {userProfiles.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    const isActive = activeUserId === u.id;

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUser({ ...u })}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {u.initials || u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {u.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                              {u.roleTitle.split('&')[0].trim()}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0 border border-emerald-500/30">
                            Activo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateUser(u.id);
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-semibold transition-colors shrink-0"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Edit Active Profile Form */}
              {selectedUser && (
                <form onSubmit={handleSaveActiveUser} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>✏️ Editando Perfil:</span>
                      <span className="text-blue-600 dark:text-blue-400">{selectedUser.name}</span>
                    </h4>

                    {userProfiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Eliminar este perfil
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={selectedUser.name}
                        onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Cargo o Título Profesional
                      </label>
                      <input
                        type="text"
                        value={selectedUser.roleTitle}
                        onChange={(e) => setSelectedUser({ ...selectedUser, roleTitle: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Rol Operativo en el Sistema
                      </label>
                      <select
                        value={selectedUser.roleType}
                        onChange={(e) => setSelectedUser({ ...selectedUser, roleType: e.target.value as UserRole })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="ADMIN">Director / Administrador General (Acceso Total)</option>
                        <option value="ANALISTA_FINANCIERO">Analista Financiero & PILA (Comisiones y Cartera)</option>
                        <option value="INGENIERO_SST">Ingeniero SST / Auditor 0312 (Visitas y Campo)</option>
                        <option value="MEDICO_LABORAL">Médico Especialista SST (Ausentismo y FURAT)</option>
                        <option value="ASESOR_COMERCIAL">Asesor Comercial (Pipeline Leads y Cartas)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Licencia SST / Tarjeta Profesional
                      </label>
                      <input
                        type="text"
                        value={selectedUser.licenseSST || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, licenseSST: e.target.value })}
                        placeholder="Ej. Res. 14920 de MinSalud"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={selectedUser.email || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                        placeholder="usuario@praxisprevencion.com"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Teléfono Móvil
                      </label>
                      <input
                        type="text"
                        value={selectedUser.phone || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                        placeholder="(+57) 300 000 0000"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                    >
                      <Check size={14} /> Guardar Perfil de Usuario
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: GENERAL (ARL & MOTOR DE COMISIONES) */}
          {activeTab === 'GENERAL' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  ⚙️ CONFIGURACIÓN GENERAL DEL NEGOCIO
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Desde aquí administras los convenios de intermediación con las ARLs autorizadas en Colombia, las matrices porcentuales de comisión por clase de riesgo y los parámetros del motor de liquidación PILA.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Directorio & Matriz de ARL */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <Shield size={16} />
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Directorio y Matriz de ARL
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Configura las comisiones comerciales para **ARL SURA**, **Positiva Compañía de Seguros**, **AXA Colpatria** y **Seguros Bolívar** según concepto (Empresa Nueva, Nombramiento o Cambio de Intermediario).
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">SURA</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">Positiva</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">AXA Colpatria</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Bolívar</span>
                    </div>
                  </div>

                  <Link
                    href="/arl-config"
                    onClick={onClose}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <span>Configurar Matriz de ARL</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {/* Card 2: Motor de Comisiones PILA */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Calculator size={16} />
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Motor de Comisiones & PILA
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Gestión de liquidación de aportes, retención en la fuente del 10% (Art. 392 E.T.), exclusión de IVA (Sentencia C-049/2022) y bolsa de retorno técnico pactado con cada cliente.
                    </p>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] space-y-0.5 text-slate-500 font-mono">
                      <div>• Retención en la fuente: <strong>10.0%</strong></div>
                      <div>• IVA Intermediación: <strong>0% Excluido</strong></div>
                      <div>• Cruce Bolsa SST en tiempo real</div>
                    </div>
                  </div>

                  <Link
                    href="/comisiones"
                    onClick={onClose}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <span>Abrir Motor de Comisiones</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRO RUI MINTRABAJO */}
          {activeTab === 'RUI' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  📜 REGISTRO ÚNICO DE INTERMEDIARIOS (RUI)
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Acreditación de idoneidad profesional ante el Ministerio del Trabajo de Colombia, póliza de responsabilidad civil extracontractual y bitácora de horas técnicas de prevención SG-SST.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Certificación RUI Institucional
                    </h4>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> Acreditación Vigente ante MinTrabajo
                    </span>
                  </div>

                  <Link
                    href="/rui-mintrabajo"
                    onClick={onClose}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <span>Abrir Módulo RUI Completo</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Póliza RCE:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">Seguros del Estado</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Vigente 2026-2027</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Director Técnico:</span>
                    <strong className="text-slate-800 dark:text-slate-200">Ing. Félix Bedoya</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Lic. SST 14920</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Médico Especialista:</span>
                    <strong className="text-slate-800 dark:text-slate-200">Dra. Marcela Salazar</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Reg. Médico 8841</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BASE DE DATOS & SINCRONIZACIÓN */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  🗄️ BASE DE DATOS & SINCRONIZACIÓN
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Supervisión del almacenamiento relacional, exportación de copias de seguridad completas en formato JSON y conexión con el contenedor PostgreSQL de Dokploy.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Consola de Backups & PostgreSQL
                    </h4>
                    <p className="text-xs text-slate-500">
                      Exporta tu información o restablece los datos en caso de contingencia.
                    </p>
                  </div>

                  <Link
                    href="/backup"
                    onClick={onClose}
                    className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <span>Ir a Consola de Base de Datos</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Estructura Persistente:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <span className="text-blue-600 dark:text-blue-400">• Clientes CRM</span>
                    <span className="text-emerald-600 dark:text-emerald-400">• Planillas PILA</span>
                    <span className="text-amber-600 dark:text-amber-400">• Visitas SST</span>
                    <span className="text-rose-600 dark:text-rose-400">• Casos Médicos</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLAVES IA (GEMINI DUAL-AXIS ROTATION) */}
          {activeTab === 'AI_KEYS' && (
            <form onSubmit={handleSaveGeminiKeys} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles size={13} /> POOL DE ROTACIÓN DE CLAVES GEMINI (LIBRECHAT STYLE)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px]">
                    {detectedKeysCount} {detectedKeysCount === 1 ? 'Clave activa' : 'Claves activas'}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Ingresa tus claves API de Google AI Studio. PRAXIS IA implementa el sistema de **rotación dual-axis de LibreChat-WAPPY**: si una clave agota su cuota (429) o expira (403), rota automáticamente a la siguiente clave; y si el modelo se sobrecarga (503), conmuta a modelos de contingencia (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                    <Key size={13} className="text-amber-500" /> Claves API de Google Gemini (separadas por comas o saltos de línea)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    AI Studio (Gratis)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={rawGeminiKeys}
                  onChange={(e) => {
                    setRawGeminiKeys(e.target.value);
                    setDetectedKeysCount(extractKeyPool(e.target.value).length);
                  }}
                  placeholder="AIzaSyA..., AIzaSyB..., AIzaSyC..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Puedes pegar múltiples claves de Google AI Studio separadas por comas o una por línea. Las claves se almacenan de forma segura y se sincronizan con tu servidor Dokploy.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Mapeo de Modelos de Contingencia Automática:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-blue-500 font-bold block">1. Principal</span>
                    <span className="text-slate-600 dark:text-slate-300">gemini-2.5-flash</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-indigo-500 font-bold block">2. Fallback</span>
                    <span className="text-slate-600 dark:text-slate-300">gemini-2.0-flash</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-emerald-500 font-bold block">3. Fallback</span>
                    <span className="text-slate-600 dark:text-slate-300">gemini-1.5-flash</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-purple-500 font-bold block">4. Razonamiento</span>
                    <span className="text-slate-600 dark:text-slate-300">gemini-1.5-pro</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check size={14} /> Guardar Claves y Activar Rotación
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: DATOS DE LA EMPRESA & LOGO */}
          {activeTab === 'AGENCY' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveAgency} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Razón Social Completa de la Agencia
                    </label>
                    <input
                      type="text"
                      value={agency.name}
                      onChange={(e) => setAgency({ ...agency, name: e.target.value })}
                      placeholder="Ej. PRAXIS PREVENCIÓN Y SEGUROS"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Nombre Corto o Comercial
                    </label>
                    <input
                      type="text"
                      value={agency.shortName}
                      onChange={(e) => setAgency({ ...agency, shortName: e.target.value })}
                      placeholder="Ej. PRAXIS"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-extrabold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Tipo Societario (Sufijo)
                    </label>
                    <input
                      type="text"
                      value={agency.suffix}
                      onChange={(e) => setAgency({ ...agency, suffix: e.target.value })}
                      placeholder="Ej. LTDA. o S.A.S."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Lema o Actividad Principal
                    </label>
                    <input
                      type="text"
                      value={agency.tagline}
                      onChange={(e) => setAgency({ ...agency, tagline: e.target.value })}
                      placeholder="Ej. Prevención y Seguros"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      NIT de la Agencia
                    </label>
                    <input
                      type="text"
                      value={agency.nit}
                      onChange={(e) => setAgency({ ...agency, nit: e.target.value })}
                      placeholder="Ej. 901.884.200-1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Registro RUI Ministerio del Trabajo
                    </label>
                    <input
                      type="text"
                      value={agency.ruiNumber}
                      onChange={(e) => setAgency({ ...agency, ruiNumber: e.target.value })}
                      placeholder="Ej. RUI-MINTRABAJO-2024-8849"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Teléfono PBX o Celular
                    </label>
                    <input
                      type="text"
                      value={agency.phone || ''}
                      onChange={(e) => setAgency({ ...agency, phone: e.target.value })}
                      placeholder="(+57) 314 884 9200"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Correo Corporativo
                    </label>
                    <input
                      type="email"
                      value={agency.email || ''}
                      onChange={(e) => setAgency({ ...agency, email: e.target.value })}
                      placeholder="gerencia@praxisprevencion.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Ciudad Sede Principal
                    </label>
                    <input
                      type="text"
                      value={agency.city || ''}
                      onChange={(e) => setAgency({ ...agency, city: e.target.value })}
                      placeholder="Bogotá D.C."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} /> Guardar Datos de la Empresa
                  </button>
                </div>
              </form>

              {/* Logo Management Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" /> Logotipo de la Empresa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center h-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo" className="max-h-16 max-w-full object-contain" />
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center justify-center"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />
                    <Upload size={16} className="text-blue-500 mb-1" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Subir nuevo logo
                    </span>
                    <span className="text-[9px] text-slate-400">PNG, JPG, SVG</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDefaultLogo}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Restaurar logo predeterminado
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
