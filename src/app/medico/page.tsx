'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  HeartPulse,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Search,
  UserCheck,
  Eye,
  CheckCircle2,
  X,
  FileText,
  Building2,
  Calendar,
  Layers,
  Printer,
  TrendingDown,
  TrendingUp,
  BarChart3,
  PieChart,
  Stethoscope,
  Clock,
  Shield,
  Filter,
  Check,
  HardHat,
  Calculator,
  Edit2,
  Trash2
} from 'lucide-react';
import { getStoredClients, getStoredMedicalRecords, saveStoredMedicalRecords, getStoredAgencyProfile } from '@/lib/storage';
import { ClientCompany, MedicalRecord, AgencyProfile } from '@/types';
import { printDocumentById } from '@/lib/printUtils';

export default function IndicadoresSSTPage() {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('TODAS');
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Record Modal (Ficha Técnica)
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);

  // New Record Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newClientId, setNewClientId] = useState<string>('');
  const [newIncidentType, setNewIncidentType] = useState<MedicalRecord['incidentType']>('ACCIDENTE_TRABAJO');
  const [newEmployeeDocument, setNewEmployeeDocument] = useState<string>('');
  const [newEmployeeName, setNewEmployeeName] = useState<string>('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<string>('');
  const [newDiagnosisCie10, setNewDiagnosisCie10] = useState<string>('S61.0');
  const [newDiagnosisDescription, setNewDiagnosisDescription] = useState<string>('Herida o traumatismo en miembros superiores');
  const [newDaysLost, setNewDaysLost] = useState<number>(3);
  const [newFuratFurepCode, setNewFuratFurepCode] = useState<string>('FURAT-2026-');
  const [newPveProgram, setNewPveProgram] = useState<MedicalRecord['pveProgram']>('NINGUNO');
  const [newMedicalNotes, setNewMedicalNotes] = useState<string>('Atención médica inicial. Manejo ambulatorio y recomendaciones ergonómicas.');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  // Edit Record Modal & Operations
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [editClientId, setEditClientId] = useState<string>('');
  const [editIncidentType, setEditIncidentType] = useState<MedicalRecord['incidentType']>('ACCIDENTE_TRABAJO');
  const [editEmployeeDocument, setEditEmployeeDocument] = useState<string>('');
  const [editEmployeeName, setEditEmployeeName] = useState<string>('');
  const [editEmployeeRole, setEditEmployeeRole] = useState<string>('');
  const [editDiagnosisCie10, setEditDiagnosisCie10] = useState<string>('S61.0');
  const [editDiagnosisDescription, setEditDiagnosisDescription] = useState<string>('');
  const [editDaysLost, setEditDaysLost] = useState<number>(0);
  const [editFuratFurepCode, setEditFuratFurepCode] = useState<string>('');
  const [editPveProgram, setEditPveProgram] = useState<MedicalRecord['pveProgram']>('NINGUNO');
  const [editMedicalNotes, setEditMedicalNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDoctorName, setEditDoctorName] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const cls = getStoredClients();
    setClients(cls);
    const recs = getStoredMedicalRecords();
    setMedicalRecords(recs);
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    const handleDataSynced = () => {
      setClients(getStoredClients());
      setMedicalRecords(getStoredMedicalRecords());
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    window.addEventListener('praxis_data_synced', handleDataSynced);

    // Check URL parameters for direct cross-module navigation
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetClientId = params.get('cliente');
      if (targetClientId) {
        const found = cls.find((c) => c.id === targetClientId);
        if (found) {
          setSelectedCompanyFilter(found.id);
        }
      }
    }

    if (cls.length > 0) {
      setNewClientId(cls[0].id);
    }

    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
      window.removeEventListener('praxis_data_synced', handleDataSynced);
    };
  }, []);

  // Keyboard shortcut listener to cleanly intercept Cmd+P / Ctrl+P when Ficha Medica Modal is open
  useEffect(() => {
    if (!viewingRecord) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printDocumentById('ficha-medica-sheet', `Ficha Medica - ${viewingRecord.employeeName}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingRecord]);

  // Filtered records based on company, event type, and search
  const filteredRecords = medicalRecords.filter((r) => {
    const matchesCompany = selectedCompanyFilter === 'TODAS' || r.clientId === selectedCompanyFilter;
    const matchesEvent = selectedEventTypeFilter === 'TODOS' || r.incidentType === selectedEventTypeFilter;
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeDocument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.diagnosisCie10.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.diagnosisDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesEvent && matchesSearch;
  });

  // Target Population (Workers)
  const targetClients = selectedCompanyFilter === 'TODAS' 
    ? clients 
    : clients.filter((c) => c.id === selectedCompanyFilter);

  const totalWorkers = targetClients.reduce((sum, c) => sum + (c.employeeCount || 0), 0) || 1;

  // Counts of events
  const totalAccidents = filteredRecords.filter((r) => r.incidentType === 'ACCIDENTE_TRABAJO').length;
  const totalOccupationalDiseases = filteredRecords.filter((r) => r.incidentType === 'ENFERMEDAD_LABORAL').length;
  const totalCommonAbsence = filteredRecords.filter((r) => r.incidentType === 'AUSENTISMO_COMUN').length;
  const totalPeriodicExams = filteredRecords.filter((r) => r.incidentType === 'EXAMEN_MEDICO').length;

  const totalDaysLostAT = filteredRecords
    .filter((r) => r.incidentType === 'ACCIDENTE_TRABAJO')
    .reduce((sum, r) => sum + (r.daysLost || 0), 0);

  const totalDaysLostAll = filteredRecords.reduce((sum, r) => sum + (r.daysLost || 0), 0);

  // Resolution 0312 Official Formulas (Art. 30)
  // 1. IFAT: (No. AT en el mes / Total Trabajadores) * 100
  const ifat = ((totalAccidents / totalWorkers) * 100).toFixed(2);

  // 2. ISAT: (Días de incapacidad por AT / Total Trabajadores) * 100
  const isat = ((totalDaysLostAT / totalWorkers) * 100).toFixed(2);

  // 3. Proporción de AT Mortales: (AT Mortales / Total AT) * 100 (Assumed 0 mortales)
  const patm = '0.0%';

  // 4. Prevalencia de Enfermedad Laboral: (Casos EL / Total Trabajadores) * 100.000
  const pel = Math.round((totalOccupationalDiseases / totalWorkers) * 100000);

  // 5. Índice de Ausentismo por Causa Médica: (Días de incapacidad médica / Días de trabajo programados en el mes) * 100
  // Días programados en el mes = Total trabajadores * 24 días laborales
  const scheduledWorkDays = totalWorkers * 24;
  const iacm = ((totalDaysLostAll / scheduledWorkDays) * 100).toFixed(2);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSaveNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === newClientId);
    if (!client) return;

    const newRecord: MedicalRecord = {
      id: `med-${Date.now().toString().slice(-4)}`,
      clientId: client.id,
      clientName: client.name,
      incidentType: newIncidentType,
      employeeDocument: newEmployeeDocument || 'CC Sin especificar',
      employeeName: newEmployeeName || 'Trabajador no identificado',
      employeeRole: newEmployeeRole || 'Operario',
      diagnosisCie10: newDiagnosisCie10.toUpperCase(),
      diagnosisDescription: newDiagnosisDescription,
      daysLost: newDaysLost,
      furatFurepCode: newFuratFurepCode,
      pveProgram: newPveProgram,
      medicalNotes: newMedicalNotes,
      confidentialFlag: false,
      date: newDate,
      createdByDoctor: 'Dra. Marcela Salazar (Médico Especialista SST - Reg. 8841)',
    };

    const updated = [newRecord, ...medicalRecords];
    setMedicalRecords(updated);
    saveStoredMedicalRecords(updated);
    setShowNewModal(false);
    setSuccessToast(`✅ Novedad médica de ${newRecord.employeeName} radicada exitosamente.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const openEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
    setEditClientId(record.clientId);
    setEditIncidentType(record.incidentType);
    setEditEmployeeDocument(record.employeeDocument);
    setEditEmployeeName(record.employeeName);
    setEditEmployeeRole(record.employeeRole);
    setEditDiagnosisCie10(record.diagnosisCie10);
    setEditDiagnosisDescription(record.diagnosisDescription);
    setEditDaysLost(record.daysLost);
    setEditFuratFurepCode(record.furatFurepCode || '');
    setEditPveProgram(record.pveProgram || 'NINGUNO');
    setEditMedicalNotes(record.medicalNotes || '');
    setEditDate(record.date);
    setEditDoctorName(record.createdByDoctor || 'Dra. Marcela Salazar (Médico Especialista SST - Reg. 8841)');
    setShowEditModal(true);
  };

  const handleSaveEditedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const client = clients.find((c) => c.id === editClientId) || { id: editClientId, name: editingRecord.clientName };

    const updatedRecord: MedicalRecord = {
      ...editingRecord,
      clientId: client.id,
      clientName: client.name,
      incidentType: editIncidentType,
      employeeDocument: editEmployeeDocument || 'CC Sin especificar',
      employeeName: editEmployeeName || 'Trabajador no identificado',
      employeeRole: editEmployeeRole || 'Operario',
      diagnosisCie10: editDiagnosisCie10.toUpperCase(),
      diagnosisDescription: editDiagnosisDescription,
      daysLost: editDaysLost,
      furatFurepCode: editFuratFurepCode,
      pveProgram: editPveProgram,
      medicalNotes: editMedicalNotes,
      date: editDate,
      createdByDoctor: editDoctorName,
    };

    const updatedList = medicalRecords.map((r) => (r.id === editingRecord.id ? updatedRecord : r));
    setMedicalRecords(updatedList);
    saveStoredMedicalRecords(updatedList);

    if (viewingRecord && viewingRecord.id === editingRecord.id) {
      setViewingRecord(updatedRecord);
    }

    setShowEditModal(false);
    setSuccessToast(`✅ Ficha técnica de ${updatedRecord.employeeName} actualizada con éxito.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro médico de "${name}"? Esta acción no se puede revertir.`)) {
      return;
    }
    const updatedList = medicalRecords.filter((r) => r.id !== id);
    setMedicalRecords(updatedList);
    saveStoredMedicalRecords(updatedList);

    if (viewingRecord && viewingRecord.id === id) {
      setViewingRecord(null);
    }
    if (editingRecord && editingRecord.id === id) {
      setShowEditModal(false);
    }

    setSuccessToast(`🗑️ Registro de ${name} eliminado del sistema.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Grouping by CIE-10 for visual chart
  const cie10Groups: Record<string, number> = {};
  filteredRecords.forEach((r) => {
    const key = r.diagnosisCie10.split('.')[0] || r.diagnosisCie10;
    cie10Groups[key] = (cie10Groups[key] || 0) + 1;
  });

  // Grouping days lost by company for visual chart
  const companyDaysLost: { name: string; days: number; count: number }[] = [];
  clients.forEach((c) => {
    const cRecords = medicalRecords.filter((r) => r.clientId === c.id);
    const days = cRecords.reduce((sum, r) => sum + (r.daysLost || 0), 0);
    if (days > 0 || cRecords.length > 0) {
      companyDaysLost.push({
        name: c.name,
        days,
        count: cRecords.length,
      });
    }
  });

  const selectedClientObj = clients.find((c) => c.id === selectedCompanyFilter);

  return (
    <div className="space-y-6 max-w-full animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
              ESTADÍSTICAS SG-SST OFICIALES
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Resolución 0312 de 2019 (Art. 30)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Indicadores de Accidentalidad, Ausentismo & Siniestralidad
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Cálculo automatizado de Frecuencia (IFAT), Severidad (ISAT), Ausentismo Médico, Fichas de FURAT y diagnósticos CIE-10.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus size={15} /> Registrar Evento / FURAT
          </button>
        </div>
      </div>

      {/* Alerta de Éxito / Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Building2 size={16} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Empresa:</span>
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="w-full md:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">🏢 Consolidado Cartera ({clients.length} Empresas - {totalWorkers} Trabajadores)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.employeeCount} trabajadores)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por trabajador, cédula o CIE-10..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedEventTypeFilter}
            onChange={(e) => setSelectedEventTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium"
          >
            <option value="TODOS">Todos los Eventos</option>
            <option value="ACCIDENTE_TRABAJO">Accidentes de Trabajo</option>
            <option value="AUSENTISMO_COMUN">Ausentismo Común</option>
            <option value="ENFERMEDAD_LABORAL">Enfermedades Laborales</option>
            <option value="EXAMEN_MEDICO">Exámenes Ocupacionales</option>
          </select>
        </div>
      </div>

      {/* Active Company Filter Banner for Cross-Module Connectivity */}
      {selectedClientObj && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 min-w-0">
            <Building2 size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="min-w-0">
              <span className="block truncate">
                Filtrando casos médicos y ausentismo de: <strong className="font-extrabold">{selectedClientObj.name}</strong> (NIT {selectedClientObj.nit})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedClientObj.employeeCount} trabajadores • ARL {selectedClientObj.primaryArlId.toUpperCase()} • Retorno SST {selectedClientObj.returnPercentage ?? 25}%
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/campo-sst?cliente=${encodeURIComponent(selectedClientObj.id)}`}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 shadow-sm"
              title="Ver visitas técnicas y auditoría 0312 de esta empresa"
            >
              <HardHat size={13} className="text-emerald-500" /> <span>Campo SST / 0312</span>
            </Link>
            <Link
              href={`/comisiones?cliente=${encodeURIComponent(selectedClientObj.id)}`}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 shadow-sm"
              title="Ver liquidación PILA y retorno de esta empresa"
            >
              <Calculator size={13} className="text-blue-500" /> <span>Bolsa PILA</span>
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
                setSelectedCompanyFilter('TODAS');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('cliente');
                  window.history.replaceState({}, '', url.pathname);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-all shadow-sm"
            >
              ✕ Ver consolidado
            </button>
          </div>
        </div>
      )}

      {/* Row 1: 5 Legal KPI Cards (Resolución 0312 de 2019) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. IFAT */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Frecuencia AT (IFAT)
              </span>
              <Activity size={15} className="text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {ifat}%
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              ({totalAccidents} AT / {totalWorkers} trabajadores)
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            Meta Res. 0312: &lt; 2.0%
          </div>
        </div>

        {/* 2. ISAT */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Severidad AT (ISAT)
              </span>
              <Clock size={15} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {isat}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {totalDaysLostAT} días perdidos por AT
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            Días por c/100 trabajadores
          </div>
        </div>

        {/* 3. Ausentismo Médico Total */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Tasa Ausentismo
              </span>
              <HeartPulse size={15} className="text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
              {iacm}%
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {totalDaysLostAll} días de incapacidad total
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            Sobre {scheduledWorkDays} días prog.
          </div>
        </div>

        {/* 4. Prevalencia Enf. Laboral */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Prevalencia EL (PEL)
              </span>
              <Stethoscope size={15} className="text-purple-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {pel}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {totalOccupationalDiseases} casos en estudio
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            Por cada 100.000 trabajadores
          </div>
        </div>

        {/* 5. Mortalidad AT */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Mortalidad AT (PATM)
              </span>
              <Shield size={15} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {patm}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              0 accidentes mortales
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            Meta 0% Cumplida
          </div>
        </div>
      </div>

      {/* Row 2: Visual Charts and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart A: Distribución por Tipo de Evento */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              ESTADÍSTICA DE EVENTOS
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Distribución de Eventos en el Periodo
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Accidentes */}
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Accidentes de Trabajo (AT)
                </span>
                <strong className="font-mono">{totalAccidents} ({filteredRecords.length > 0 ? Math.round((totalAccidents / filteredRecords.length) * 100) : 0}%)</strong>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${filteredRecords.length > 0 ? (totalAccidents / filteredRecords.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Ausentismo Común */}
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Ausentismo Médico Común
                </span>
                <strong className="font-mono">{totalCommonAbsence} ({filteredRecords.length > 0 ? Math.round((totalCommonAbsence / filteredRecords.length) * 100) : 0}%)</strong>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${filteredRecords.length > 0 ? (totalCommonAbsence / filteredRecords.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Enfermedad Laboral */}
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Enfermedad Laboral (EL)
                </span>
                <strong className="font-mono">{totalOccupationalDiseases} ({filteredRecords.length > 0 ? Math.round((totalOccupationalDiseases / filteredRecords.length) * 100) : 0}%)</strong>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${filteredRecords.length > 0 ? (totalOccupationalDiseases / filteredRecords.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Exámenes Ocupacionales */}
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Exámenes Periódicos
                </span>
                <strong className="font-mono">{totalPeriodicExams} ({filteredRecords.length > 0 ? Math.round((totalPeriodicExams / filteredRecords.length) * 100) : 0}%)</strong>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${filteredRecords.length > 0 ? (totalPeriodicExams / filteredRecords.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chart B: Días de Incapacidad Acumulados por Empresa */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              SEVERIDAD ACUMULADA
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Días de Incapacidad por Empresa
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {companyDaysLost.map((comp) => (
              <div key={comp.name} className="space-y-1">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{comp.name}</span>
                  <strong className="font-mono text-slate-900 dark:text-white shrink-0">
                    {comp.days} días ({comp.count} casos)
                  </strong>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                    style={{ width: `${Math.min((comp.days / (totalDaysLostAll || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart C: Diagnósticos CIE-10 */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              MORBILIDAD LABORAL
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Sistemas y Códigos CIE-10
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 dark:text-white block">S60-S69: Traumatismos y Miembros</strong>
                <span className="text-[10px] text-slate-500">Heridas abiertas, fracturas y golpes</span>
              </div>
              <span className="px-2 py-1 rounded-xl bg-rose-50 dark:bg-rose-950 font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                2 casos
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 dark:text-white block">M50-M54: Sistema Osteomuscular</strong>
                <span className="text-[10px] text-slate-500">Lumbago, dorsalgia y túnel carpiano</span>
              </div>
              <span className="px-2 py-1 rounded-xl bg-amber-50 dark:bg-amber-950 font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                2 casos
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 dark:text-white block">J00-J06: Sistema Respiratorio</strong>
                <span className="text-[10px] text-slate-500">Infecciones respiratorias agudas</span>
              </div>
              <span className="px-2 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                1 caso
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table of Events */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Libro Estadístico de Eventos, FURAT & Ausentismos
            </h3>
            <p className="text-[11px] text-slate-500">
              {filteredRecords.length} registros encontrados para auditoría y vigilancia epidemiológica.
            </p>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredRecords.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay registros médicos encontrados con los filtros seleccionados.
            </div>
          ) : (
            filteredRecords.map((r) => (
              <div key={`mob-${r.id}`} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-slate-500 block">{r.date}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{r.employeeName}</h4>
                    <span className="text-[10px] text-slate-500 block">{r.employeeRole} • {r.clientName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold shrink-0 ${
                      r.incidentType === 'ACCIDENTE_TRABAJO'
                        ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : r.incidentType === 'ENFERMEDAD_LABORAL'
                        ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                        : r.incidentType === 'AUSENTISMO_COMUN'
                        ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {r.incidentType.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded text-[10px]">
                      {r.diagnosisCie10}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate">{r.diagnosisDescription}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                    <span>Incapacidad: <strong className="text-slate-800 dark:text-slate-200">{r.daysLost} días</strong></span>
                    <span>FURAT: <strong className="font-mono text-slate-700 dark:text-slate-300">{r.furatFurepCode || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setViewingRecord(r)}
                    className="py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Eye size={13} /> <span>Ver Ficha</span>
                  </button>
                  <button
                    onClick={() => openEditRecord(r)}
                    className="py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-400 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={13} /> <span>Editar</span>
                  </button>
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
                <th className="py-3 px-4">Trabajador / Cargo</th>
                <th className="py-3 px-4">Tipo de Evento</th>
                <th className="py-3 px-4">Diagnóstico CIE-10</th>
                <th className="py-3 px-4 text-center">Incapacidad</th>
                <th className="py-3 px-4">Radicado FURAT/FUREL</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] text-slate-500 block">{r.date}</span>
                    <strong className="font-bold text-slate-900 dark:text-white text-xs">{r.clientName}</strong>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-800 dark:text-slate-200 block">{r.employeeName}</strong>
                    <span className="text-[10px] text-slate-500 block">{r.employeeRole} • {r.employeeDocument}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        r.incidentType === 'ACCIDENTE_TRABAJO'
                          ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : r.incidentType === 'ENFERMEDAD_LABORAL'
                          ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : r.incidentType === 'AUSENTISMO_COMUN'
                          ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {r.incidentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-1">
                      {r.diagnosisCie10}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-1">{r.diagnosisDescription}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {r.daysLost} días
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {r.furatFurepCode || 'No aplica'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewingRecord(r)}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                        title="Abrir Ficha Técnica Epidemiológica"
                      >
                        <Eye size={12} /> <span>Ver</span>
                      </button>
                      <button
                        onClick={() => openEditRecord(r)}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                        title="Editar Caso Médico"
                      >
                        <Edit2 size={12} /> <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(r.id, r.employeeName)}
                        className="p-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VER FICHA TÉCNICA EPIDEMIOLÓGICA (100% OPERATIVO) */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 printable-modal-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto printable-modal-box">
            <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => openEditRecord(viewingRecord)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Editar datos de esta ficha médica"
              >
                <Edit2 size={13} />
                <span>Editar Ficha</span>
              </button>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg no-print cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 print:border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 print:text-blue-800 block">
                    SISTEMA DE GESTIÓN SG-SST • RES. 0312 / DECRETO 1072
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-slate-900">
                    Ficha Técnica de Investigación & Ausentismo Laboral
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono print:border print:border-slate-400 ${
                    viewingRecord.incidentType === 'ACCIDENTE_TRABAJO'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300'
                      : viewingRecord.incidentType === 'ENFERMEDAD_LABORAL'
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300'
                  }`}
                >
                  {viewingRecord.incidentType.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div
              id="ficha-medica-sheet"
              className="space-y-4 text-xs official-document-sheet print:p-0 print:border-none print:shadow-none print:bg-white print:text-slate-900"
            >
              {/* Official Medical Header */}
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
                      {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS'} • ÁREA MÉDICO-LABORAL
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      NIT: {agencyProfile?.nit || '901.884.200-1'} • RUI MinTrabajo: {agencyProfile?.ruiNumber || 'RUI-MINTRABAJO-2024-8849'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span className="font-mono font-bold block">REG: MED-{viewingRecord.id.toUpperCase()}</span>
                  <span>Radicación FURAT/FUREP</span>
                </div>
              </div>

              {/* Employee & Company Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Trabajador Afectado:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 text-sm block">{viewingRecord.employeeName}</strong>
                  <span className="text-slate-500 print:text-slate-600 text-[11px] font-mono">{viewingRecord.employeeDocument} • {viewingRecord.employeeRole}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Empresa Empleadora:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 text-sm block">{viewingRecord.clientName}</strong>
                  <span className="text-slate-500 print:text-slate-600 text-[11px]">Fecha del Evento: <strong>{viewingRecord.date}</strong></span>
                </div>
              </div>

              {/* Clinical & Diagnostic Details */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-white space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Código CIE-10:</span>
                    <strong className="font-mono text-base font-black text-blue-600 dark:text-blue-400 print:text-blue-800">
                      {viewingRecord.diagnosisCie10}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Días de Incapacidad:</span>
                    <strong className="font-mono text-base font-black text-rose-600 dark:text-rose-400 print:text-rose-800">
                      {viewingRecord.daysLost} días
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Radicado Oficial FURAT:</span>
                    <strong className="font-mono text-xs text-slate-800 dark:text-slate-200 print:text-slate-900">
                      {viewingRecord.furatFurepCode || 'Sin radicado FURAT'}
                    </strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Diagnóstico Médico / Descripción del Evento:</span>
                  <p className="text-slate-800 dark:text-slate-200 print:text-slate-900 font-medium mt-0.5">
                    {viewingRecord.diagnosisDescription}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 text-[10px] block">Programa de Vigilancia Epidemiológica (PVE):</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 print:bg-slate-100 text-indigo-700 dark:text-indigo-400 print:text-slate-900 font-bold text-[10px] mt-0.5">
                    {viewingRecord.pveProgram || 'NINGUNO'}
                  </span>
                </div>
              </div>

              {/* Medical Notes & Interventions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 space-y-2">
                <strong className="text-slate-900 dark:text-white print:text-slate-900 block font-bold">
                  Concepto Médico-Laboral & Recomendaciones de Reintegro:
                </strong>
                <p className="text-slate-600 dark:text-slate-300 print:text-slate-800 leading-relaxed">
                  {viewingRecord.medicalNotes}
                </p>
              </div>

              {/* Professional Signature Block */}
              <div className="pt-6 grid grid-cols-2 gap-8 page-break-inside-avoid">
                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    {viewingRecord.createdByDoctor || 'DR. ALEJANDRO PINEDO'}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Médico Especialista en Seguridad y Salud en el Trabajo
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
                    R.M. 08-11429 • Licencia SST: 4892-2021
                  </p>
                </div>

                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    RESPONSABLE SG-SST EMPRESA
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Recibido para Seguimiento y Custodia
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-bold truncate">
                    {viewingRecord.clientName}
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">Sello y Firma de Recepción</p>
                </div>
              </div>

              {/* Legal Footer */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800 print:border-slate-300 font-sans text-[9px] text-slate-500 flex justify-between items-center">
                <span>Historia ocupacional y concepto médico confidencial conforme a la Resolución 2346 de 2007.</span>
                <span>PRAXIS PREVENCIÓN Y SEGUROS LTDA.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => handleDeleteRecord(viewingRecord.id, viewingRecord.employeeName)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900/50"
              >
                <Trash2 size={13} />
                <span>Eliminar Registro</span>
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => openEditRecord(viewingRecord)}
                  className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={13} /> Editar Ficha
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => printDocumentById('ficha-medica-sheet', `Ficha Medica - ${viewingRecord.employeeName}`)}
                  className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Ficha Técnica / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO EVENTO / FURAT */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                VIGILANCIA EPIDEMIOLÓGICA & FURAT
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Registrar Novedad de Accidentalidad o Ausentismo
              </h3>
            </div>

            <form onSubmit={handleSaveNewRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Empresa Cliente</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.employeeCount} trab.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Tipo de Novedad</label>
                  <select
                    value={newIncidentType}
                    onChange={(e) => setNewIncidentType(e.target.value as MedicalRecord['incidentType'])}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    <option value="ACCIDENTE_TRABAJO">Accidente de Trabajo (AT)</option>
                    <option value="AUSENTISMO_COMUN">Ausentismo Común (Enfermedad General)</option>
                    <option value="ENFERMEDAD_LABORAL">Enfermedad Laboral (EL)</option>
                    <option value="EXAMEN_MEDICO">Examen Periódico Ocupacional</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Fecha del Evento</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Cédula del Trabajador</label>
                  <input
                    type="text"
                    placeholder="CC 1.047..."
                    value={newEmployeeDocument}
                    onChange={(e) => setNewEmployeeDocument(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Carlos Ramírez"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    placeholder="Ej. Operario de Producción"
                    value={newEmployeeRole}
                    onChange={(e) => setNewEmployeeRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Días de Incapacidad</label>
                  <input
                    type="number"
                    value={newDaysLost}
                    onChange={(e) => setNewDaysLost(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Código CIE-10</label>
                  <input
                    type="text"
                    placeholder="Ej. S61.0, M54.5, J06.9"
                    value={newDiagnosisCie10}
                    onChange={(e) => setNewDiagnosisCie10(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Radicado FURAT / FUREL</label>
                  <input
                    type="text"
                    placeholder="FURAT-2026-..."
                    value={newFuratFurepCode}
                    onChange={(e) => setNewFuratFurepCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Descripción del Diagnóstico</label>
                <input
                  type="text"
                  value={newDiagnosisDescription}
                  onChange={(e) => setNewDiagnosisDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Notas de Manejo y Recomendaciones Laborales
                </label>
                <textarea
                  rows={2}
                  value={newMedicalNotes}
                  onChange={(e) => setNewMedicalNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
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
                  Guardar Novedad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR FICHA TÉCNICA / CASO MÉDICO */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Edit2 size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  EDICIÓN OFICIAL DE FICHA TÉCNICA • REG: MED-{editingRecord.id.toUpperCase()}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Modificar Registro de Accidente o Ausentismo
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveEditedRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Empresa Cliente</label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.employeeCount} trab.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Tipo de Novedad</label>
                  <select
                    value={editIncidentType}
                    onChange={(e) => setEditIncidentType(e.target.value as MedicalRecord['incidentType'])}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    <option value="ACCIDENTE_TRABAJO">Accidente de Trabajo (AT)</option>
                    <option value="AUSENTISMO_COMUN">Ausentismo Común (Enfermedad General)</option>
                    <option value="ENFERMEDAD_LABORAL">Enfermedad Laboral (EL)</option>
                    <option value="EXAMEN_MEDICO">Examen Periódico Ocupacional</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Fecha del Evento</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Cédula del Trabajador</label>
                  <input
                    type="text"
                    placeholder="CC 1.047..."
                    value={editEmployeeDocument}
                    onChange={(e) => setEditEmployeeDocument(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Carlos Ramírez"
                    value={editEmployeeName}
                    onChange={(e) => setEditEmployeeName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    placeholder="Ej. Operario de Producción"
                    value={editEmployeeRole}
                    onChange={(e) => setEditEmployeeRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Días de Incapacidad</label>
                  <input
                    type="number"
                    value={editDaysLost}
                    onChange={(e) => setEditDaysLost(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Código CIE-10</label>
                  <input
                    type="text"
                    placeholder="Ej. S61.0, M54.5, J06.9"
                    value={editDiagnosisCie10}
                    onChange={(e) => setEditDiagnosisCie10(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Radicado FURAT / FUREP</label>
                  <input
                    type="text"
                    placeholder="FURAT-2026-..."
                    value={editFuratFurepCode}
                    onChange={(e) => setEditFuratFurepCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Programa PVE Asignado</label>
                  <select
                    value={editPveProgram}
                    onChange={(e) => setEditPveProgram(e.target.value as MedicalRecord['pveProgram'])}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-semibold"
                  >
                    <option value="NINGUNO">Ninguno / No Aplica</option>
                    <option value="ERGONOMICO">PVE Osteomuscular / Ergonómico</option>
                    <option value="RUIDO">PVE Conservación Auditiva (Ruido)</option>
                    <option value="BIOMECANICO">PVE Biomecánico</option>
                    <option value="PSICOSOCIAL">PVE Riesgo Psicosocial</option>
                    <option value="QUIMICO">PVE Riesgo Químico</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Médico Especialista SST</label>
                  <input
                    type="text"
                    value={editDoctorName}
                    onChange={(e) => setEditDoctorName(e.target.value)}
                    placeholder="Nombre del Médico y Reg."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Descripción del Diagnóstico</label>
                <input
                  type="text"
                  value={editDiagnosisDescription}
                  onChange={(e) => setEditDiagnosisDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Notas de Manejo y Recomendaciones Laborales
                </label>
                <textarea
                  rows={3}
                  value={editMedicalNotes}
                  onChange={(e) => setNewMedicalNotes ? setEditMedicalNotes(e.target.value) : null}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={14} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
