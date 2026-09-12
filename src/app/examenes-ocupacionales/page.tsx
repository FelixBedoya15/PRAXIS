'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Building2,
  Search,
  Plus,
  Filter,
  FileCheck,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Printer,
  ChevronRight,
  Shield,
  Eye,
  Edit2,
  Trash2,
  X,
  FileText,
  Activity,
  HeartPulse,
  Sparkles,
  Info,
  Layers,
  Calendar,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  ClientCompany,
  PilaRecord,
  OccupationalExam,
  ExamCatalogItem,
  OccupationalExamType,
  AptitudeStatus,
  AgencyProfile,
} from '@/types';
import {
  getStoredClients,
  getStoredPilaRecords,
  getStoredOccupationalExams,
  saveStoredOccupationalExams,
  getStoredAgencyProfile,
} from '@/lib/storage';
import { OCCUPATIONAL_EXAM_CATALOG } from '@/lib/data';
import { printDocumentById } from '@/lib/printUtils';

export default function ExamenesOcupacionalesPage() {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [pilaRecords, setPilaRecords] = useState<PilaRecord[]>([]);
  const [exams, setExams] = useState<OccupationalExam[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  // Filters & Search
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('TODAS');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('TODOS');
  const [selectedAptitudeFilter, setSelectedAptitudeFilter] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [certificateExam, setCertificateExam] = useState<OccupationalExam | null>(null);
  const [editingExam, setEditingExam] = useState<OccupationalExam | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Exam Form State
  const [formClientId, setFormClientId] = useState<string>('');
  const [formEmployeeDocument, setFormEmployeeDocument] = useState<string>('');
  const [formEmployeeName, setFormEmployeeName] = useState<string>('');
  const [formEmployeeRole, setFormEmployeeRole] = useState<string>('');
  const [formWorkCenter, setFormWorkCenter] = useState<string>('');
  const [formExamType, setFormExamType] = useState<OccupationalExamType>('PERIODICO');
  const [formSpecializedEmphasis, setFormSpecializedEmphasis] = useState<string>('Trabajo Seguro en Alturas (Res. 4272/2021)');
  const [formSelectedTests, setFormSelectedTests] = useState<string[]>(['EXAM_CLINICO', 'VISIOMETRIA', 'AUDIOMETRIA']);
  const [formAptitudeStatus, setFormAptitudeStatus] = useState<AptitudeStatus>('APTO');
  const [formRestrictions, setFormRestrictions] = useState<string>('Ninguna.');
  const [formRecommendations, setFormRecommendations] = useState<string>('Uso de EPP y pausas activas osteomusculares cada 2 horas.');
  const [formDoctorName, setFormDoctorName] = useState<string>('Dra. Marcela Salazar Botero');
  const [formDoctorLicense, setFormDoctorLicense] = useState<string>('Licencia SST Res. 4192 / Reg. Médico 8841');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const cls = getStoredClients();
    setClients(cls);
    setPilaRecords(getStoredPilaRecords());
    setExams(getStoredOccupationalExams());
    setAgencyProfile(getStoredAgencyProfile());

    if (cls.length > 0) {
      setFormClientId(cls[0].id);
    }

    // Check URL parameters for direct cross-module navigation
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetClientId = params.get('cliente');
      if (targetClientId) {
        const found = cls.find((c) => c.id === targetClientId);
        if (found) {
          setSelectedCompanyFilter(found.id);
          setFormClientId(found.id);
        }
      }
    }

    const handleSync = () => {
      setClients(getStoredClients());
      setPilaRecords(getStoredPilaRecords());
      setExams(getStoredOccupationalExams());
      setAgencyProfile(getStoredAgencyProfile());
    };

    window.addEventListener('praxis_data_synced', handleSync);
    window.addEventListener('praxis_profile_updated', handleSync);
    return () => {
      window.removeEventListener('praxis_data_synced', handleSync);
      window.removeEventListener('praxis_profile_updated', handleSync);
    };
  }, []);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Reinvestment Bag Calculations
  const calculateCompanyBag = (clientId: string) => {
    const returnAccumulated = pilaRecords
      .filter((p) => p.clientId === clientId)
      .reduce((sum, p) => sum + (p.clientReturnAmount || 0), 0);

    const examsSpent = exams
      .filter((e) => e.clientId === clientId && e.coveredByReinvestment)
      .reduce((sum, e) => sum + (e.totalCost || 0), 0);

    const availableBalance = returnAccumulated - examsSpent;

    return {
      returnAccumulated,
      examsSpent,
      availableBalance,
      percentUsed: returnAccumulated > 0 ? Math.min(100, Math.round((examsSpent / returnAccumulated) * 100)) : 0,
    };
  };

  // Global Reinvestment Totals
  const targetClients = selectedCompanyFilter === 'TODAS'
    ? clients
    : clients.filter((c) => c.id === selectedCompanyFilter);

  const totalReturnAccumulated = targetClients.reduce((sum, c) => {
    return sum + calculateCompanyBag(c.id).returnAccumulated;
  }, 0);

  const totalExamsSpent = targetClients.reduce((sum, c) => {
    return sum + calculateCompanyBag(c.id).examsSpent;
  }, 0);

  const totalAvailableBalance = totalReturnAccumulated - totalExamsSpent;

  // Filtered Exams
  const filteredExams = exams.filter((e) => {
    const matchesCompany = selectedCompanyFilter === 'TODAS' || e.clientId === selectedCompanyFilter;
    const matchesType = selectedTypeFilter === 'TODOS' || e.examType === selectedTypeFilter;
    const matchesAptitude = selectedAptitudeFilter === 'TODAS' || e.aptitudeStatus === selectedAptitudeFilter;
    const matchesSearch =
      e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeDocument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.certificateCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesType && matchesAptitude && matchesSearch;
  });

  // Aptitude distribution counts
  const totalApto = filteredExams.filter((e) => e.aptitudeStatus === 'APTO').length;
  const totalConRestriccion = filteredExams.filter((e) => e.aptitudeStatus === 'APTO_CON_RESTRICCIONES').length;
  const totalNoApto = filteredExams.filter((e) => e.aptitudeStatus === 'NO_APTO').length;
  const totalAplazado = filteredExams.filter((e) => e.aptitudeStatus === 'APLAZADO').length;

  // Live calculation of current form test total
  const currentFormTestsTotal = formSelectedTests.reduce((sum, testId) => {
    const item = OCCUPATIONAL_EXAM_CATALOG.find((t) => t.id === testId);
    return sum + (item ? item.estimatedCost : 0);
  }, 0);

  const handleTestToggle = (testId: string) => {
    if (formSelectedTests.includes(testId)) {
      if (formSelectedTests.length === 1) {
        alert('Debe incluir al menos una prueba ocupacional.');
        return;
      }
      setFormSelectedTests(formSelectedTests.filter((id) => id !== testId));
    } else {
      setFormSelectedTests([...formSelectedTests, testId]);
    }
  };

  const handleSaveNewExam = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formClientId);
    if (!client) {
      alert('Por favor seleccione una empresa.');
      return;
    }

    const newExam: OccupationalExam = {
      id: `exam-${Date.now().toString().slice(-4)}`,
      clientId: client.id,
      clientName: client.name,
      employeeDocument: formEmployeeDocument.trim() || 'CC 1.000.000',
      employeeName: formEmployeeName.trim(),
      employeeRole: formEmployeeRole.trim(),
      workCenter: formWorkCenter.trim() || client.workCenters?.[0]?.name || 'Sede Principal',
      examType: formExamType,
      testsIncluded: formSelectedTests,
      totalCost: currentFormTestsTotal,
      coveredByReinvestment: true,
      aptitudeStatus: formAptitudeStatus,
      restrictions: formRestrictions.trim() || 'Ninguna.',
      recommendations: formRecommendations.trim() || 'Pausas activas y uso continuo de EPP.',
      specializedEmphasis: formSpecializedEmphasis,
      doctorName: formDoctorName,
      doctorLicense: formDoctorLicense,
      date: formDate,
      certificateCode: `CERT-${formExamType.slice(0, 3)}-${formDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      expiresAt: new Date(new Date(formDate).setFullYear(new Date(formDate).getFullYear() + 1)).toISOString().split('T')[0],
    };

    const updated = [newExam, ...exams];
    setExams(updated);
    saveStoredOccupationalExams(updated);
    setShowNewModal(false);
    showNotification(`Examen ocupacional de ${newExam.employeeName} registrado con cargo a la Bolsa de Reinversión SST.`);
  };

  const handleSaveEditExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    const updated = exams.map((ex) => (ex.id === editingExam.id ? editingExam : ex));
    setExams(updated);
    saveStoredOccupationalExams(updated);
    setShowEditModal(false);
    setEditingExam(null);
    showNotification('Concepto y examen ocupacional actualizados correctamente.');
  };

  const handleDeleteExam = (id: string, name: string) => {
    if (confirm(`¿Está seguro de eliminar el registro del examen ocupacional de ${name}?`)) {
      const updated = exams.filter((e) => e.id !== id);
      setExams(updated);
      saveStoredOccupationalExams(updated);
      showNotification(`Examen ocupacional de ${name} eliminado.`);
    }
  };

  const selectedClientObj = clients.find((c) => c.id === selectedCompanyFilter);
  const selectedClientBag = selectedClientObj ? calculateCompanyBag(selectedClientObj.id) : null;
  const modalClientBag = calculateCompanyBag(formClientId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up text-xs font-semibold">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/20">
              Resolución 1843 de 1991 • Res. 2346 de 2007
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
              Bolsa de Reinversión SST
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Stethoscope className="text-emerald-600 dark:text-emerald-400" size={26} />
            <span>Exámenes Médicos Ocupacionales & Pruebas Especializadas</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Gestión integral de evaluaciones médicas ocupacionales con énfasis por actividad económica (alturas, alimentos, PESV, químicos). Financiado al 100% mediante el retorno de comisiones ARL (<strong>$0 COP de desembolso para el cliente</strong>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowCatalogModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            title="Ver marco legal y pruebas complementarias según Res. 1843/1991"
          >
            <Layers size={15} className="text-blue-500" />
            <span>Catálogo Normativo Res. 1843</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-emerald-500/20"
          >
            <Plus size={16} />
            <span>Registrar Examen Ocupacional</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards - Financiación con Bolsa de Reinversión SST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Retorno Acumulado */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Bolsa de Reinversión SST
              </span>
              <DollarSign size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCOP(totalReturnAccumulated)}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Retorno generado por comisiones PILA
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            {selectedCompanyFilter === 'TODAS' ? `${clients.length} empresas afiliadas` : 'Empresa seleccionada'}
          </div>
        </div>

        {/* Card 2: Ejecutado en Exámenes */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Invertido en Exámenes
              </span>
              <HeartPulse size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
              {formatCOP(totalExamsSpent)}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {filteredExams.length} evaluaciones médicas cubiertas
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            100% Cubierto con Retorno
          </div>
        </div>

        {/* Card 3: Saldo Disponible */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Saldo Disponible en Bolsa
              </span>
              <Zap size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-700 dark:text-purple-400 font-mono mt-1">
              {formatCOP(Math.max(0, totalAvailableBalance))}
            </div>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Para nuevos ingresos, periódicos o brigadas
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
            {totalReturnAccumulated > 0
              ? `${Math.round(((totalReturnAccumulated - totalExamsSpent) / totalReturnAccumulated) * 100)}% disponible`
              : 'Sin saldo'}
          </div>
        </div>

        {/* Card 4: Ahorro de Bolsillo Cliente */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Desembolso del Cliente
              </span>
              <Shield size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1">
              $0 COP
            </div>
            <span className="text-[10px] text-emerald-800 dark:text-emerald-400 block leading-tight font-medium">
              Ahorro directo para el empleador
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
            Financiado por PRAXIS Intermediación ARL
          </div>
        </div>
      </div>

      {/* Row 2: Selected Client Dedicated Reinvestment Widget */}
      {selectedClientObj && selectedClientBag && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
                {selectedClientObj.primaryArlId.toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedClientObj.name}</span>
                  <span className="text-[10px] font-mono font-normal text-slate-500">
                    (NIT {selectedClientObj.nit})
                  </span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  {selectedClientObj.economicActivity} • {selectedClientObj.employeeCount} trabajadores • Retorno pactado: <strong>{selectedClientObj.returnPercentage ?? 25}%</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Saldo en Bolsa:</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCOP(selectedClientBag.availableBalance)}
                </strong>
              </div>
              <button
                onClick={() => {
                  setFormClientId(selectedClientObj.id);
                  setShowNewModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1"
              >
                <Plus size={14} /> <span>Agendar Examen</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-500">
                Invertido en exámenes: <strong>{formatCOP(selectedClientBag.examsSpent)}</strong> de <strong>{formatCOP(selectedClientBag.returnAccumulated)}</strong>
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {selectedClientBag.percentUsed}% de la bolsa ejecutada
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  selectedClientBag.percentUsed > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${selectedClientBag.percentUsed}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Filters & Search Controls */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Company Filter */}
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-bold"
          >
            <option value="TODAS">🏢 Todas las Empresas ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.employeeCount} trab.)
              </option>
            ))}
          </select>

          {/* Exam Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium"
          >
            <option value="TODOS">Todos los Tipos de Examen</option>
            <option value="INGRESO">Ingreso (Preocupacional)</option>
            <option value="PERIODICO">Periódico Programado</option>
            <option value="RETIRO">Retiro (Egreso)</option>
            <option value="POST_INCAPACIDAD">Post-Incapacidad / Reintegro</option>
            <option value="CAMBIO_OCUPACION">Cambio de Ocupación</option>
          </select>

          {/* Aptitude Status Filter */}
          <select
            value={selectedAptitudeFilter}
            onChange={(e) => setSelectedAptitudeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium"
          >
            <option value="TODAS">Todos los Conceptos de Aptitud</option>
            <option value="APTO">Apto</option>
            <option value="APTO_CON_RESTRICCIONES">Apto con Restricciones</option>
            <option value="NO_APTO">No Apto</option>
            <option value="APLAZADO">Aplazado</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por trabajador, cédula o radicado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Row 4: Summary of Aptitudes in Filtered Records */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
          <span className="font-bold text-emerald-700 dark:text-emerald-400">Apto</span>
          <strong className="font-mono text-base text-emerald-800 dark:text-emerald-300">{totalApto}</strong>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
          <span className="font-bold text-amber-700 dark:text-amber-400">Apto con Restricción</span>
          <strong className="font-mono text-base text-amber-800 dark:text-amber-300">{totalConRestriccion}</strong>
        </div>
        <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
          <span className="font-bold text-rose-700 dark:text-rose-400">No Apto</span>
          <strong className="font-mono text-base text-rose-800 dark:text-rose-300">{totalNoApto}</strong>
        </div>
        <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
          <span className="font-bold text-blue-700 dark:text-blue-400">Aplazado</span>
          <strong className="font-mono text-base text-blue-800 dark:text-blue-300">{totalAplazado}</strong>
        </div>
      </div>

      {/* Row 5: Table of Occupational Exams */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Registro de Evaluaciones Médicas Ocupacionales
            </h3>
            <span className="text-[10px] text-slate-500">
              Mostrando {filteredExams.length} de {exams.length} exámenes registrados
            </span>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredExams.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay exámenes ocupacionales encontrados con los filtros actuales.
            </div>
          ) : (
            filteredExams.map((ex) => (
              <div key={`mob-exam-${ex.id}`} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-slate-500 block">{ex.date}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">{ex.employeeName}</h4>
                    <span className="text-[10px] text-slate-500 block">{ex.employeeRole} • {ex.clientName}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold shrink-0 ${
                      ex.aptitudeStatus === 'APTO'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        : ex.aptitudeStatus === 'APTO_CON_RESTRICCIONES'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                        : ex.aptitudeStatus === 'NO_APTO'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                    }`}
                  >
                    {ex.aptitudeStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo: <strong className="text-slate-800 dark:text-slate-200">{ex.examType}</strong></span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCOP(ex.totalCost)} (Bolsa)</span>
                  </div>
                  {ex.specializedEmphasis && (
                    <div className="text-[10px] text-slate-500 truncate">
                      Énfasis: <strong className="text-slate-700 dark:text-slate-300">{ex.specializedEmphasis}</strong>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ex.testsIncluded.map((testId) => {
                      const item = OCCUPATIONAL_EXAM_CATALOG.find((t) => t.id === testId);
                      return (
                        <span key={testId} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[9px] font-mono">
                          {item ? item.shortName : testId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setCertificateExam(ex)}
                    className="py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <Printer size={12} /> <span>Certificado</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingExam(ex);
                      setShowEditModal(true);
                    }}
                    className="py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Edit2 size={12} /> <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteExam(ex.id, ex.employeeName)}
                    className="py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} /> <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Fecha / Empresa</th>
                <th className="py-3 px-4">Trabajador / Cargo</th>
                <th className="py-3 px-4">Tipo & Énfasis</th>
                <th className="py-3 px-4">Pruebas Especializadas</th>
                <th className="py-3 px-4 text-center">Concepto de Aptitud</th>
                <th className="py-3 px-4 text-right">Costo Cubierto</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron exámenes ocupacionales registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredExams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] text-slate-500 block">{ex.date}</span>
                      <strong className="font-bold text-slate-900 dark:text-white text-xs block truncate max-w-[180px]">
                        {ex.clientName}
                      </strong>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">{ex.workCenter || 'Sede Principal'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 dark:text-white block font-bold">{ex.employeeName}</strong>
                      <span className="text-[10px] text-slate-500 block">{ex.employeeRole} • {ex.employeeDocument}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                        {ex.examType}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">
                        {ex.specializedEmphasis || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {ex.testsIncluded.map((testId) => {
                          const item = OCCUPATIONAL_EXAM_CATALOG.find((t) => t.id === testId);
                          return (
                            <span
                              key={testId}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                              title={item ? item.name : testId}
                            >
                              {item ? item.shortName : testId}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${
                          ex.aptitudeStatus === 'APTO'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : ex.aptitudeStatus === 'APTO_CON_RESTRICCIONES'
                            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : ex.aptitudeStatus === 'NO_APTO'
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {ex.aptitudeStatus === 'APTO'
                          ? '✓ APTO'
                          : ex.aptitudeStatus === 'APTO_CON_RESTRICCIONES'
                          ? '⚠ APTO CON RESTRICCIÓN'
                          : ex.aptitudeStatus === 'NO_APTO'
                          ? '✕ NO APTO'
                          : '⏱ APLAZADO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs block">
                        {formatCOP(ex.totalCost)}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">Cubierto con Bolsa</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setCertificateExam(ex)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          title="Generar Certificado Oficial de Aptitud Médica (Res. 2346/2007)"
                        >
                          <Printer size={13} />
                          <span>Certificado</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingExam(ex);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-600 dark:text-slate-300 transition-all"
                          title="Editar examen"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(ex.id, ex.employeeName)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition-all"
                          title="Eliminar examen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CATÁLOGO DE PRUEBAS NORMATIVAS (RES. 1843 / 2346) */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  MARCO NORMATIVO COLOMBIANO
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-blue-500" />
                  <span>Catálogo de Exámenes Médicos Ocupacionales & Pruebas Especializadas</span>
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                De conformidad con la <strong>Resolución 1843 de 1991</strong> y la <strong>Resolución 2346 de 2007</strong> del Ministerio de la Protección Social, los exámenes médicos ocupacionales deben adecuarse estrictamente al profesiograma y a los factores de riesgo específicos de cada actividad económica (ruido, alturas, polvos, químicos, manipulación de alimentos).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {OCCUPATIONAL_EXAM_CATALOG.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {item.normativeBase}
                        </span>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xs mt-1">
                          {item.name}
                        </h4>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                        {formatCOP(item.estimatedCost)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      {item.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                        Sectores / Actividades Afines:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.targetActivities.map((act) => (
                          <span
                            key={act}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] border border-slate-200 dark:border-slate-700"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Cerrar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRO DE NUEVO EXAMEN OCUPACIONAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  RESOLUCIÓN 2346 DE 2007 • ARTÍCULO 18
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope size={18} className="text-emerald-500" />
                  <span>Registrar Evaluación Médica Ocupacional</span>
                </h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewExam} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Company Selector with Reinvestment Bag Balance */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-700 dark:text-slate-300 font-bold block">
                    Empresa Empleadora Afiliada
                  </label>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    Saldo disponible: {formatCOP(modalClientBag.availableBalance)}
                  </span>
                </div>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.employeeCount} trab. • ARL {c.primaryArlId.toUpperCase()})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">
                  * El costo de este examen se descontará automáticamente de la Bolsa de Retorno PILA ($0 COP para la empresa).
                </span>
              </div>

              {/* Worker Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Cédula / Documento del Trabajador
                  </label>
                  <input
                    type="text"
                    placeholder="CC 1.098.452.120"
                    value={formEmployeeDocument}
                    onChange={(e) => setFormEmployeeDocument(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Nombres y Apellidos Completos
                  </label>
                  <input
                    type="text"
                    placeholder="Pedro Pablo Quintero..."
                    value={formEmployeeName}
                    onChange={(e) => setFormEmployeeName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Cargo u Ocupación
                  </label>
                  <input
                    type="text"
                    placeholder="Operario de Soldadura, Conductor..."
                    value={formEmployeeRole}
                    onChange={(e) => setFormEmployeeRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Centro de Trabajo / Sede
                  </label>
                  <input
                    type="text"
                    placeholder="Planta Principal, Taller El Centro..."
                    value={formWorkCenter}
                    onChange={(e) => setFormWorkCenter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Exam Type & Emphasis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Tipo de Examen Médico
                  </label>
                  <select
                    value={formExamType}
                    onChange={(e) => setFormExamType(e.target.value as OccupationalExamType)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                  >
                    <option value="INGRESO">Ingreso (Preocupacional)</option>
                    <option value="PERIODICO">Periódico Programado Anual</option>
                    <option value="RETIRO">Retiro (Egreso Ocupacional)</option>
                    <option value="POST_INCAPACIDAD">Post-Incapacidad / Reintegro</option>
                    <option value="CAMBIO_OCUPACION">Cambio de Ocupación</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Fecha de la Evaluación
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Énfasis Ocupacional / Factor de Riesgo Principal
                </label>
                <select
                  value={formSpecializedEmphasis}
                  onChange={(e) => setFormSpecializedEmphasis(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-medium"
                >
                  <option value="Trabajo Seguro en Alturas (Res. 4272/2021)">Trabajo Seguro en Alturas (&gt; 1.50m - Res. 4272/2021)</option>
                  <option value="Trabajo en Espacios Confinados (Res. 0491/2020)">Trabajo en Espacios Confinados (Res. 0491/2020)</option>
                  <option value="Manipulación Higiénica de Alimentos (Res. 2674/2013)">Manipulación Higiénica de Alimentos (Res. 2674/2013)</option>
                  <option value="Plan Estratégico de Seguridad Vial - PESV Conductores (Res. 1565)">PESV / Conductores y Operadores (Res. 1565/2014)</option>
                  <option value="Exposición a Ruido Industrial / Metalmecánica">Exposición a Ruido Industrial / Metalmecánica</option>
                  <option value="Exposición a Polvos, Humos Metálicos y Vapores">Exposición a Polvos, Humos Metálicos y Vapores</option>
                  <option value="Manejo Seguro de Plaguicidas y Agroquímicos">Manejo Seguro de Plaguicidas y Agroquímicos</option>
                  <option value="Biomecánico / Movimientos Repetitivos / Carga Física">Biomecánico / Movimientos Repetitivos / Carga Física</option>
                  <option value="Administrativo / Pantallas de Visualización de Datos">Administrativo / PVD</option>
                </select>
              </div>

              {/* Multi-Selection of Specialized Tests */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-bold block">
                    Pruebas Complementarias Incluidas (Res. 1843/1991)
                  </label>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Total: {formatCOP(currentFormTestsTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {OCCUPATIONAL_EXAM_CATALOG.map((test) => {
                    const isChecked = formSelectedTests.includes(test.id);
                    return (
                      <label
                        key={test.id}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTestToggle(test.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] block truncate">{test.shortName}</span>
                            <span className="text-[9px] text-slate-400 font-mono block truncate">{test.normativeBase}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0 ml-1">
                          {formatCOP(test.estimatedCost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Aptitude Status */}
              <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Concepto Médico de Aptitud Laboral (Res. 2346/2007)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'APTO', label: 'APTO', color: 'border-emerald-500 text-emerald-700 dark:text-emerald-400' },
                    { id: 'APTO_CON_RESTRICCIONES', label: 'CON RESTRICCIÓN', color: 'border-amber-500 text-amber-700 dark:text-amber-400' },
                    { id: 'NO_APTO', label: 'NO APTO', color: 'border-rose-500 text-rose-700 dark:text-rose-400' },
                    { id: 'APLAZADO', label: 'APLAZADO', color: 'border-blue-500 text-blue-700 dark:text-blue-400' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFormAptitudeStatus(st.id as AptitudeStatus)}
                      className={`py-2 px-1 rounded-xl border text-center font-extrabold text-[10px] transition-all cursor-pointer ${
                        formAptitudeStatus === st.id
                          ? `bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ${st.color}`
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Restrictions & Recommendations */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Restricciones Ocupacionales (si aplican)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Uso permanente de lentes formulados, evitar posturas forzadas..."
                  value={formRestrictions}
                  onChange={(e) => setFormRestrictions(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Recomendaciones Preventivas y del SG-SST
                </label>
                <textarea
                  rows={2}
                  value={formRecommendations}
                  onChange={(e) => setFormRecommendations(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 resize-none"
                />
              </div>

              {/* Doctor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Médico Especialista en SST
                  </label>
                  <input
                    type="text"
                    value={formDoctorName}
                    onChange={(e) => setFormDoctorName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Licencia SST / Registro Médico
                  </label>
                  <input
                    type="text"
                    value={formDoctorLicense}
                    onChange={(e) => setFormDoctorLicense(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-[11px]"
                    required
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Guardar con cargo a Bolsa SST</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDICIÓN DE EXAMEN OCUPACIONAL */}
      {showEditModal && editingExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  ACTUALIZACIÓN DE CONCEPTO
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Editar Examen de {editingExam.employeeName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExam(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditExam} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px]">Empresa: <strong>{editingExam.clientName}</strong></span>
                <span className="text-slate-500 block text-[10px]">Trabajador: <strong>{editingExam.employeeName}</strong> ({editingExam.employeeDocument})</span>
                <span className="text-slate-500 block text-[10px]">Radicado: <strong className="font-mono">{editingExam.certificateCode}</strong></span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Concepto Médico de Aptitud
                </label>
                <select
                  value={editingExam.aptitudeStatus}
                  onChange={(e) => setEditingExam({ ...editingExam, aptitudeStatus: e.target.value as AptitudeStatus })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                >
                  <option value="APTO">APTO</option>
                  <option value="APTO_CON_RESTRICCIONES">APTO CON RESTRICCIONES</option>
                  <option value="NO_APTO">NO APTO</option>
                  <option value="APLAZADO">APLAZADO</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Restricciones Ocupacionales
                </label>
                <textarea
                  rows={2}
                  value={editingExam.restrictions || ''}
                  onChange={(e) => setEditingExam({ ...editingExam, restrictions: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Recomendaciones Médicas y Preventivas
                </label>
                <textarea
                  rows={2}
                  value={editingExam.recommendations || ''}
                  onChange={(e) => setEditingExam({ ...editingExam, recommendations: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Notas Clínicas Confidenciales
                </label>
                <textarea
                  rows={2}
                  value={editingExam.clinicalNotes || ''}
                  onChange={(e) => setEditingExam({ ...editingExam, clinicalNotes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExam(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
                >
                  Actualizar Examen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CERTIFICADO OFICIAL DE APTITUD MÉDICA OCUPACIONAL (RES. 2346/2007) */}
      {certificateExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Modal Controls (Hidden in Print) */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between no-print print:hidden">
              <div className="flex items-center gap-2 text-xs">
                <Award size={16} className="text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Vista Previa del Certificado Médico de Aptitud Ocupacional
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printDocumentById('certificado-aptitud-sheet', `Certificado Aptitud - ${certificateExam.employeeName}`)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} />
                  <span>Imprimir Certificado</span>
                </button>
                <button
                  onClick={() => setCertificateExam(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet (Conforme Art. 18 Res. 2346/2007) */}
            <div
              id="certificado-aptitud-sheet"
              className="p-8 text-slate-900 bg-white font-sans text-xs space-y-5 print:p-6 print:m-0"
            >
              {/* Document Official Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                    alt={agencyProfile?.shortName || 'PRAXIS'}
                    className="h-10 w-auto object-contain max-h-12"
                  />
                  <div>
                    <h2 className="font-black text-sm tracking-tight uppercase text-slate-900">
                      {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA.'}
                    </h2>
                    <span className="text-[10px] text-slate-600 block font-mono">
                      NIT {agencyProfile?.nit || '901.884.200-1'} • Registro RUI Mintrabajo: {agencyProfile?.ruiNumber || 'RUI-MINTRABAJO-2024-8849'}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Área de Medicina Preventiva y del Trabajo • Asesoría Integral en Riesgos Laborales
                    </span>
                  </div>
                </div>

                <div className="text-right border-l-2 border-slate-200 pl-4">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Radicado Certificado:</span>
                  <strong className="font-mono text-xs text-slate-900 block">{certificateExam.certificateCode}</strong>
                  <span className="text-[9px] text-slate-500 font-mono">Fecha: {certificateExam.date}</span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h1 className="text-base font-black tracking-wider uppercase text-slate-900 border-b border-slate-300 pb-1 inline-block">
                  CERTIFICADO MÉDICO DE APTITUD OCUPACIONAL
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  Emitido en cumplimiento estricto del <strong>Artículo 18 de la Resolución 2346 de 2007</strong> y <strong>Resolución 1843 de 1991</strong>
                </p>
              </div>

              {/* Section 1: Employer Information */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/60 space-y-1 text-[11px]">
                <span className="font-black text-[10px] uppercase text-slate-700 block tracking-wider border-b border-slate-200 pb-1">
                  1. DATOS DE LA EMPRESA EMPLEADORA
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Razón Social:</span>
                    <strong className="font-bold text-slate-900">{certificateExam.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Centro de Trabajo / Sede:</span>
                    <strong className="font-bold text-slate-900">{certificateExam.workCenter || 'Sede Principal'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Worker Information */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/60 space-y-1 text-[11px]">
                <span className="font-black text-[10px] uppercase text-slate-700 block tracking-wider border-b border-slate-200 pb-1">
                  2. DATOS DEL TRABAJADOR EVALUADO
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Nombres y Apellidos:</span>
                    <strong className="font-bold text-slate-900">{certificateExam.employeeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cédula de Ciudadanía:</span>
                    <strong className="font-mono text-slate-900">{certificateExam.employeeDocument}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cargo / Ocupación:</span>
                    <strong className="font-bold text-slate-900">{certificateExam.employeeRole}</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Exam Type & Tests Practiced */}
              <div className="border border-slate-300 rounded-xl p-3 space-y-2 text-[11px]">
                <span className="font-black text-[10px] uppercase text-slate-700 block tracking-wider border-b border-slate-200 pb-1">
                  3. EVALUACIÓN Y PRUEBAS PARACLÍNICAS PRACTICADAS
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tipo de Evaluación Ocupacional:</span>
                    <strong className="font-bold text-slate-900 uppercase">
                      {certificateExam.examType === 'INGRESO'
                        ? 'Ingreso (Preocupacional)'
                        : certificateExam.examType === 'PERIODICO'
                        ? 'Periódico Programado Anual'
                        : certificateExam.examType === 'RETIRO'
                        ? 'Egreso (Retiro)'
                        : 'Post-Incapacidad / Reintegro'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Énfasis de la Evaluación:</span>
                    <strong className="font-bold text-slate-900">{certificateExam.specializedEmphasis || 'Medicina Ocupacional'}</strong>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-slate-500 block text-[10px] mb-1">Pruebas Complementarias Realizadas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {certificateExam.testsIncluded.map((testId) => {
                      const item = OCCUPATIONAL_EXAM_CATALOG.find((t) => t.id === testId);
                      return (
                        <span
                          key={testId}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-300"
                        >
                          ✓ {item ? item.name : testId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Aptitude Concept Box */}
              <div className="border-2 border-slate-900 rounded-2xl p-4 text-center space-y-2 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                  CONCEPTO MÉDICO DE APTITUD OCUPACIONAL
                </span>
                <div className="text-xl font-black tracking-wide font-sans text-slate-900 uppercase">
                  {certificateExam.aptitudeStatus === 'APTO'
                    ? 'APTO PARA EL CARGO'
                    : certificateExam.aptitudeStatus === 'APTO_CON_RESTRICCIONES'
                    ? 'APTO CON RESTRICCIONES OCUPACIONALES'
                    : certificateExam.aptitudeStatus === 'NO_APTO'
                    ? 'NO APTO PARA EL CARGO'
                    : 'APLAZADO (PENDIENTE PARACLÍNICOS)'}
                </div>
                <span className="text-[10px] text-slate-600 block">
                  Vigencia del Concepto: 1 año a partir de la fecha de expedición ({certificateExam.expiresAt})
                </span>
              </div>

              {/* Section 5: Restrictions & Recommendations */}
              <div className="space-y-3 text-[11px]">
                <div className="p-3 border border-slate-300 rounded-xl space-y-1">
                  <strong className="font-bold text-slate-900 block text-[11px]">
                    Restricciones Ocupacionales:
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    {certificateExam.restrictions || 'Ninguna. Puede desempeñar las tareas habituales de su puesto de trabajo.'}
                  </p>
                </div>

                <div className="p-3 border border-slate-300 rounded-xl space-y-1">
                  <strong className="font-bold text-slate-900 block text-[11px]">
                    Recomendaciones de Medicina Preventiva y SG-SST:
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    {certificateExam.recommendations || 'Uso continuo y adecuado de Elementos de Protección Personal (EPP), pausas activas osteomusculares periódicas e higiene postural.'}
                  </p>
                </div>
              </div>

              {/* Legal Non-Disclosure Notice (Res. 2346 Art. 18) */}
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-[9px] text-slate-600 leading-tight">
                <strong>NOTA LEGAL Y RESERVA DE HISTORIA CLÍNICA:</strong> En concordancia con el <em>Artículo 18 de la Resolución 2346 de 2007</em> del Ministerio de la Protección Social, se deja constancia de que en este certificado no se incluyen diagnósticos médicos clínicos, respetando la estricta reserva de la historia clínica ocupacional. El presente documento certifica únicamente el concepto de aptitud para las tareas propias del cargo evaluado.
              </div>

              {/* Section 6: Signatures & Fingerprint */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300">
                <div className="text-center space-y-1">
                  <div className="h-14 flex items-end justify-center">
                    <span className="font-serif italic text-slate-600 text-sm">Marcela Salazar Botero</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1">
                    <strong className="font-bold text-slate-900 block text-xs">{certificateExam.doctorName}</strong>
                    <span className="text-[10px] text-slate-600 block">{certificateExam.doctorLicense}</span>
                    <span className="text-[9px] text-slate-500 block">Médico Especialista en Seguridad y Salud en el Trabajo</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="h-14 flex items-end justify-center">
                    <div className="border border-dashed border-slate-400 w-14 h-14 rounded flex items-center justify-center text-[8px] text-slate-400">
                      Huella
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-1">
                    <strong className="font-bold text-slate-900 block text-xs">{certificateExam.employeeName}</strong>
                    <span className="text-[10px] text-slate-600 font-mono block">CC {certificateExam.employeeDocument}</span>
                    <span className="text-[9px] text-slate-500 block">Firma y Huella del Trabajador Notificado</span>
                  </div>
                </div>
              </div>

              {/* Financing footer */}
              <div className="text-center text-[8px] text-slate-400 pt-3 border-t border-slate-200">
                Servicio médico gestionado y valorizado por <strong>PRAXIS PREVENCIÓN Y SEGUROS</strong> a través de la Bolsa de Reinversión SST de Intermediación ARL. Valor: {formatCOP(certificateExam.totalCost)} (Sin cobro directo a la empresa).
              </div>
            </div>

            {/* Modal Bottom Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 no-print print:hidden">
              <button
                onClick={() => setCertificateExam(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => printDocumentById('certificado-aptitud-sheet', `Certificado Aptitud - ${certificateExam.employeeName}`)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Printer size={15} />
                <span>Imprimir Certificado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
