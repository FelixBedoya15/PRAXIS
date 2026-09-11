'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { UserProfile, AgencyProfile, UserRole } from '@/types';
import {
  getStoredAgencyProfile,
  saveStoredAgencyProfile,
  getStoredUserProfiles,
  saveStoredUserProfiles,
  getStoredActiveUserId,
  saveStoredActiveUserId,
  notifyProfileUpdated
} from '@/lib/storage';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'USER' | 'AGENCY' | 'LOGO';
}

export default function ProfileModal({ isOpen, onClose, defaultTab = 'USER' }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'USER' | 'AGENCY' | 'LOGO'>(defaultTab);

  // Agency state
  const [agency, setAgency] = useState<AgencyProfile>(getStoredAgencyProfile());
  const [logoPreview, setLogoPreview] = useState<string>('/praxis-logo.png');

  // Users state
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(getStoredUserProfiles());
  const [activeUserId, setActiveUserId] = useState<string>(getStoredActiveUserId());
  const [selectedUser, setSelectedUser] = useState<UserProfile>(userProfiles[0]);

  // Form feedback
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const loadedAgency = getStoredAgencyProfile();
      const loadedUsers = getStoredUserProfiles();
      const loadedActiveId = getStoredActiveUserId();

      setAgency(loadedAgency);
      setLogoPreview(loadedAgency.logoUrl || '/praxis-logo.png');
      setUserProfiles(loadedUsers);
      setActiveUserId(loadedActiveId);

      const found = loadedUsers.find((u) => u.id === loadedActiveId) || loadedUsers[0];
      setSelectedUser(found);
      setActiveTab(defaultTab);
      setSavedSuccess(null);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  // --- Handlers for User Profiles ---
  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser({ ...user });
  };

  const handleSaveActiveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = userProfiles.map((u) => (u.id === selectedUser.id ? selectedUser : u));
    setUserProfiles(updatedUsers);
    saveStoredUserProfiles(updatedUsers);

    // If saving the active user, refresh active ID
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

    // Limit to 2.5MB to keep localStorage lightweight
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

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-sm">
              <User size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                CONFIGURACIÓN INSTITUCIONAL & IDENTIDAD
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Gestión de Perfiles, Empresa & Logo
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

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <button
            onClick={() => setActiveTab('USER')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'USER'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User size={14} />
            <span>Perfil de Usuario</span>
          </button>

          <button
            onClick={() => setActiveTab('AGENCY')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'AGENCY'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 size={14} />
            <span>Datos de la Empresa</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGO')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'LOGO'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon size={14} />
            <span>Logo de la Empresa</span>
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
                        onClick={() => handleSelectUser(u)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30 shrink-0">
                            {u.initials || u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {u.roleTitle}
                            </span>
                          </div>
                        </div>

                        {isActive && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 ml-1"
                            title="Perfil activo en la sesión actual"
                          >
                            Activo
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form to Edit Selected User */}
              <form onSubmit={handleSaveActiveUser} className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Editando: {selectedUser.name}</span>
                    {selectedUser.id === activeUserId && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Perfil Activo en Sesión
                      </span>
                    )}
                  </h4>

                  <div className="flex items-center gap-2">
                    {selectedUser.id !== activeUserId && (
                      <button
                        type="button"
                        onClick={() => handleActivateUser(selectedUser.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                      >
                        <Check size={12} /> Activar Este Perfil
                      </button>
                    )}

                    {userProfiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        title="Eliminar este perfil"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={selectedUser.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const inits = val.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                        setSelectedUser({ ...selectedUser, name: val, initials: inits || 'US' });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Cargo / Título Profesional
                    </label>
                    <input
                      type="text"
                      value={selectedUser.roleTitle}
                      onChange={(e) => setSelectedUser({ ...selectedUser, roleTitle: e.target.value })}
                      placeholder="Ej. Director Técnico SST & Consultor"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Rol de Permisos en el Sistema
                    </label>
                    <select
                      value={selectedUser.roleType}
                      onChange={(e) => setSelectedUser({ ...selectedUser, roleType: e.target.value as UserRole })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="ADMIN">👑 Administrador General</option>
                      <option value="ANALISTA_FINANCIERO">💰 Analista Comisiones & PILA</option>
                      <option value="INGENIERO_SST">👷 Ingeniero / Consultor SG-SST</option>
                      <option value="MEDICO_LABORAL">🩺 Médico Laboral</option>
                      <option value="ASESOR_COMERCIAL">🤝 Asesor Comercial / Broker</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Licencia SST o Tarjeta Profesional (Opcional)
                    </label>
                    <input
                      type="text"
                      value={selectedUser.licenseSST || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, licenseSST: e.target.value })}
                      placeholder="Ej. Licencia SST Res. 14920 / COPNIA 25202"
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
                      placeholder="correo@praxisprevencion.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={selectedUser.phone || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                      placeholder="+57 300 000 0000"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} /> Guardar Cambios del Perfil
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: DATOS DE LA EMPRESA / AGENCIA */}
          {activeTab === 'AGENCY' && (
            <form onSubmit={handleSaveAgency} className="space-y-4">
              <div className="p-3 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                ℹ️ Esta información se refleja de manera automática en la cabecera principal, barra lateral, cartas de nombramiento de intermediación, cuentas de cobro y certificados RUI ante el Ministerio del Trabajo.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Razón Social Completa
                  </label>
                  <input
                    type="text"
                    value={agency.name}
                    onChange={(e) => setAgency({ ...agency, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Nombre Comercial Corto
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

                <div className="sm:col-span-2">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    value={agency.address || ''}
                    onChange={(e) => setAgency({ ...agency, address: e.target.value })}
                    placeholder="Calle 100 # 19-61 Edificio Capital Tower Of. 802"
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
          )}

          {/* TAB 3: LOGO DE LA EMPRESA */}
          {activeTab === 'LOGO' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                Puedes subir el logotipo oficial de tu empresa o agencia de seguros en formato PNG, JPG o SVG (fondo transparente recomendado). Este logo se aplicará de inmediato en el menú lateral, pantalla de inicio y en todos los documentos descargables o imprimibles.
              </div>

              {/* Previews: Light and Dark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Preview */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vista Previa (Fondo Claro / Documentos)
                  </span>
                  <div className="h-24 w-full flex items-center justify-center p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo Empresa"
                      className="max-h-20 max-w-[200px] object-contain"
                    />
                  </div>
                </div>

                {/* Dark Preview */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm text-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vista Previa (Fondo Oscuro / Menú)
                  </span>
                  <div className="h-24 w-full flex items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo Empresa"
                      className="max-h-20 max-w-[200px] object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Dropzone / Button */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  Haz clic para subir un nuevo logotipo
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos soportados: PNG con transparencia, JPG, WebP o SVG (máx. 2.5MB)
                </p>
              </div>

              {/* Reset to Default */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  ¿Deseas volver al logo predeterminado de PRAXIS?
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaultLogo}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Restaurar Logo Inicial
                </button>
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
