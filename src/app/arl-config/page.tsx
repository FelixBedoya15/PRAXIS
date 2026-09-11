'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Percent,
  Calculator,
  Save,
  RotateCcw,
  Plus,
  Check,
  Building2,
  ExternalLink,
  Phone,
  Mail,
  Info,
  Sparkles,
  ArrowRight,
  X,
  Trash2,
  Globe,
  Edit3,
  Upload,
  Image as ImageIcon,
  Search,
  Tag
} from 'lucide-react';
import { getStoredARLs, saveStoredARLs } from '@/lib/storage';
import { ARLCompany, CommissionConcept, RiskClass, RISK_RATES } from '@/types';
import { INITIAL_ARLS } from '@/lib/data';
import ARLLogo from '@/components/ARLLogo';

const CONCEPTS: { key: CommissionConcept; label: string; icon: string; description: string }[] = [
  { key: 'EMPRESA_NUEVA', label: 'Empresa Nueva', icon: '🆕', description: 'Primera afiliación de la empresa a esta ARL o al sistema de riesgos' },
  { key: 'CAMBIO_INTERMEDIARIO', label: 'Cambio de Intermediario', icon: '🔄', description: 'Empresa en la misma ARL que sustituye o revoca su intermediario anterior' },
  { key: 'NOMBRAMIENTO', label: 'Nombramiento de Intermediario', icon: '📜', description: 'Empresa ya en la ARL sin intermediario que designa a la agencia' },
];

const RISK_CLASSES: RiskClass[] = ['CLASE_I', 'CLASE_II', 'CLASE_III', 'CLASE_IV', 'CLASE_V'];

