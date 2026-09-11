'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HardHat,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
  Plus,
  Save,
  RotateCw,
  MapPin,
  ClipboardList,
  Sparkles,
  Award,
  Check,
  X,
  Building2,
  Calendar,
  PenTool,
  Search,
  Filter,
  Eye,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  Kanban,
  Table as TableIcon,
  ArrowRight,
  ArrowLeft,
  Edit3,
  CalendarDays,
  Printer,
  Calculator,
  Stethoscope
} from 'lucide-react';
import { getStoredClients, saveStoredClients, getStoredFieldVisits, saveStoredFieldVisits, getStoredAgencyProfile } from '@/lib/storage';
import { ClientCompany, FieldVisit, AgencyProfile } from '@/types';
import { printDocumentById } from '@/lib/printUtils';
import {
  STANDARDS_0312,
  StandardItem0312,
  StandardEvaluationRecord,
  StandardComplianceStatus,
  getStandardsByScope,
  calculateScore0312
} from '@/lib/standards0312';

export default function CampoSSTPage() {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLA'>('KANBAN');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [filterCompany, setFilterCompany] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Quick edit modal for observations / status
  const [editingVisit, setEditingVisit] = useState<FieldVisit | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  // New Visit Form Modal
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [engineerName, setEngineerName] = useState('Ing. Félix Bedoya (Lic. SST 14920)');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursSpent, setHoursSpent] = useState<number>(4.0);
  const [hasCost, setHasCost] = useState<boolean>(false);
  const [visitCost, setVisitCost] = useState<number>(0);
  const [costNotes, setCostNotes] = useState<string>("Cubierto 100% por retorno / intermediación ARL");
  const [visitType, setVisitType] = useState<FieldVisit['visitType']>('AUDITORIA_0312');
  const [initialStatus, setInitialStatus] = useState<FieldVisit['status']>('REALIZADA');
  const [standardsCount, setStandardsCount] = useState<7 | 21 | 60>(60);
  const [location, setLocation] = useState('Planta Principal - Zona Industrial');
  const [findings, setFindings] = useState('');
  const [observations, setObservations] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [clientSignature, setClientSignature] = useState('Firmado digitalmente por Responsable SST');

  // Standard Evaluations State (id -> { status, observation })
  const [evaluations, setEvaluations] = useState<Record<string, StandardEvaluationRecord>>({});

  // Search & Filter within checklist modal
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCycleFilter, setModalCycleFilter] = useState<'TODOS' | 'PLANEAR' | 'HACER' | 'VERIFICAR' | 'ACTUAR'>('TODOS');

  // Detail Modal for viewing past audit
  const [viewingVisit, setViewingVisit] = useState<FieldVisit | null>(null);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  useEffect(() => {
    const clis = getStoredClients();
    setClients(clis);
    const storedVisits = getStoredFieldVisits();
    setVisits(storedVisits);
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    const handleDataSynced = () => {
      setClients(getStoredClients());
      setVisits(getStoredFieldVisits());
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    window.addEventListener('praxis_data_synced', handleDataSynced);

    // Check URL parameters for direct cross-module navigation
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetClientId = params.get('cliente');
      if (targetClientId) {
        const found = clis.find((c) => c.id === targetClientId);
        if (found) {
          setSelectedClientId(found.id);
          autoConfigureStandards(found);
          setVisitType('AUDITORIA_0312');
          setInitialStatus('REALIZADA');
          setLocation(`Sede Principal - ${found.city || 'Planta'}`);
          const existingAudit = storedVisits.find((v) => v.clientId === found.id && v.visitType === 'AUDITORIA_0312');
          if (existingAudit) {
            setEditingVisitId(existingAudit.id);
            if (existingAudit.standardEvaluations && Object.keys(existingAudit.standardEvaluations).length > 0) {
              setEvaluations(existingAudit.standardEvaluations);
            }
            if (existingAudit.standardsCount) {
              setStandardsCount(existingAudit.standardsCount);
            }
          } else {
            setEditingVisitId(null);
          }
          setShowNewVisitModal(true);
          return () => {
            window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
            window.removeEventListener('praxis_data_synced', handleDataSynced);
          };
        }
      }
    }

    if (clis.length > 0) {
      setSelectedClientId(clis[0].id);
      autoConfigureStandards(clis[0]);
    }

    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
      window.removeEventListener('praxis_data_synced', handleDataSynced);
    };
  }, []);

  // Intercept Cmd+P / Ctrl+P when viewingVisit modal is open to print only the official report
  useEffect(() => {
    if (!viewingVisit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        printDocumentById('acta-visita-sheet', `Acta Visita - ${viewingVisit.clientName}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingVisit]);

  const autoConfigureStandards = (client: ClientCompany) => {
    const emp = client.employeeCount || 10;
    const isHighRisk = client.riskClass === 'CLASE_IV' || client.riskClass === 'CLASE_V';
    
    let defaultScope: 7 | 21 | 60 = client.standardsCount || (isHighRisk || emp > 50 ? 60 : emp >= 11 ? 21 : 7);

    setStandardsCount(defaultScope);
    if (client.standardsEvaluations && Object.keys(client.standardsEvaluations).length > 0) {
      setEvaluations(client.standardsEvaluations);
    } else {
      initializeEvaluations(defaultScope);
    }
  };

  const initializeEvaluations = (scope: 7 | 21 | 60) => {
    const items = getStandardsByScope(scope);
    const initial: Record<string, StandardEvaluationRecord> = {};
    items.forEach((item, index) => {
      initial[item.id] = {
        status: index % 4 === 0 ? 'NO_CUMPLE' : 'CUMPLE',
        observation: '',
      };
    });
    setEvaluations(initial);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      autoConfigureStandards(client);
    }
  };

  const handleScopeChange = (newScope: 7 | 21 | 60) => {
    setStandardsCount(newScope);
    initializeEvaluations(newScope);
  };

  const handleStatusChange = (itemId: string, status: StandardComplianceStatus) => {
    setEvaluations((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status,
      },
    }));
  };

  const handleObservationChange = (itemId: string, observation: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observation,
      },
    }));
  };

  const currentScoreData = calculateScore0312(standardsCount, evaluations);
  const currentSelectedClient = clients.find((c) => c.id === selectedClientId);

  const handleOpenAudit = (v: FieldVisit) => {
    setEditingVisitId(v.id);
    setSelectedClientId(v.clientId);
    setEngineerName(v.engineerName);
    setVisitDate(v.visitDate);
    setHoursSpent(v.hoursSpent);
    setVisitType('AUDITORIA_0312');
    setInitialStatus(v.status);
    setStandardsCount(v.standardsCount || 60);
    setLocation(v.location || 'Sede Principal');
    setFindings(v.findings || '');
    setObservations(v.observations || '');
    setActionPlan(v.actionPlan || '');
    setHasCost(v.hasCost || false);
    setVisitCost(v.visitCost || 0);
    setCostNotes(v.costNotes || '');
    if (v.standardEvaluations && Object.keys(v.standardEvaluations).length > 0) {
      setEvaluations(v.standardEvaluations);
    } else {
      initializeEvaluations(v.standardsCount || 60);
    }
    setShowNewVisitModal(true);
  };

  const handleMarkAllCumple = () => {
    const updated = { ...evaluations };
    filteredModalStandards.forEach((s) => {
      updated[s.id] = {
        ...(updated[s.id] || {}),
        status: 'CUMPLE',
      };
    });
    setEvaluations(updated);
  };

  const handleResetEvaluations = () => {
    const updated = { ...evaluations };
    filteredModalStandards.forEach((s) => {
      updated[s.id] = {
        ...(updated[s.id] || {}),
        status: 'NO_CUMPLE',
      };
    });
    setEvaluations(updated);
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const score = visitType === 'AUDITORIA_0312'
      ? currentScoreData.score 
      : undefined;

    // Actualizar expediente de Estándares Mínimos Res. 0312 de la empresa cliente
    if (visitType === 'AUDITORIA_0312') {
      const updatedClients = clients.map((c) =>
        c.id === client.id
          ? {
              ...c,
              standardsCount,
              standardsScore: currentScoreData.score,
              standardsRating: currentScoreData.rating,
              lastStandardsAuditDate: visitDate,
              standardsEvaluations: evaluations,
            }
          : c
      );
      setClients(updatedClients);
      saveStoredClients(updatedClients);
    }

    if (editingVisitId) {
      const updated = visits.map((v) =>
        v.id === editingVisitId
          ? {
              ...v,
              clientId: client.id,
              clientName: client.name,
              engineerName,
              visitDate,
              hoursSpent,
              visitType,
              standardsCount,
              checklistScore: score,
              standardEvaluations: evaluations,
              findings: findings || v.findings,
              observations: observations || v.observations,
              actionPlan: actionPlan || v.actionPlan,
              status: isOfflineMode ? 'BORRADOR_OFFLINE' : initialStatus,
              clientSignature,
              location,
              hasCost,
              visitCost,
              costNotes,
            }
          : v
      );
      setVisits(updated);
      saveStoredFieldVisits(updated);
      setShowNewVisitModal(false);
      setEditingVisitId(null);
      return;
    }

    const newVisit: FieldVisit = {
      id: `vis-${Date.now().toString().slice(-4)}`,
      clientId: client.id,
      clientName: client.name,
      engineerId: 'eng-01',
      engineerName,
      visitDate,
      hoursSpent,
      visitType,
      standardsCount,
      checklistScore: score,
      standardEvaluations: evaluations,
      findings: findings || (initialStatus === 'PROGRAMADA' 
        ? `Visita técnica programada para inspección y acompañamiento SG-SST.` 
        : `Auditoría Res. 0312 (${standardsCount} Estándares) completada con puntaje ${score}%.`),
      observations: observations || 'Sin observaciones adicionales registradas.',
      actionPlan: actionPlan || (currentScoreData.score < 85 ? 'Elaborar e implementar Plan de Mejoramiento con envío periódico de avances a la ARL.' : 'Mantener medidas de control y seguimiento en el Plan de Trabajo Anual.'),
      status: isOfflineMode ? 'BORRADOR_OFFLINE' : initialStatus,
      clientSignature,
      location,
      hasCost,
      visitCost,
      costNotes,
    };

    const updated = [newVisit, ...visits];
    setVisits(updated);
    saveStoredFieldVisits(updated);
    setShowNewVisitModal(false);
    setEditingVisitId(null);
    // Reset form
    setFindings('');
    setObservations('');
    setActionPlan('');
  };

  const handleMoveVisitStatus = (visitId: string, targetStatus: FieldVisit['status']) => {
    const updated = visits.map((v) => (v.id === visitId ? { ...v, status: targetStatus } : v));
    setVisits(updated);
    saveStoredFieldVisits(updated);
  };

  const handleUpdateEditingVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisit) return;
    const updated = visits.map((v) => (v.id === editingVisit.id ? editingVisit : v));
    setVisits(updated);
    saveStoredFieldVisits(updated);
    setEditingVisit(null);
  };

  const handleSyncOffline = () => {
    setSyncMessage('Sincronizando bitácora técnica con Dokploy PostgreSQL...');
    setTimeout(() => {
      const updated = visits.map((v) =>
        v.status === 'BORRADOR_OFFLINE' ? { ...v, status: 'REALIZADA' as const } : v
      );
      setVisits(updated);
      saveStoredFieldVisits(updated);
      setSyncMessage('¡Bitácora sincronizada exitosamente con la nube!');
      setTimeout(() => setSyncMessage(null), 3500);
    }, 1200);
  };

  // Filtered visits
  const filteredVisits = visits.filter((v) => {
    const matchesComp = filterCompany === 'TODAS' || v.clientId === filterCompany;
    const matchesSearch =
      v.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.engineerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.findings.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.observations && v.observations.toLowerCase().includes(searchTerm.toLowerCase())) ||
      v.visitType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesComp && matchesSearch;
  });

  const selectedClientObj = clients.find((c) => c.id === filterCompany);

  // Kanban Columns Data
  const programadas = filteredVisits.filter((v) => v.status === 'PROGRAMADA');
  const pendientes = filteredVisits.filter(
    (v) => v.status === 'PENDIENTE' || v.status === 'BORRADOR_OFFLINE' || v.status === 'EN_REVISION'
  );
  const realizadas = filteredVisits.filter(
    (v) => v.status === 'REALIZADA' || v.status === 'COMPLETADA' || v.status === 'SINCRONIZADA'
  );

  // Filtered standards for modal
  const activeScopeStandards = getStandardsByScope(standardsCount);
  const filteredModalStandards = activeScopeStandards.filter((s) => {
    const matchesCycle = modalCycleFilter === 'TODOS' || s.cycle === modalCycleFilter;
    const matchesSearch =
      s.numeral.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      s.criterion.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(modalSearchTerm.toLowerCase());
    return matchesCycle && matchesSearch;
  });

  const activeClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6 max-w-full animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-400/30">
              PERFIL CONSULTORÍA / SG-SST
            </span>
            <span className="text-xs text-slate-500 font-semibold">Resolución 0312 de 2019 MinTrabajo</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Gestión de Visitas de Campo & Auditoría 0312
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Control integral del ciclo de consultoría: visitas programadas, pendientes en ejecución y realizadas con descripción y observaciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Offline Toggle */}
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all ${
              isOfflineMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {isOfflineMode ? <WifiOff size={14} /> : <Wifi size={14} className="text-emerald-500" />}
            <span>{isOfflineMode ? 'Modo Offline PWA' : 'Online'}</span>
          </button>

          {isOfflineMode && (
            <button
              onClick={handleSyncOffline}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
            >
              <RotateCw size={14} /> Sincronizar
            </button>
          )}

          <button
            onClick={() => {
              if (activeClient) autoConfigureStandards(activeClient);
              setShowNewVisitModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            title="Registrar nueva visita y auditoría 0312"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva Visita & Auditoría 0312</span>
            <span className="sm:hidden">Nueva Visita</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Visitas</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{visits.length}</div>
            <span className="text-[10px] text-slate-500">Bitácora RUI</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Horas Técnicas</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {visits.reduce((sum, v) => sum + (v.hoursSpent || 0), 0)} hrs
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Asesoría de Campo</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Auditorías 0312</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {visits.filter((v) => v.visitType === 'AUDITORIA_0312').length}
            </div>
            <span className="text-[10px] text-slate-500">7, 21 y 60 Estándares</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Promedio Cumplimiento</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {visits.filter((v) => v.checklistScore).length > 0
                ? Math.round(
                    visits.filter((v) => v.checklistScore).reduce((sum, v) => sum + (v.checklistScore || 0), 0) /
                      visits.filter((v) => v.checklistScore).length
                  )
                : 0}
              %
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Nivel General</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Kanban / Table Toggle */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Building2 size={16} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Filtrar Empresa:</span>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full md:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">🏢 Todas las Empresas ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por hallazgo u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban size={14} /> Tablero Kanban
            </button>
            <button
              onClick={() => setViewMode('TABLA')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'TABLA'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon size={14} /> Vista Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Active Company Filter Banner for Cross-Module Connectivity */}
      {selectedClientObj && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 min-w-0">
            <Building2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="block truncate">
                Filtrando bitácora técnica de: <strong className="font-extrabold">{selectedClientObj.name}</strong> (NIT {selectedClientObj.nit})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedClientObj.standardsScore !== undefined ? `Res. 0312: ${selectedClientObj.standardsScore}% (${selectedClientObj.standardsRating || 'Registrado'})` : 'Res. 0312 pendiente'} • {selectedClientObj.employeeCount} trabajadores
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/comisiones?cliente=${encodeURIComponent(selectedClientObj.id)}`}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 shadow-sm"
              title="Ver conciliación PILA y bolsa de retorno de esta empresa"
            >
              <Calculator size={13} className="text-blue-500" /> <span>Bolsa PILA</span>
            </Link>
            <Link
              href={`/medico?cliente=${encodeURIComponent(selectedClientObj.id)}`}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 shadow-sm"
              title="Ver casos médicos y ausentismo de esta empresa"
            >
              <Stethoscope size={13} className="text-rose-500" /> <span>Médico & AT</span>
            </Link>
            <Link
              href="/clientes"
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
              title="Ver expediente en Clientes"
            >
              <span>Expediente</span>
            </Link>
            <button
              onClick={() => {
                setFilterCompany('TODAS');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('cliente');
                  window.history.replaceState({}, '', url.pathname);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-all shadow-sm"
            >
              ✕ Ver todas
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: TABLERO KANBAN */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* COLUMN 1: VISITAS PROGRAMADAS */}
          <div className="p-4 rounded-3xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3.5 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/80 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <CalendarDays size={14} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Programadas
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono font-bold text-xs">
                {programadas.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
              {programadas.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                  No hay visitas programadas pendientes
                </div>
              ) : (
                programadas.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Calendar size={11} /> {v.visitDate}
                        </span>
                        <strong className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                          {v.clientName}
                        </strong>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[9px] uppercase shrink-0 border border-blue-200 dark:border-blue-800">
                        {v.visitType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Findings / Description */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Objetivo / Descripción:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                        {v.findings}
                      </p>
                    </div>

                    {/* Observations */}
                    <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                        Observaciones del Consultor:
                      </span>
                      <p className="text-amber-900 dark:text-amber-200 line-clamp-2">
                        {v.observations || 'Sin observaciones adicionales'}
                      </p>
                    </div>

                    {/* Valuation / Cost badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                        !v.hasCost || !v.visitCost
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      }`}>
                        {!v.hasCost || !v.visitCost ? (
                          <span>🟢 Sin Costo (Cubierto ARL)</span>
                        ) : (
                          <span>🔵 Valor: {formatCOP(v.visitCost)}</span>
                        )}
                      </span>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {v.hoursSpent} hrs
                      </span>
                      <span className="truncate max-w-[130px] font-medium">
                        {v.engineerName.split('(')[0]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenAudit(v)}
                          className="h-8 w-8 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white flex items-center justify-center border border-amber-500/20 transition-all"
                          title="Calificar auditoría 0312"
                        >
                          <ClipboardList size={14} />
                        </button>

                        <button
                          onClick={() => setEditingVisit(v)}
                          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                          title="Editar notas y observaciones"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleMoveVisitStatus(v.id, 'PENDIENTE')}
                        className="h-8 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all ml-auto"
                        title="Pasar a Pendiente / En Proceso"
                      >
                        <span className="text-[11px]">Iniciar</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: EN EJECUCIÓN & PENDIENTES */}
          <div className="p-4 rounded-3xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3.5 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/60">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Clock size={14} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Pendientes / En Proceso
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono font-bold text-xs">
                {pendientes.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
              {pendientes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                  No hay visitas pendientes en proceso
                </div>
              ) : (
                pendientes.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Calendar size={11} /> {v.visitDate}
                        </span>
                        <strong className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                          {v.clientName}
                        </strong>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[9px] uppercase shrink-0 border border-amber-200 dark:border-amber-800">
                        {v.visitType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Findings / Description */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Hallazgos Preliminares:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                        {v.findings}
                      </p>
                    </div>

                    {/* Observations */}
                    <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                        Observaciones del Consultor:
                      </span>
                      <p className="text-amber-900 dark:text-amber-200 line-clamp-2">
                        {v.observations || 'Pendiente de entrega de compromisos o firma.'}
                      </p>
                    </div>

                    {/* Valuation / Cost badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                        !v.hasCost || !v.visitCost
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      }`}>
                        {!v.hasCost || !v.visitCost ? (
                          <span>🟢 Sin Costo (Cubierto ARL)</span>
                        ) : (
                          <span>🔵 Valor: {formatCOP(v.visitCost)}</span>
                        )}
                      </span>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {v.hoursSpent} hrs
                      </span>
                      <span className="truncate max-w-[130px] font-medium">
                        {v.engineerName.split('(')[0]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveVisitStatus(v.id, 'PROGRAMADA')}
                          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                          title="Devolver a Programada"
                        >
                          <ArrowLeft size={13} />
                        </button>

                        <button
                          onClick={() => handleOpenAudit(v)}
                          className="h-8 w-8 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white flex items-center justify-center border border-amber-500/20 transition-all"
                          title="Calificar o editar auditoría 0312"
                        >
                          <ClipboardList size={14} />
                        </button>

                        <button
                          onClick={() => setEditingVisit(v)}
                          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                          title="Editar notas y observaciones"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleMoveVisitStatus(v.id, 'REALIZADA')}
                        className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all ml-auto"
                        title="Marcar como Visita Realizada"
                      >
                        <Check size={13} />
                        <span className="text-[11px]">Realizada</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: VISITAS REALIZADAS */}
          <div className="p-4 rounded-3xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3.5 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80 dark:border-emerald-900/60">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 size={14} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Realizadas & Acreditadas
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs">
                {realizadas.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
              {realizadas.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                  No hay visitas concluidas registradas
                </div>
              ) : (
                realizadas.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} /> {v.visitDate}
                        </span>
                        <strong className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                          {v.clientName}
                        </strong>
                      </div>
                      {v.checklistScore !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono shrink-0 border ${
                            v.checklistScore >= 86
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                              : v.checklistScore >= 60
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                              : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                          }`}
                        >
                          {v.checklistScore}% Res. 0312
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase">
                          {v.visitType.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Findings / Description */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Hallazgos y Conclusiones:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                        {v.findings}
                      </p>
                    </div>

                    {/* Observations */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                        Observaciones del Consultor:
                      </span>
                      <p className="text-emerald-900 dark:text-emerald-200 line-clamp-2">
                        {v.observations || 'Visita finalizada y acreditada para informe RUI.'}
                      </p>
                    </div>

                    {/* Valuation / Cost badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                        !v.hasCost || !v.visitCost
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      }`}>
                        {!v.hasCost || !v.visitCost ? (
                          <span>🟢 Sin Costo (Cubierto ARL)</span>
                        ) : (
                          <span>🔵 Valor: {formatCOP(v.visitCost)}</span>
                        )}
                      </span>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300">
                        <Clock size={12} /> {v.hoursSpent} hrs certificadas
                      </span>
                      <span className="truncate max-w-[130px] font-medium">
                        {v.engineerName.split('(')[0]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveVisitStatus(v.id, 'PENDIENTE')}
                          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                          title="Reabrir a estado pendiente"
                        >
                          <ArrowLeft size={13} />
                        </button>

                        <button
                          onClick={() => setEditingVisit(v)}
                          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                          title="Editar notas y observaciones"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleOpenAudit(v)}
                          className="h-8 w-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white flex items-center justify-center border border-emerald-500/20 transition-all"
                          title="Ver o editar calificación auditoría 0312"
                        >
                          <ClipboardList size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => setViewingVisit(v)}
                        className="h-8 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all ml-auto"
                        title="Ver Acta Oficial de Visita"
                      >
                        <Eye size={13} />
                        <span className="text-[11px]">Acta</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TABLA CRONOLÓGICA TRADICIONAL */}
      {viewMode === 'TABLA' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Historial de Visitas Técnicas & Calificaciones Res. 0312
              </h3>
              <p className="text-[11px] text-slate-500">Registro cronológico con respaldo de firma y observaciones.</p>
            </div>
          </div>

          {/* Mobile View: Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredVisits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay visitas registradas con los filtros actuales.
              </div>
            ) : (
              filteredVisits.map((v) => (
                <div key={`mob-${v.id}`} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-slate-500 block">{v.visitDate}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{v.clientName}</h4>
                      <span className="text-[10px] text-slate-500 block">{v.engineerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          v.status === 'PROGRAMADA'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200'
                            : v.status === 'PENDIENTE'
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        }`}
                      >
                        {v.status}
                      </span>
                      <button
                        onClick={() => setEditingVisit(v)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Editar Observaciones"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setViewingVisit(v)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        title="Ver Auditoría Completa"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                      {v.visitType.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                        {v.hoursSpent} hrs
                      </span>
                      {v.checklistScore !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                            v.checklistScore >= 86
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                              : v.checklistScore >= 60
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300'
                          }`}
                        >
                          {v.checklistScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha / Empresa</th>
                  <th className="py-3 px-4">Ingeniero / Profesional</th>
                  <th className="py-3 px-4">Tipo Intervención</th>
                  <th className="py-3 px-4 text-center">Horas</th>
                  <th className="py-3 px-4 text-center">Puntaje Res. 0312</th>
                  <th className="py-3 px-4 text-center">Estado Kanban</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-slate-500 block">{v.visitDate}</span>
                      <strong className="font-bold text-slate-900 dark:text-white text-xs">{v.clientName}</strong>
                      <span className="text-[10px] text-slate-500 block">{v.location}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {v.engineerName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                        {v.visitType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {v.hoursSpent} hrs
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.checklistScore !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                            v.checklistScore >= 86
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : v.checklistScore >= 60
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                              : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700'
                          }`}
                        >
                          {v.checklistScore}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'PROGRAMADA'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200'
                            : v.status === 'PENDIENTE'
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingVisit(v)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Editar Observaciones"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setViewingVisit(v)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          title="Ver Auditoría Completa"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR OBSERVACIONES Y ESTADO DE LA VISITA */}
      {editingVisit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingVisit(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                BITÁCORA TÉCNICA DEL CONSULTOR
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Observaciones y Estado de la Visita
              </h3>
              <p className="text-xs text-slate-500 font-bold">{editingVisit.clientName}</p>
            </div>

            <form onSubmit={handleUpdateEditingVisit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Estado en el Kanban
                  </label>
                  <select
                    value={editingVisit.status}
                    onChange={(e) =>
                      setEditingVisit({ ...editingVisit, status: e.target.value as FieldVisit['status'] })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    <option value="PROGRAMADA">📅 1. Visita Programada</option>
                    <option value="PENDIENTE">⏳ 2. En Ejecución / Pendiente</option>
                    <option value="REALIZADA">✅ 3. Visita Realizada</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Fecha de la Visita
                  </label>
                  <input
                    type="date"
                    value={editingVisit.visitDate}
                    onChange={(e) => setEditingVisit({ ...editingVisit, visitDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Descripción / Hallazgos Técnicos
                </label>
                <textarea
                  rows={3}
                  value={editingVisit.findings}
                  onChange={(e) => setEditingVisit({ ...editingVisit, findings: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                  placeholder="Detalla lo encontrado durante la inspección o el objetivo de la visita..."
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Observaciones Específicas del Consultor SST
                </label>
                <textarea
                  rows={3}
                  value={editingVisit.observations || ''}
                  onChange={(e) => setEditingVisit({ ...editingVisit, observations: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 font-medium"
                  placeholder="Notas internas, compromisos pendientes, actitud de la empresa, requerimientos para la ARL..."
                />
              </div>

              {/* Cost / Valuation in Edit Modal */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-slate-900 dark:text-white font-bold block">
                  Valorización del Acompañamiento Técnico
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVisit({ ...editingVisit, hasCost: false, visitCost: 0, costNotes: "Cubierto 100% por retorno / intermediación ARL" })}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      !editingVisit.hasCost
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    🟢 Sin Costo (Cubierto ARL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVisit({ ...editingVisit, hasCost: true, visitCost: editingVisit.visitCost || editingVisit.hoursSpent * 120000, costNotes: "Asesoría técnica valorizada" })}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      editingVisit.hasCost
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    🔵 Con Valor Comercial
                  </button>
                </div>
                {editingVisit.hasCost && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Valor Total (COP):</span>
                      <input
                        type="number"
                        value={editingVisit.visitCost || 0}
                        onChange={(e) => setEditingVisit({ ...editingVisit, visitCost: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Detalle / Justificación:</span>
                      <input
                        type="text"
                        value={editingVisit.costNotes || ""}
                        onChange={(e) => setEditingVisit({ ...editingVisit, costNotes: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Plan de Acción / Compromisos
                </label>
                <textarea
                  rows={2}
                  value={editingVisit.actionPlan || ''}
                  onChange={(e) => setEditingVisit({ ...editingVisit, actionPlan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                  placeholder="Acciones a seguir..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
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

      {/* MODAL: PROGRAMAR O EVALUAR VISITA RES. 0312 */}
      {showNewVisitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  CONSULTORÍA & AUDITORÍA RES. 0312
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Programar o Registrar Visita Técnica de Campo
                </h3>
              </div>
              <button
                onClick={() => setShowNewVisitModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveVisit} className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
              {/* Status and Company Selection */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <label className="text-slate-800 dark:text-slate-200 font-bold block">
                  1. Estado Inicial de la Visita:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInitialStatus('PROGRAMADA')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      initialStatus === 'PROGRAMADA'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    📅 Programar Visita Futura
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitialStatus('PENDIENTE')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      initialStatus === 'PENDIENTE'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    ⏳ En Proceso / Pendiente
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitialStatus('REALIZADA')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      initialStatus === 'REALIZADA'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    ✅ Visita Realizada & Evaluada
                  </button>
                </div>
              </div>

              {/* Top Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Empresa Cliente
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.employeeCount || 10} trab. - {c.riskClass})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Fecha de la Visita
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Horas Dedicadas (RUI)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Tipo de Intervención
                  </label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as FieldVisit['visitType'])}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    <option value="AUDITORIA_0312">📋 Auditoría Oficial Estándares Mínimos Res. 0312</option>
                    <option value="MATRIZ_PELIGROS">⚠️ Identificación de Peligros GTC-45</option>
                    <option value="ERGONOMICA">🪑 Asesoría Ergonómica & Puestos de Trabajo</option>
                    <option value="INSPECCION_SEGURIDAD">🔍 Inspección Planeada de Seguridad</option>
                    <option value="HIGIENE">🏭 Medición Higiénica (Ruido, Iluminación)</option>
                    <option value="CAPACITACION">🎓 Capacitación & Entrenamiento Brigada / Alturas</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Ubicación / Centro de Trabajo
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Explicit Description and Observations Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Descripción / Hallazgos de la Visita
                  </label>
                  <textarea
                    rows={3}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Describe el objetivo de la visita o lo evidenciado en la sede..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Observaciones Técnicas del Consultor
                  </label>
                  <textarea
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Observaciones de seguimiento, notas sobre el responsable SST de la empresa, acuerdos..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Modalidad de Costo / Valorización del Acompañamiento */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-900 dark:text-white font-bold text-xs">
                    Modalidad de Costo del Acompañamiento Técnico
                  </label>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    {!hasCost ? "Cubierto 100% por ARL" : formatCOP(visitCost)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setHasCost(false); setVisitCost(0); setCostNotes("Cubierto 100% por retorno / intermediación ARL"); }}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      !hasCost
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🟢</span> Sin Costo Adicional
                    </div>
                    <span className="text-[10px] opacity-90 block mt-0.5">
                      Financiado con cargo a los gastos de administración y bolsa de retorno ARL.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setHasCost(true); setVisitCost(hoursSpent * 120000); setCostNotes("Asesoría técnica valorizada a $120.000/hr"); }}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      hasCost
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🔵</span> Con Valor Comercial Liquidado
                    </div>
                    <span className="text-[10px] opacity-90 block mt-0.5">
                      Permite calcular el valor de la asesoría para trazabilidad de la empresa.
                    </span>
                  </button>
                </div>

                {hasCost && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Valor del Acompañamiento (COP):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={visitCost}
                            onChange={(e) => setVisitCost(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setVisitCost(hoursSpent * 120000)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono whitespace-nowrap"
                            title="Calcular a $120.000/hr"
                          >
                            Auto ({hoursSpent}h x $120k)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Detalle / Concepto:
                        </label>
                        <input
                          type="text"
                          value={costNotes}
                          onChange={(e) => setCostNotes(e.target.value)}
                          placeholder="Ej. Asesoría técnica especializada in situ"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Evaluación Oficial de Estándares Mínimos Res. 0312 de 2019 */}
              {visitType === 'AUDITORIA_0312' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-4">
                  {/* Top Scope Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          CHECKLIST NORMATIVO EN VIVO
                        </span>
                        <strong className="text-slate-900 dark:text-white text-xs block">
                          Resolución 0312 de 2019 MinTrabajo
                        </strong>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Califica ítem por ítem el cumplimiento técnico del SG-SST de la empresa.
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                      <button
                        type="button"
                        onClick={() => handleScopeChange(7)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          standardsCount === 7 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="<= 10 trabajadores en Riesgo I, II, III"
                      >
                        7 Estándares
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScopeChange(21)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          standardsCount === 21 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="11 a 50 trabajadores en Riesgo I, II, III"
                      >
                        21 Estándares
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScopeChange(60)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          standardsCount === 60 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="> 50 trabajadores o Riesgos IV y V"
                      >
                        60 Estándares
                      </button>
                    </div>
                  </div>

                  {/* Expediente SG-SST Continuo de la Empresa */}
                  {currentSelectedClient && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {currentSelectedClient.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Expediente permanente SG-SST ({currentSelectedClient.employeeCount || 10} trab. • {currentSelectedClient.riskClass})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Calificación en Ficha:</span>
                        {currentSelectedClient.standardsScore !== undefined ? (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${
                            currentSelectedClient.standardsScore >= 86
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : currentSelectedClient.standardsScore >= 60
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            {currentSelectedClient.standardsScore}% ({currentSelectedClient.standardsRating || 'Registrado'})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin auditar</span>
                        )}
                        {currentSelectedClient.lastStandardsAuditDate && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Aud: {currentSelectedClient.lastStandardsAuditDate})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live Score & Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          Calificación en Vivo SG-SST ({standardsCount} Estándares)
                        </span>
                        <div className="flex items-baseline gap-3 mt-0.5">
                          <span className="text-3xl font-black font-mono text-emerald-400">
                            {currentScoreData.score}%
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${currentScoreData.ratingColor}`}>
                            {currentScoreData.ratingLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
                        <span className="px-2 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          ✓ Cumple: <strong>{currentScoreData.cumpleCount}</strong>
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                          ✗ No Cumple: <strong>{currentScoreData.noCumpleCount}</strong>
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800">
                          — No Aplica: <strong>{currentScoreData.noAplicaCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          currentScoreData.score >= 86
                            ? 'bg-emerald-500'
                            : currentScoreData.score >= 60
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${currentScoreData.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Filter by PHVA Cycle & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {(['TODOS', 'PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'] as const).map((cycle) => {
                        const count = cycle === 'TODOS'
                          ? activeScopeStandards.length
                          : activeScopeStandards.filter((s) => s.cycle === cycle).length;
                        return (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setModalCycleFilter(cycle)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                              modalCycleFilter === cycle
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <span>{cycle}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              modalCycleFilter === cycle
                                ? 'bg-white text-blue-600 font-bold'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-56">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar numeral o criterio..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllCumple}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition-colors whitespace-nowrap"
                        title="Marcar todos los ítems visibles como Cumple"
                      >
                        ✓ Todos Cumple
                      </button>
                      <button
                        type="button"
                        onClick={handleResetEvaluations}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 text-[11px] font-bold transition-colors whitespace-nowrap"
                        title="Reiniciar ítems a No Cumple"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Standards Checklist Items */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredModalStandards.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                        No se encontraron estándares para el filtro o término de búsqueda indicado.
                      </div>
                    ) : (
                      filteredModalStandards.map((std) => {
                        const evalRecord = evaluations[std.id] || { status: 'NO_CUMPLE' };
                        const weight =
                          standardsCount === 7
                            ? typeof std.weight7 === 'number'
                              ? std.weight7
                              : std.weight60
                            : standardsCount === 21
                            ? typeof std.weight21 === 'number'
                              ? std.weight21
                              : std.weight60
                            : std.weight60;

                        const cycleBadgeColor =
                          std.cycle === 'PLANEAR'
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : std.cycle === 'HACER'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : std.cycle === 'VERIFICAR'
                            ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                        return (
                          <div
                            key={std.id}
                            className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                              evalRecord.status === 'CUMPLE'
                                ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-900/60 shadow-sm'
                                : evalRecord.status === 'NO_APLICA'
                                ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-900/60 shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-xs">
                                    {std.numeral}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cycleBadgeColor}`}>
                                    {std.cycle}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {std.category}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {std.description}
                                </h5>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 italic">
                                  {std.criterion}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                                <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                                  Pesa: {weight}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(std.id, 'CUMPLE')}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                    evalRecord.status === 'CUMPLE'
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  ✓ Cumple
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(std.id, 'NO_CUMPLE')}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                    evalRecord.status === 'NO_CUMPLE'
                                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  ✗ No Cumple
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(std.id, 'NO_APLICA')}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                    evalRecord.status === 'NO_APLICA'
                                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="No aplica con justificación legal (otorga el puntaje total)"
                                >
                                  — No Aplica
                                </button>
                              </div>
                            </div>

                            {/* Observation / Evidence Input */}
                            <div>
                              <input
                                type="text"
                                placeholder="Evidencia verificada (acta, soporte digital) o justificación técnica de no aplicación..."
                                value={evalRecord.observation || ''}
                                onChange={(e) => handleObservationChange(std.id, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Save size={14} /> Guardar Visita en el Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALLE DE AUDITORÍA HISTÓRICA */}
      {viewingVisit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 printable-modal-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto printable-modal-box">
            <button
              onClick={() => setViewingVisit(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg no-print cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="border-b border-slate-200 dark:border-slate-800 print:border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 print:text-blue-800 block">
                    INFORME TÉCNICO DE VISITA & AUDITORÍA SG-SST
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-slate-900">
                    {viewingVisit.clientName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 print:bg-blue-50 text-blue-600 dark:text-blue-400 print:text-blue-800 font-bold font-mono text-xs">
                    {viewingVisit.status}
                  </span>
                  <button
                    onClick={() => printDocumentById('acta-visita-sheet', `Acta Visita - ${viewingVisit.clientName}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md no-print cursor-pointer"
                  >
                    <Printer size={13} /> <span className="hidden sm:inline">Imprimir / PDF</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              id="acta-visita-sheet"
              className="space-y-4 text-xs official-document-sheet print:p-0 print:border-none print:shadow-none print:bg-white print:text-slate-900"
            >
              {/* Membrete Oficial para Impresión */}
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 print:border-slate-300 pb-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                    alt={agencyProfile?.shortName || 'PRAXIS'}
                    className="h-8 w-auto object-contain max-h-10"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white print:text-slate-900 text-xs">
                      {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA.'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      NIT: {agencyProfile?.nit || '901.884.200-1'} • RUI MinTrabajo: {agencyProfile?.ruiNumber || 'RUI-MINTRABAJO-2024-8849'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span className="font-mono font-bold block">ACTA VISITA SST</span>
                  <span>{viewingVisit.visitDate}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Profesional SST:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 font-semibold">{viewingVisit.engineerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Horas Invertidas:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 font-mono">{viewingVisit.hoursSpent} hrs</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Fecha de Visita:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 font-mono">{viewingVisit.visitDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Puntaje Res. 0312:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-mono text-sm font-black">
                    {viewingVisit.checklistScore !== undefined ? `${viewingVisit.checklistScore}%` : 'N/A'}
                  </strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-white space-y-2">
                <strong className="text-slate-900 dark:text-white print:text-slate-900 block font-bold">Descripción y Hallazgos:</strong>
                <p className="text-slate-600 dark:text-slate-300 print:text-slate-800 leading-relaxed">{viewingVisit.findings}</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 print:border-slate-300 print:bg-amber-50/40 space-y-2">
                <strong className="text-amber-900 dark:text-amber-300 print:text-amber-900 block font-bold">Observaciones del Consultor SST:</strong>
                <p className="text-amber-800 dark:text-amber-200 print:text-slate-800 leading-relaxed">
                  {viewingVisit.observations || 'Sin observaciones registradas'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-white space-y-2">
                <strong className="text-slate-900 dark:text-white print:text-slate-900 block font-bold">Plan de Mejoramiento Acordado:</strong>
                <p className="text-slate-600 dark:text-slate-300 print:text-slate-800 leading-relaxed">{viewingVisit.actionPlan}</p>
              </div>

              {/* Acta de Liquidación y Valorización del Acompañamiento */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-blue-950/30 border border-blue-200 dark:border-blue-900/60 print:border-slate-300 print:bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 print:text-blue-900">
                    Acta de Liquidación & Valorización del Acompañamiento Técnico
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold print:border print:border-slate-300 ${
                    !viewingVisit.hasCost || !viewingVisit.visitCost
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 print:bg-emerald-100 print:text-emerald-900"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 print:bg-blue-100 print:text-blue-900"
                  }`}>
                    {!viewingVisit.hasCost || !viewingVisit.visitCost
                      ? "Cubierto 100% por Retorno / ARL"
                      : `Liquidado: ${formatCOP(viewingVisit.visitCost)}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Horas de Asesoría in situ:</span>
                    <strong className="text-slate-900 dark:text-white print:text-slate-900 font-mono">{viewingVisit.hoursSpent} Horas</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Costo para la Empresa:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-mono text-xs">
                      {!viewingVisit.hasCost || !viewingVisit.visitCost
                        ? "$0 COP (Sin Costo Directo)"
                        : formatCOP(viewingVisit.visitCost)}
                    </strong>
                  </div>
                  <div className="sm:col-span-1 col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Valor Comercial Equivalente:</span>
                    <strong className="text-slate-700 dark:text-slate-300 print:text-slate-900 font-mono text-xs">
                      {formatCOP(viewingVisit.visitCost || viewingVisit.hoursSpent * 120000)}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-700 italic pt-1 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
                  {viewingVisit.costNotes || "Servicio técnico financiado mediante los gastos de administración de la ARL y bolsa de reinversión pactada con la empresa."}
                </p>
              </div>

              {/* Dual Signature Block for Official Field Visit Acta */}
              <div className="pt-6 grid grid-cols-2 gap-8 page-break-inside-avoid">
                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    {viewingVisit.engineerName}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Consultor Especialista SG-SST
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
                    PRAXIS PREVENCIÓN Y SEGUROS LTDA.
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">Licencia SST Verificada</p>
                </div>

                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    REPRESENTANTE / ENCARGADO SG-SST
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Recibido & Validado en Campo
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-bold truncate">
                    {viewingVisit.clientName}
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">Firma y Sello de Conformidad</p>
                </div>
              </div>

              {/* Pie de Página Oficial Acta */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800 print:border-slate-300 font-sans text-[9px] text-slate-500 flex justify-between items-center">
                <span>Acta oficial de visita técnica y auditoría SG-SST conforme a la Resolución 0312 de 2019 y Decreto 1072 de 2015.</span>
                <span>PRAXIS PREVENCIÓN Y SEGUROS LTDA.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => setViewingVisit(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => printDocumentById('acta-visita-sheet', `Acta Visita - ${viewingVisit.clientName}`)}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <Printer size={14} /> Imprimir Acta de Visita / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