export default function ARLConfigPage() {
  const [arls, setArls] = useState<ARLCompany[]>([]);
  const [selectedArlId, setSelectedArlId] = useState<string>('positiva');
  const [activeConcept, setActiveConcept] = useState<CommissionConcept>('EMPRESA_NUEVA');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit Existing ARL Modal State
  const [editingArl, setEditingArl] = useState<ARLCompany | null>(null);

  // New ARL Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newArlName, setNewArlName] = useState('');
  const [newArlShortName, setNewArlShortName] = useState('');
  const [newArlCode, setNewArlCode] = useState('');
  const [newArlPhone, setNewArlPhone] = useState('018000 000 000');
  const [newArlWebsite, setNewArlWebsite] = useState('https://');
  const [newArlNotes, setNewArlNotes] = useState('Convenio comercial de intermediación.');
  const [newArlLogo, setNewArlLogo] = useState<string>('');

  // Simulator state
  const [simulatedIbc, setSimulatedIbc] = useState<number>(150000000);
  const [simulatedRisk, setSimulatedRisk] = useState<RiskClass>('CLASE_V');
  const [simulatedConcept, setSimulatedConcept] = useState<CommissionConcept>('EMPRESA_NUEVA');
  const [simulatedActivityId, setSimulatedActivityId] = useState<string>('');

  // Sub-filter for Economic Activities
  const [activityRiskFilter, setActivityRiskFilter] = useState<'TODAS' | RiskClass>('TODAS');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newActRiskClass, setNewActRiskClass] = useState<RiskClass>('CLASE_V');
  const [newActCiiu, setNewActCiiu] = useState('');
  const [newActName, setNewActName] = useState('');
  const [newActRate, setNewActRate] = useState<number>(9.0);
  const [newActNotes, setNewActNotes] = useState('');

  useEffect(() => {
    const data = getStoredARLs();
    if (data && data.length > 0) {
      setArls(data);
      if (!data.some((a) => a.id === selectedArlId)) {
        setSelectedArlId(data[0].id);
      }
    } else {
      setArls(INITIAL_ARLS);
      setSelectedArlId('positiva');
      saveStoredARLs(INITIAL_ARLS);
    }
  }, []);

  const selectedArl = arls.find((a) => a.id === selectedArlId) || arls[0];

  const handleRateChange = (concept: CommissionConcept, risk: RiskClass, value: number) => {
    if (!selectedArl) return;
    const updatedMatrix = {
      ...selectedArl.defaultCommissionMatrix,
      [concept]: {
        ...selectedArl.defaultCommissionMatrix[concept],
        [risk]: value,
      },
    };

    const updatedArls = arls.map((a) =>
      a.id === selectedArl.id ? { ...a, defaultCommissionMatrix: updatedMatrix } : a
    );

    setArls(updatedArls);
    saveStoredARLs(updatedArls);
    triggerSaveBadge();
  };

  const triggerSaveBadge = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Deseas restaurar las 5 ARLs oficiales con sus logos y matrices predeterminadas?')) {
      setArls(INITIAL_ARLS);
      setSelectedArlId('positiva');
      saveStoredARLs(INITIAL_ARLS);
      triggerSaveBadge();
    }
  };

  // Upload Logo File Handler (Converts to Base64)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNewArl: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (isNewArl) {
          setNewArlLogo(reader.result);
        } else if (editingArl) {
          setEditingArl({ ...editingArl, logo: reader.result });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedArl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArl) return;

    const updated = arls.map((a) => (a.id === editingArl.id ? editingArl : a));
    setArls(updated);
    saveStoredARLs(updated);
    setEditingArl(null);
    triggerSaveBadge();
  };

  const handleCreateArl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArlName.trim() || !newArlShortName.trim()) return;

    const id = newArlShortName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newEntity: ARLCompany = {
      id,
      name: newArlName.trim(),
      shortName: newArlShortName.trim(),
      superintendenciaCode: newArlCode.trim() || '14-99',
      code: newArlCode.trim() || '14-99',
      phone: newArlPhone.trim(),
      supportPhone: newArlPhone.trim(),
      website: newArlWebsite.trim(),
      logo: newArlLogo.trim() || undefined,
      status: 'ACTIVA',
      commissionRegime: 'GASTOS_ADMINISTRACION',
      notes: newArlNotes.trim(),
      defaultCommissionMatrix: {
        EMPRESA_NUEVA: { CLASE_I: 7.5, CLASE_II: 8.0, CLASE_III: 8.5, CLASE_IV: 9.0, CLASE_V: 9.0 },
        NOMBRAMIENTO: { CLASE_I: 5.5, CLASE_II: 6.0, CLASE_III: 6.5, CLASE_IV: 7.0, CLASE_V: 7.5 },
        CAMBIO_INTERMEDIARIO: { CLASE_I: 6.5, CLASE_II: 7.0, CLASE_III: 7.5, CLASE_IV: 8.0, CLASE_V: 8.5 },
      },
    };

    const updated = [...arls, newEntity];
    setArls(updated);
    saveStoredARLs(updated);
    setSelectedArlId(id);
    setShowNewModal(false);
    triggerSaveBadge();

    // Reset form
    setNewArlName('');
    setNewArlShortName('');
    setNewArlCode('');
    setNewArlLogo('');
  };

  // Economic Activities Handlers
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArl || !newActName.trim()) return;

    const newActivity = {
      id: `act-${Date.now()}`,
      riskClass: newActRiskClass,
      ciiuCode: newActCiiu.trim() || undefined,
      activityName: newActName.trim(),
      commissionRate: newActRate,
      notes: newActNotes.trim() || undefined,
    };

    const currentActs = selectedArl.economicActivityCommissions || [];
    const updatedActs = [...currentActs, newActivity];

    const updatedArls = arls.map((a) =>
      a.id === selectedArl.id ? { ...a, economicActivityCommissions: updatedActs } : a
    );

    setArls(updatedArls);
    saveStoredARLs(updatedArls);
    triggerSaveBadge();
    setShowAddActivityModal(false);
    setNewActName('');
    setNewActCiiu('');
    setNewActNotes('');
  };

  const handleDeleteActivity = (actId: string) => {
    if (!selectedArl) return;
    if (confirm('¿Deseas eliminar esta actividad económica de la matriz de la ARL?')) {
      const updatedActs = (selectedArl.economicActivityCommissions || []).filter((a) => a.id !== actId);
      const updatedArls = arls.map((a) =>
        a.id === selectedArl.id ? { ...a, economicActivityCommissions: updatedActs } : a
      );
      setArls(updatedArls);
      saveStoredARLs(updatedArls);
      triggerSaveBadge();
    }
  };

  const handleUpdateActivityRate = (actId: string, newRate: number) => {
    if (!selectedArl) return;
    const updatedActs = (selectedArl.economicActivityCommissions || []).map((a) =>
      a.id === actId ? { ...a, commissionRate: newRate } : a
    );
    const updatedArls = arls.map((a) =>
      a.id === selectedArl.id ? { ...a, economicActivityCommissions: updatedActs } : a
    );
    setArls(updatedArls);
    saveStoredARLs(updatedArls);
    triggerSaveBadge();
  };

  const handleDeleteArl = (idToDelete: string) => {
    if (arls.length <= 1) {
      alert('Debe existir al menos una ARL configurada.');
      return;
    }
    if (confirm(`¿Deseas eliminar la ARL seleccionada?`)) {
      const updated = arls.filter((a) => a.id !== idToDelete);
      setArls(updated);
      saveStoredARLs(updated);
      if (selectedArlId === idToDelete) {
        setSelectedArlId(updated[0].id);
      }
      triggerSaveBadge();
    }
  };

  // Simulator calculations
  const riskDef = RISK_RATES[simulatedRisk];
  const arlContribution = simulatedIbc * riskDef.nominalRate;
  const matchingActivity = (selectedArl?.economicActivityCommissions || []).find((a) => a.id === simulatedActivityId);
  const currentRatePercentage = matchingActivity
    ? matchingActivity.commissionRate
    : (selectedArl?.defaultCommissionMatrix[simulatedConcept]?.[simulatedRisk] || 0);
  const estimatedCommission = arlContribution * (currentRatePercentage / 100);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-full animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
              DIRECTORIO DE ENTIDADES ARL
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {arls.length} ARLs Habilitadas (Decreto Ley 1295 / Ley 1562)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Parametrización de ARLs & Escalas de Comisiones
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Gestiona acuerdos comerciales, logos oficiales y personalizados, y porcentajes de reconocimiento sobre gastos de administración.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 animate-fade-in shadow-sm">
              <Check size={14} /> Guardado
            </span>
          )}
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus size={14} /> Nueva ARL
          </button>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
          >
            <RotateCcw size={14} /> Restaurar 5 ARLs
          </button>
        </div>
      </div>

      {/* ARL Selector Cards - Small Compact 5 Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {arls.map((arl) => {
          const isSelected = arl.id === selectedArlId;
          const code = arl.superintendenciaCode || arl.code || '14-XX';
          return (
            <button
              key={arl.id}
              onClick={() => setSelectedArlId(arl.id)}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between relative group shadow-sm min-h-[92px] ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="mb-1 group-hover:scale-105 transition-transform flex items-center justify-center">
                <ARLLogo arlId={arl.id} customLogo={arl.logo} size="sm" />
              </div>
              <span
                className={`text-[11px] sm:text-xs font-bold block truncate w-full ${
                  isSelected ? 'text-blue-600 dark:text-blue-300 font-black' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {arl.shortName}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Cód: {code}
              </span>
              {isSelected && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-950" />
              )}
            </button>
          );
        })}
      </div>

      {selectedArl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Matrix Editor (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Selected ARL Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div className="flex items-center gap-3.5">
                  <ARLLogo arlId={selectedArl.id} customLogo={selectedArl.logo} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {selectedArl.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {selectedArl.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Código MinSalud: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedArl.superintendenciaCode || selectedArl.code}</span> • Tel: {selectedArl.phone || selectedArl.supportPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* EDIT ARL BUTTON */}
                  <button
                    onClick={() => setEditingArl(selectedArl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition-all shadow-sm border border-blue-200 dark:border-blue-800"
                    title="Editar información institucional, líneas de soporte y logo"
                  >
                    <Edit3 size={13} /> Editar
                  </button>

                  <div className="text-left sm:text-right hidden sm:block">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Régimen Comisiones</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Gastos Administración ARL</span>
                  </div>

                  {/* Delete button if custom ARL */}
                  {!['sura', 'positiva', 'bolivar', 'colpatria', 'colmena'].includes(selectedArl.id) && (
                    <button
                      onClick={() => handleDeleteArl(selectedArl.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                      title="Eliminar esta ARL personalizada"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Concept Selector Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  1. Selecciona el Concepto de Vinculación / Negocio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CONCEPTS.map((c) => {
                    const isConceptActive = activeConcept === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setActiveConcept(c.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isConceptActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <span>{c.icon}</span>
                          <span>{c.label}</span>
                        </div>
                        <p
                          className={`text-[10px] mt-1 line-clamp-1 ${
                            isConceptActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {c.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission Matrix by Risk Class Table */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    2. Escala de Porcentajes por Clase de Riesgo
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Info size={13} className="text-blue-500" /> Edición en tiempo real
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                        <th className="py-3 px-4">Clase de Riesgo</th>
                        <th className="py-3 px-4">Tasa Cotización ARL</th>
                        <th className="py-3 px-4">Sectores Típicos</th>
                        <th className="py-3 px-4 text-right">Comisión Intermediario (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {RISK_CLASSES.map((risk) => {
                        const rDef = RISK_RATES[risk];
                        const currentRate = selectedArl.defaultCommissionMatrix[activeConcept]?.[risk] || 0;

                        return (
                          <tr key={risk} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                              {rDef.label}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {rDef.percentageText}
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                              {rDef.description}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="15"
                                  value={currentRate}
                                  onChange={(e) =>
                                    handleRateChange(activeConcept, risk, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="font-bold text-slate-400">%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* 3. Sub-filtro por Actividad Económica por Clase de Riesgo */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        SUB-FILTRO POR ACTIVIDAD ECONÓMICA
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">Decreto 768 / 2022</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                      3. Comisiones por Actividad Económica & CIIU por Clase de Riesgo
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Permite diferenciar el porcentaje de comisión para sectores específicos de {selectedArl.shortName}. Si el cliente tiene esta actividad, se liquidará automáticamente con esta tasa preferencial.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewActRiskClass(activityRiskFilter === 'TODAS' ? 'CLASE_V' : activityRiskFilter);
                      setShowAddActivityModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 self-start sm:self-center shrink-0"
                  >
                    <Plus size={14} /> <span>Agregar Actividad Económica</span>
                  </button>
                </div>

                {/* Risk Class Sub-Filter Pills & Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setActivityRiskFilter('TODAS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        activityRiskFilter === 'TODAS'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Todas ({selectedArl.economicActivityCommissions?.length || 0})
                    </button>
                    {RISK_CLASSES.map((r) => {
                      const count = (selectedArl.economicActivityCommissions || []).filter((a) => a.riskClass === r).length;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setActivityRiskFilter(r)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            activityRiskFilter === r
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span>{RISK_RATES[r].label.split(' ')[0]} {RISK_RATES[r].label.split(' ')[1]}</span>
                          {count > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              activityRiskFilter === r
                                ? 'bg-white text-blue-600 font-black'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative sm:w-60 shrink-0">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar CIIU o actividad..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Table of Economic Activities */}
                {(() => {
                  const filteredActivities = (selectedArl.economicActivityCommissions || []).filter((act) => {
                    const matchesRisk = activityRiskFilter === 'TODAS' || act.riskClass === activityRiskFilter;
                    const q = activitySearchTerm.toLowerCase();
                    const matchesSearch =
                      !q ||
                      (act.ciiuCode && act.ciiuCode.toLowerCase().includes(q)) ||
                      act.activityName.toLowerCase().includes(q) ||
                      (act.notes && act.notes.toLowerCase().includes(q));
                    return matchesRisk && matchesSearch;
                  });

                  if (filteredActivities.length === 0) {
                    return (
                      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                        <Tag size={24} className="mx-auto text-slate-400" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No hay actividades económicas específicas registradas para este filtro en {selectedArl.shortName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Puedes agregar actividades económicas especiales haciendo clic en el botón superior.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[11px]">
                            <th className="py-2.5 px-3">Clase</th>
                            <th className="py-2.5 px-3">Cód. CIIU</th>
                            <th className="py-2.5 px-3">Actividad Económica / Sector</th>
                            <th className="py-2.5 px-3">Notas / Convenio</th>
                            <th className="py-2.5 px-3 text-right">% Comisión</th>
                            <th className="py-2.5 px-3 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {filteredActivities.map((act) => {
                            const riskBadgeColor =
                              act.riskClass === 'CLASE_V'
                                ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                                : act.riskClass === 'CLASE_IV'
                                ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                                : act.riskClass === 'CLASE_III'
                                ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                                : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';

                            return (
                              <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${riskBadgeColor}`}>
                                    {act.riskClass.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {act.ciiuCode || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-xs">
                                  {act.activityName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[200px] truncate">
                                  {act.notes || 'Convenio general'}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="15"
                                      value={act.commissionRate}
                                      onChange={(e) =>
                                        handleUpdateActivityRate(act.id, parseFloat(e.target.value) || 0)
                                      }
                                      className="w-16 text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="font-bold text-slate-400">%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                    title="Eliminar actividad económica"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          {/* Sidebar / Live Simulator (1 Col) */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold">
                  <Calculator size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Simulador de Comisión en Vivo</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Calculado para {selectedArl.shortName}</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Masa Salarial (IBC)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5000000"
                      value={simulatedIbc}
                      onChange={(e) => setSimulatedIbc(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{formatCOP(simulatedIbc)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Clase de Riesgo</label>
                  <select
                    value={simulatedRisk}
                    onChange={(e) => {
                      setSimulatedRisk(e.target.value as RiskClass);
                      setSimulatedActivityId('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100"
                  >
                    {RISK_CLASSES.map((r) => (
                      <option key={r} value={r}>
                        {RISK_RATES[r].label} ({RISK_RATES[r].percentageText})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-selector: Actividad Económica Especial si existe para esta clase */}
                {selectedArl.economicActivityCommissions && selectedArl.economicActivityCommissions.filter((a) => a.riskClass === simulatedRisk).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 dark:text-slate-400 font-semibold block">
                        Actividad Económica Especial (Opcional)
                      </label>
                      {simulatedActivityId && (
                        <button
                          type="button"
                          onClick={() => setSimulatedActivityId('')}
                          className="text-[10px] text-blue-500 hover:underline font-bold"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                    <select
                      value={simulatedActivityId}
                      onChange={(e) => setSimulatedActivityId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-xs"
                    >
                      <option value="">-- Tasa General Clase ({selectedArl.defaultCommissionMatrix[simulatedConcept]?.[simulatedRisk]}%) --</option>
                      {selectedArl.economicActivityCommissions
                        .filter((a) => a.riskClass === simulatedRisk)
                        .map((act) => (
                          <option key={act.id} value={act.id}>
                            {act.ciiuCode ? `[${act.ciiuCode}] ` : ''}{act.activityName} ({act.commissionRate}%)
                          </option>
                        ))}
                    </select>
                    {simulatedActivityId && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                        ✓ Aplicando comisión especial de actividad económica
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Concepto Comercial</label>
                  <select
                    value={simulatedConcept}
                    onChange={(e) => setSimulatedConcept(e.target.value as CommissionConcept)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100"
                  >
                    {CONCEPTS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calculation Summary Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Aporte Total a la ARL:</span>
                    <span className="font-mono font-bold text-slate-200">{formatCOP(arlContribution)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>% Comisión Aplicado:</span>
                    <span className="font-mono font-bold text-amber-400">{currentRatePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-emerald-400">Comisión Mensual:</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{formatCOP(estimatedCommission)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ARL Contact Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 size={15} className="text-blue-500" /> Líneas de Atención Directa
                </h4>
                <button
                  onClick={() => setEditingArl(selectedArl)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                >
                  Editar
                </button>
              </div>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{selectedArl.phone || selectedArl.supportPhone || 'Línea 018000'}</span>
                </div>
                {selectedArl.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-slate-400 shrink-0" />
                    <a href={selectedArl.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                      {selectedArl.website}
                    </a>
                  </div>
                )}
                {selectedArl.notes && (
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                    {selectedArl.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ARL EXISTENTE & AGREGAR / MODIFICAR LOGO */}
      {editingArl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingArl(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                PARAMETRIZACIÓN INSTITUCIONAL
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Editar Datos y Logo de {editingArl.shortName}
              </h3>
            </div>

            <form onSubmit={handleSaveEditedArl} className="space-y-4 text-xs">
              {/* Logo Management Box with Live Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="text-slate-700 dark:text-slate-300 font-bold block">
                  Logo Oficial de la Aseguradora
                </label>

                <div className="flex items-center gap-3.5">
                  <ARLLogo arlId={editingArl.id} customLogo={editingArl.logo} size="lg" />
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors shadow-sm">
                      <Upload size={14} /> <span>Subir Imagen desde mi Equipo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>

                    {editingArl.logo && (
                      <button
                        type="button"
                        onClick={() => setEditingArl({ ...editingArl, logo: undefined })}
                        className="text-[11px] text-slate-500 hover:text-rose-500 block underline text-center w-full"
                      >
                        Restaurar Logo Vectorial Predeterminado
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">O ingresar Enlace Web de la Imagen (URL):</span>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo-arl.png"
                    value={editingArl.logo && !editingArl.logo.startsWith('data:') ? editingArl.logo : ''}
                    onChange={(e) => setEditingArl({ ...editingArl, logo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Oficial</label>
                <input
                  type="text"
                  value={editingArl.name}
                  onChange={(e) => setEditingArl({ ...editingArl, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Corto</label>
                  <input
                    type="text"
                    value={editingArl.shortName}
                    onChange={(e) => setEditingArl({ ...editingArl, shortName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Código Superfinanciera</label>
                  <input
                    type="text"
                    value={editingArl.superintendenciaCode || editingArl.code || ''}
                    onChange={(e) =>
                      setEditingArl({
                        ...editingArl,
                        superintendenciaCode: e.target.value,
                        code: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Línea de Atención</label>
                  <input
                    type="text"
                    value={editingArl.phone || editingArl.supportPhone || ''}
                    onChange={(e) =>
                      setEditingArl({
                        ...editingArl,
                        phone: e.target.value,
                        supportPhone: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Sitio Web Oficial</label>
                  <input
                    type="text"
                    value={editingArl.website || ''}
                    onChange={(e) => setEditingArl({ ...editingArl, website: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Notas Comerciales</label>
                <textarea
                  rows={2}
                  value={editingArl.notes || ''}
                  onChange={(e) => setEditingArl({ ...editingArl, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingArl(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVA ARL (CON SUBIDA DE LOGO) */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                DIRECTORIO DE ASEGURADORAS
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Registrar Nueva Entidad ARL
              </h3>
              <p className="text-xs text-slate-500">
                Habilita una nueva ARL en el sistema con su logo y matriz de comisiones.
              </p>
            </div>

            <form onSubmit={handleCreateArl} className="space-y-3.5 text-xs">
              {/* Logo Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="text-slate-700 dark:text-slate-300 font-bold block">
                  Logo de la ARL
                </label>

                <div className="flex items-center gap-3.5">
                  <ARLLogo arlId={newArlShortName || 'nueva'} customLogo={newArlLogo} size="lg" />
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors shadow-sm">
                      <Upload size={14} /> <span>Subir Imagen (PNG/JPG/SVG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoFileUpload(e, true)}
                        className="hidden"
                      />
                    </label>

                    {newArlLogo && (
                      <button
                        type="button"
                        onClick={() => setNewArlLogo('')}
                        className="text-[11px] text-rose-500 hover:underline block text-center w-full"
                      >
                        Quitar Imagen
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">O pegar Enlace Web (URL):</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newArlLogo && !newArlLogo.startsWith('data:') ? newArlLogo : ''}
                    onChange={(e) => setNewArlLogo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Oficial de la ARL</label>
                <input
                  type="text"
                  placeholder="Ej. La Equidad Seguros O.C. / Seguros Alfa S.A."
                  value={newArlName}
                  onChange={(e) => setNewArlName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Corto</label>
                  <input
                    type="text"
                    placeholder="Ej. La Equidad ARL / ARL Alfa"
                    value={newArlShortName}
                    onChange={(e) => setNewArlShortName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Código Superfinanciera</label>
                  <input
                    type="text"
                    placeholder="Ej. 14-29"
                    value={newArlCode}
                    onChange={(e) => setNewArlCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Teléfono de Soporte</label>
                  <input
                    type="text"
                    value={newArlPhone}
                    onChange={(e) => setNewArlPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Sitio Web</label>
                  <input
                    type="text"
                    value={newArlWebsite}
                    onChange={(e) => setNewArlWebsite(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Notas Comerciales</label>
                <textarea
                  rows={2}
                  value={newArlNotes}
                  onChange={(e) => setNewArlNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Guardar ARL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR ACTIVIDAD ECONÓMICA ESPECIAL A LA ARL */}
      {showAddActivityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAddActivityModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                PARAMETRIZACIÓN POR ACTIVIDAD ECONÓMICA
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Agregar Actividad Económica a {selectedArl.shortName}
              </h3>
              <p className="text-xs text-slate-500">
                Configura un porcentaje de comisión específico para un sector o código CIIU bajo el Decreto 768 / 2022.
              </p>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Clase de Riesgo
                  </label>
                  <select
                    value={newActRiskClass}
                    onChange={(e) => setNewActRiskClass(e.target.value as RiskClass)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    {RISK_CLASSES.map((r) => (
                      <option key={r} value={r}>
                        {RISK_RATES[r].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Código CIIU (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 4111, 4923, 0510"
                    value={newActCiiu}
                    onChange={(e) => setNewActCiiu(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Nombre de la Actividad Económica / Sector *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Construcción de edificios residenciales y obras civiles"
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Porcentaje de Comisión Negociado (%) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={newActRate}
                    onChange={(e) => setNewActRate(parseFloat(e.target.value) || 0)}
                    className="w-32 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 text-sm"
                    required
                  />
                  <span className="font-bold text-slate-500">% de comisión sobre aportes ARL</span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Notas / Convenio Especial (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Tarifa preferencial para empresas constructoras afiliadas a agremiación..."
                  value={newActNotes}
                  onChange={(e) => setNewActNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Save size={14} /> Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
