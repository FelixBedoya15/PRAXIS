'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  FileText,
  Printer,
  X,
  Search,
  Check,
  Layers,
  Percent,
  Upload,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  PieChart,
  BarChart3,
  RotateCcw,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { getStoredPilaRecords, saveStoredPilaRecords, getStoredClients, saveStoredClients, getStoredARLs, getStoredFieldVisits, getStoredAgencyProfile } from '@/lib/storage';
import { PilaRecord, ClientCompany, ARLCompany, RiskClass, RISK_RATES, FieldVisit, AgencyProfile } from '@/types';
import { calculateCompanyFinancials } from '@/lib/calculations';
import { printDocumentById } from '@/lib/printUtils';

export type TimeFilterMode = 'TODOS' | 'MES' | 'TRIMESTRE' | 'SEMESTRE' | 'ANUAL';

export default function ComisionesPage() {
  const [records, setRecords] = useState<PilaRecord[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [arls, setArls] = useState<ARLCompany[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [filterArl, setFilterArl] = useState<string>('TODAS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeClientFilter, setActiveClientFilter] = useState<ClientCompany | null>(null);

  // Filtros Temporales: Mes, Trimestre, Semestre y Año
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('TODOS');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [selectedSemester, setSelectedSemester] = useState<'S1' | 'S2'>('S2');

  // Modals
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedRecordForInvoice, setSelectedRecordForInvoice] = useState<PilaRecord | null>(null);

  // Form State for new Record
  const [selectedClientForNew, setSelectedClientForNew] = useState('');
  const [newMonth, setNewMonth] = useState('2026-08');
  const [newIbc, setNewIbc] = useState<number>(0);
  const [newPaidCommission, setNewPaidCommission] = useState<number>(0);
  const [newRisk, setNewRisk] = useState<RiskClass>('CLASE_I');
  const [newReturnPercentage, setNewReturnPercentage] = useState<number>(25);
  const [newNotes, setNewNotes] = useState('');

  // Simulation of CSV Import
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    const loadedRecords = getStoredPilaRecords();
    const clis = getStoredClients();
    const loadedArls = getStoredARLs();
    const loadedVisits = getStoredFieldVisits();

    setRecords(loadedRecords);
    setClients(clis);
    setArls(loadedArls);
    setFieldVisits(loadedVisits);
    setAgencyProfile(getStoredAgencyProfile());
    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    const handleDataSynced = () => {
      setRecords(getStoredPilaRecords());
      setClients(getStoredClients());
      setArls(getStoredARLs());
      setFieldVisits(getStoredFieldVisits());
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    window.addEventListener('praxis_data_synced', handleDataSynced);

    // Cross-module URL navigation ?cliente=ID
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetClientId = params.get('cliente');
      if (targetClientId) {
        const found = clis.find((c) => c.id === targetClientId);
        if (found) {
          setSelectedClientForNew(found.id);
          const arl = loadedArls.find((a) => a.id === found.primaryArlId);
          const fin = calculateCompanyFinancials(found, arl);
          setNewIbc(fin.totalIbc);
          setNewRisk(found.riskClass);
          setNewReturnPercentage(found.returnPercentage ?? 25);
          return () => {
            window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
            window.removeEventListener('praxis_data_synced', handleDataSynced);
          };
        }
      }
    }

    if (clis.length > 0) {
      setSelectedClientForNew(clis[0].id);
      setNewIbc(clis[0].monthlyIbc);
      setNewRisk(clis[0].riskClass);
      setNewReturnPercentage(clis[0].returnPercentage ?? 25);
    }

    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
      window.removeEventListener('praxis_data_synced', handleDataSynced);
    };
  }, []);

  // Keyboard shortcut listener to cleanly intercept Cmd+P / Ctrl+P when Invoice Modal is open
  useEffect(() => {
    if (!showInvoiceModal || !selectedRecordForInvoice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printDocumentById('cuenta-cobro-sheet', `Cuenta de Cobro - ${selectedRecordForInvoice.clientName}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInvoiceModal, selectedRecordForInvoice]);

  const handleClientChangeForNew = (clientId: string) => {
    setSelectedClientForNew(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      const arl = arls.find((a) => a.id === client.primaryArlId);
      const fin = calculateCompanyFinancials(client, arl);
      setNewIbc(fin.totalIbc);
      setNewRisk(client.riskClass);
      setNewReturnPercentage(client.returnPercentage ?? 25);
    }
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === selectedClientForNew);
    if (!client) return;

    const arl = arls.find((a) => a.id === client.primaryArlId);
    const fin = calculateCompanyFinancials(client, arl);
    const arlContribution = fin.isMultiRisk ? fin.totalArlContribution : newIbc * (RISK_RATES[newRisk]?.nominalRate || 0.00522);
    const commissionRate = fin.isMultiRisk ? fin.effectiveCommissionRate : (client.customCommissionOverride || arl?.defaultCommissionMatrix[client.conceptType]?.[newRisk] || 6.0);
    const expectedCommission = fin.isMultiRisk ? fin.totalCommission : arlContribution * (commissionRate / 100);
    const difference = newPaidCommission - expectedCommission;

    let status: PilaRecord['status'] = 'CONCILIADO';
    if (newPaidCommission === 0) {
      status = 'MORA';
    } else if (Math.abs(difference) > 500) {
      status = 'DIVERGENCIA';
    }

    // Trazabilidad Financiera Retefuente 10% y Retorno
    const returnPct = newReturnPercentage;
    const grossComm = expectedCommission;
    const retefuenteAmount = (newPaidCommission || expectedCommission) * 0.10;
    const netCommissionReceived = (newPaidCommission || expectedCommission) - retefuenteAmount;
    const clientReturnAmount = grossComm * (returnPct / 100);
    const agencyNetMargin = netCommissionReceived - clientReturnAmount;

    const newRec: PilaRecord = {
      id: `pila-${Date.now().toString().slice(-4)}`,
      clientId: client.id,
      clientName: client.name,
      month: newMonth,
      year: 2026,
      ibcReported: newIbc,
      riskClass: newRisk,
      arlRate: fin.effectiveArlRate,
      arlContribution,
      commissionPercentage: commissionRate,
      expectedCommission,
      realPaidCommission: newPaidCommission,
      difference,
      status,
      arlId: client.primaryArlId,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: newNotes || (fin.isMultiRisk ? `Liquidación consolidada de ${fin.workCentersCount} centros de trabajo.` : ''),
      retefuenteRate: 0.10,
      retefuenteAmount,
      netCommissionReceived,
      clientReturnPercentage: returnPct,
      clientReturnAmount,
      agencyNetMargin,
    };

    const updated = [newRec, ...records];
    setRecords(updated);
    saveStoredPilaRecords(updated);

    // Actualización secuencial en la ficha de la empresa cliente (lastPilaDate y status)
    const updatedClients = clients.map((c) => {
      if (c.id === client.id) {
        return {
          ...c,
          lastPilaDate: newRec.paymentDate || new Date().toISOString().split('T')[0],
          status: newRec.status === 'MORA' ? ('MORA' as const) : ('ACTIVO' as const),
        };
      }
      return c;
    });
    setClients(updatedClients);
    saveStoredClients(updatedClients);

    setShowNewRecordModal(false);
  };

  const handleSimulateCSVImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImportSuccess('Se importó y cruzó exitosamente el archivo de extracto ARL con descuento del 10% de Retefuente.');
      setTimeout(() => setImportSuccess(null), 4000);
    }, 1200);
  };

  const filteredRecords = records.filter((r) => {
    const matchesArl = filterArl === 'TODAS' || r.arlId === filterArl;
    const matchesStatus = filterStatus === 'TODOS' || r.status === filterStatus;
    const matchesSearch =
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro Temporal: Mes, Trimestre, Semestre y Año
    let matchesTime = true;
    const recYear = r.month ? r.month.slice(0, 4) : '2026';
    const recMonthNum = r.month ? parseInt(r.month.slice(5, 7), 10) : 8;
    const recQuarter = recMonthNum <= 3 ? 'Q1' : recMonthNum <= 6 ? 'Q2' : recMonthNum <= 9 ? 'Q3' : 'Q4';
    const recSemester = recMonthNum <= 6 ? 'S1' : 'S2';

    if (timeFilterMode === 'MES') {
      matchesTime = r.month === selectedMonth;
    } else if (timeFilterMode === 'TRIMESTRE') {
      matchesTime = (selectedYear === 'TODOS' || recYear === selectedYear) && recQuarter === selectedQuarter;
    } else if (timeFilterMode === 'SEMESTRE') {
      matchesTime = (selectedYear === 'TODOS' || recYear === selectedYear) && recSemester === selectedSemester;
    } else if (timeFilterMode === 'ANUAL') {
      matchesTime = selectedYear === 'TODOS' || recYear === selectedYear;
    }

    return matchesArl && matchesStatus && matchesSearch && matchesTime;
  });

  const availableYears = Array.from(new Set(records.map((r) => r.month ? r.month.slice(0, 4) : '2026'))).sort((a, b) => b.localeCompare(a));
  const availableMonths = Array.from(new Set(records.map((r) => r.month))).filter(Boolean).sort((a, b) => b.localeCompare(a));

  const formatMonthLabel = (m: string) => {
    if (!m) return '';
    const [y, mm] = m.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const idx = parseInt(mm, 10) - 1;
    return `${monthNames[idx] || mm} ${y}`;
  };

  const getActivePeriodSummary = () => {
    if (timeFilterMode === 'TODOS') return 'Histórico Consolidado (Todos los Períodos)';
    if (timeFilterMode === 'MES') return `Mes: ${formatMonthLabel(selectedMonth)}`;
    if (timeFilterMode === 'TRIMESTRE') {
      const qLabels = { Q1: 'T1 (Ene - Mar)', Q2: 'T2 (Abr - Jun)', Q3: 'T3 (Jul - Sep)', Q4: 'T4 (Oct - Dic)' };
      return `Trimestre: ${qLabels[selectedQuarter]} • ${selectedYear !== 'TODOS' ? selectedYear : 'Todos los años'}`;
    }
    if (timeFilterMode === 'SEMESTRE') {
      const sLabels = { S1: 'Semestre 1 (Ene - Jun)', S2: 'Semestre 2 (Jul - Dic)' };
      return `${sLabels[selectedSemester]} • ${selectedYear !== 'TODOS' ? selectedYear : 'Todos los años'}`;
    }
    if (timeFilterMode === 'ANUAL') return `Año: ${selectedYear === 'TODOS' ? 'Todos los Años' : selectedYear}`;
    return '';
  };

  // Totales Financieros Consolidados
  const totalBrutoRecaudado = filteredRecords.reduce((sum, r) => sum + (r.realPaidCommission || 0), 0);
  const totalRetefuente = filteredRecords.reduce((sum, r) => sum + (r.retefuenteAmount ?? ((r.realPaidCommission || 0) * 0.10)), 0);
  const totalNetoRecibido = filteredRecords.reduce((sum, r) => sum + (r.netCommissionReceived ?? ((r.realPaidCommission || 0) * 0.90)), 0);
  const totalRetornoClientes = filteredRecords.reduce((sum, r) => sum + (r.clientReturnAmount ?? ((r.realPaidCommission || r.expectedCommission) * ((r.clientReturnPercentage ?? 25) / 100))), 0);
  const totalMargenNetoPraxis = filteredRecords.reduce((sum, r) => sum + (r.agencyNetMargin ?? ((r.netCommissionReceived ?? ((r.realPaidCommission || 0) * 0.90)) - (r.clientReturnAmount ?? 0))), 0);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Selected client for modal
  const activeModalClient = clients.find((c) => c.id === selectedClientForNew);
  const activeModalArl = arls.find((a) => a.id === activeModalClient?.primaryArlId);
  const activeModalFin = activeModalClient ? calculateCompanyFinancials(activeModalClient, activeModalArl) : null;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
              PRAXIS PREVENCIÓN Y SEGUROS
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Exclusión IVA Art. 476 E.T. • Retefuente 10% ARL</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Motor de Comisiones, Retorno a Empresas & Conciliación PILA
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Trazabilidad completa: Comisión bruta antes de retefuente del 10% de la ARL, porcentaje de retorno pactado con cada cliente y margen neto de la agencia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateCSVImport}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
            title="Importar extracto de aseguradora ARL"
          >
            <Upload size={14} className={isImporting ? 'animate-bounce' : ''} />
            <span className="hidden sm:inline">{isImporting ? 'Conciliando...' : 'Importar Extracto ARL'}</span>
          </button>

          <button
            onClick={() => setShowNewRecordModal(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            title="Registrar Liquidación PILA"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Registrar Liquidación PILA</span>
          </button>
        </div>
      </div>

      {importSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{importSuccess}</span>
        </div>
      )}

      {/* BARRA DE FILTRO TEMPORAL: MES, TRIMESTRE, SEMESTRE Y AÑOS */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Selector de Modo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <CalendarRange size={15} className="text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Período:</span>
            </span>

            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setTimeFilterMode('TODOS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  timeFilterMode === 'TODOS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Ver todo el histórico de comisiones"
              >
                <CalendarRange size={13} />
                <span className="hidden sm:inline">Histórico</span>
              </button>

              <button
                type="button"
                onClick={() => setTimeFilterMode('MES')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  timeFilterMode === 'MES'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Filtrar por Mes específico"
              >
                <CalendarDays size={13} />
                <span>Mes</span>
              </button>

              <button
                type="button"
                onClick={() => setTimeFilterMode('TRIMESTRE')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  timeFilterMode === 'TRIMESTRE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Filtrar por Trimestre (Q1, Q2, Q3, Q4)"
              >
                <PieChart size={13} />
                <span>Trimestre</span>
              </button>

              <button
                type="button"
                onClick={() => setTimeFilterMode('SEMESTRE')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  timeFilterMode === 'SEMESTRE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Filtrar por Semestre (S1, S2)"
              >
                <BarChart3 size={13} />
                <span>Semestre</span>
              </button>

              <button
                type="button"
                onClick={() => setTimeFilterMode('ANUAL')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  timeFilterMode === 'ANUAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Filtrar por Año completo"
              >
                <Calendar size={13} />
                <span>Año</span>
              </button>
            </div>
          </div>

          {/* Sub-selectores contextuales */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Año (Visible en Trimestre, Semestre y Anual) */}
            {(timeFilterMode === 'TRIMESTRE' || timeFilterMode === 'SEMESTRE' || timeFilterMode === 'ANUAL') && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500">Año:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Si es MES: Desplegable de Meses */}
            {timeFilterMode === 'MES' && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      📅 {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Si es TRIMESTRE: Botones T1, T2, T3, T4 */}
            {timeFilterMode === 'TRIMESTRE' && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
                  const labels = { Q1: 'T1 (Ene-Mar)', Q2: 'T2 (Abr-Jun)', Q3: 'T3 (Jul-Sep)', Q4: 'T4 (Oct-Dic)' };
                  const isSelected = selectedQuarter === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuarter(q)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={labels[q]}
                    >
                      <span>{q.replace('Q', 'T')}</span>
                      <span className="hidden xl:inline text-[10px] ml-1 opacity-80">
                        {q === 'Q1' ? '(Ene-Mar)' : q === 'Q2' ? '(Abr-Jun)' : q === 'Q3' ? '(Jul-Sep)' : '(Oct-Dic)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Si es SEMESTRE: Botones S1, S2 */}
            {timeFilterMode === 'SEMESTRE' && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(['S1', 'S2'] as const).map((s) => {
                  const isSelected = selectedSemester === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSemester(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{s === 'S1' ? 'Semestre 1 (Ene - Jun)' : 'Semestre 2 (Jul - Dic)'}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Botón Restablecer */}
            {timeFilterMode !== 'TODOS' && (
              <button
                type="button"
                onClick={() => {
                  setTimeFilterMode('TODOS');
                  setSelectedYear('2026');
                }}
                className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
                title="Restablecer a Histórico Completo"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Restablecer</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen dinámico del filtro activo */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Filter size={12} className="text-blue-500" />
            <span>Período Activo:</span>
            <strong className="text-blue-700 dark:text-blue-300 font-bold">{getActivePeriodSummary()}</strong>
          </span>
          <span className="font-mono text-slate-500 font-semibold text-[10px]">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'planilla' : 'planillas'} conciliadas
          </span>
        </div>
      </div>

      {/* 5 Executive Financial Traceability Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Comisión Bruta */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Comisión Bruta ARL</span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {formatCOP(totalBrutoRecaudado)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>Antes Retefuente</span>
            <span className="font-semibold text-blue-600">Base PILA</span>
          </div>
        </div>

        {/* 2. Retefuente 10% */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Retefuente 10% ARL</span>
              <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownRight size={15} />
              </div>
            </div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
              -{formatCOP(totalRetefuente)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>Deducido por ARL</span>
            <span className="font-semibold text-rose-500">Tarifa 10%</span>
          </div>
        </div>

        {/* 3. Neto Recibido */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Neto Girado Aseguradora</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Check size={15} />
              </div>
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCOP(totalNetoRecibido)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>90% en Banco</span>
            <span className="font-semibold text-emerald-600">0% IVA Art. 476</span>
          </div>
        </div>

        {/* 4. Retorno / Acompañamiento a Clientes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Retorno a Empresas</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Percent size={15} />
              </div>
            </div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatCOP(totalRetornoClientes)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>Bolsa SST Clientes</span>
            <span className="font-semibold text-indigo-600">% Pactado</span>
          </div>
        </div>

        {/* 5. Margen Neto PRAXIS */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 text-white border border-blue-500/30 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-200 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Margen Neto PRAXIS</span>
              <div className="h-7 w-7 rounded-lg bg-white/20 text-white flex items-center justify-center">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {formatCOP(totalMargenNetoPraxis)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-blue-200 flex justify-between">
            <span>Utilidad Agencia</span>
            <span className="font-bold text-emerald-300">Neto Real</span>
          </div>
        </div>
      </div>

      {/* Active Client Filter Banner */}
      {activeClientFilter && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Building2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Filtrando información contable y bolsa de retorno de:{' '}
              <strong className="font-extrabold">{activeClientFilter.name}</strong> (NIT {activeClientFilter.nit})
            </span>
          </div>
          <button
            onClick={() => {
              setActiveClientFilter(null);
              setSearchTerm('');
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('cliente');
                window.history.replaceState({}, '', url.pathname);
              }
            }}
            className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            ✕ Ver todas las empresas
          </button>
        </div>
      )}

      {/* SECCIÓN INTERCONECTADA: CRUCE DE BOLSA SST vs VISITAS DE CAMPO */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <ShieldCheck size={12} /> RETORNO FINANCIERO & REINVERSIÓN TÉCNICA
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Bolsa de Acompañamiento SST vs. Visitas Ejecutadas en Campo
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cruza en tiempo real el retorno pactado (% sobre comisión bruta) contra el costo y horas de asesoría técnica consumidas en Campo SST.
            </p>
          </div>
          <Link
            href="/campo-sst"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 transition-all self-start sm:self-auto"
          >
            <span>Módulo Campo SST</span>
            <ArrowDownRight size={14} className="-rotate-90" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(activeClientFilter ? [activeClientFilter] : clients).map((cli) => {
            const clientRecords = records.filter((r) => r.clientId === cli.id);
            const clientVisits = fieldVisits.filter((v) => v.clientId === cli.id);

            const totalBolsaGenerada = clientRecords.reduce((sum, r) => sum + (r.clientReturnAmount || 0), 0);
            const totalVisitasCosto = clientVisits.reduce((sum, v) => sum + (v.visitCost || 0), 0);
            const totalHorasVisitas = clientVisits.reduce((sum, v) => sum + (v.hoursSpent || 0), 0);
            const saldoDisponible = totalBolsaGenerada - totalVisitasCosto;

            const arl = arls.find((a) => a.id === cli.primaryArlId);

            return (
              <div
                key={cli.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2.5 hover:border-blue-400 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {cli.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      NIT: {cli.nit} • {arl?.shortName || 'ARL'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
                    {cli.returnPercentage ?? 25}% Retorno
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[10px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Bolsa Total:</span>
                    <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                      {formatCOP(totalBolsaGenerada)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Invertido ({totalHorasVisitas}h):</span>
                    <strong className="font-mono text-slate-700 dark:text-slate-300">
                      {formatCOP(totalVisitasCosto)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Saldo SST:</span>
                    <strong
                      className={`font-mono font-bold ${
                        saldoDisponible >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCOP(saldoDisponible)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px]">
                  <span className="text-slate-400">
                    {clientVisits.length} visitas • {clientRecords.length} planillas
                  </span>
                  <Link
                    href={`/campo-sst?cliente=${encodeURIComponent(cli.id)}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-0.5"
                  >
                    Agendar / Ver Visitas →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterArl}
            onChange={(e) => setFilterArl(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas las ARLs</option>
            {arls.map((a) => (
              <option key={a.id} value={a.id}>
                {a.shortName}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="CONCILIADO">Conciliado</option>
            <option value="DIVERGENCIA">Divergencia</option>
            <option value="MORA">En Mora</option>
          </select>
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredRecords.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay planillas registradas para los filtros seleccionados.
            </div>
          ) : (
            filteredRecords.map((r) => {
              const arl = arls.find((a) => a.id === r.arlId);
              const client = clients.find((c) => c.id === r.clientId);
              const hasMulti = client?.workCenters && client.workCenters.length > 1;
              const grossComm = r.realPaidCommission || r.expectedCommission;
              const reteAmount = r.retefuenteAmount ?? (grossComm * 0.10);
              const netComm = r.netCommissionReceived ?? (grossComm - reteAmount);
              const retPct = r.clientReturnPercentage ?? client?.returnPercentage ?? 25;
              const retAmount = r.clientReturnAmount ?? (grossComm * (retPct / 100));
              const agencyMargin = r.agencyNetMargin ?? (netComm - retAmount);

              return (
                <div key={`mob-${r.id}`} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block">{r.month}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{r.clientName}</h4>
                      <span className="text-[10px] text-slate-500">{arl?.shortName || r.arlId} {hasMulti ? `• ${client?.workCenters?.length} Centros` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          r.status === 'CONCILIADO'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : r.status === 'MORA'
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedRecordForInvoice(r);
                          setShowInvoiceModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 transition-colors"
                        title="Cuenta de Cobro"
                      >
                        <FileText size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nómina IBC:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCOP(r.ibcReported)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Aporte ARL:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{formatCOP(r.arlContribution)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Comisión Bruta:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCOP(grossComm)}</span>
                    </div>
                    <div>
                      <span className="text-rose-500 text-[10px] block">Retención 10%:</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-{formatCOP(reteAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      Retorno ({retPct}%): <strong>{formatCOP(retAmount)}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      Margen: {formatCOP(agencyMargin)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Periodo / Empresa</th>
                <th className="py-3.5 px-4">ARL & Centros</th>
                <th className="py-3.5 px-4 text-right">Nómina IBC</th>
                <th className="py-3.5 px-4 text-right">Aporte ARL</th>
                <th className="py-3.5 px-4 text-right">Comisión Bruta</th>
                <th className="py-3.5 px-4 text-right">Retefuente 10%</th>
                <th className="py-3.5 px-4 text-center">% Retorno Cliente</th>
                <th className="py-3.5 px-4 text-right">Margen PRAXIS</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRecords.map((r) => {
                const arl = arls.find((a) => a.id === r.arlId);
                const client = clients.find((c) => c.id === r.clientId);
                const hasMulti = client?.workCenters && client.workCenters.length > 1;

                // Trazabilidad individual
                const grossComm = r.realPaidCommission || r.expectedCommission;
                const reteAmount = r.retefuenteAmount ?? (grossComm * 0.10);
                const netComm = r.netCommissionReceived ?? (grossComm - reteAmount);
                const retPct = r.clientReturnPercentage ?? client?.returnPercentage ?? 25;
                const retAmount = r.clientReturnAmount ?? (grossComm * (retPct / 100));
                const agencyMargin = r.agencyNetMargin ?? (netComm - retAmount);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-slate-500 block">{r.month}</span>
                      <strong className="font-bold text-slate-900 dark:text-white text-xs block truncate max-w-[200px]">
                        {r.clientName}
                      </strong>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{arl?.shortName || r.arlId}</span>
                      </div>
                      {hasMulti ? (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1 mt-0.5 font-bold">
                          <Layers size={10} /> {client.workCenters?.length} Centros Multiriesgo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {RISK_RATES[r.riskClass]?.percentageText} ({r.riskClass})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatCOP(r.ibcReported)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatCOP(r.arlContribution)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCOP(grossComm)}
                      <span className="text-[10px] text-slate-500 block font-normal font-sans">
                        {r.commissionPercentage}% tasa
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatCOP(reteAmount)}
                      <span className="text-[9px] text-rose-500 block font-sans">
                        10% Retención
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono inline-block">
                        {retPct}%
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">
                        {formatCOP(retAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCOP(agencyMargin)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'CONCILIADO'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : r.status === 'MORA'
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedRecordForInvoice(r);
                          setShowInvoiceModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 transition-colors"
                        title="Generar Cuenta de Cobro & Trazabilidad de Retorno"
                      >
                        <FileText size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CUENTA DE COBRO & ACTA DE LIQUIDACIÓN DE RETORNO */}
      {showInvoiceModal && selectedRecordForInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 printable-modal-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto printable-modal-box">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 no-print cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Document Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 print:border-slate-900 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 print:text-blue-800 block">
                    DOCUMENTO OFICIAL DE LIQUIDACIÓN & TRAZABILIDAD
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-slate-900">
                    Cuenta de Cobro & Certificado de Retorno SST
                  </h3>
                  <span className="text-xs text-slate-500 print:text-slate-700 font-mono">
                    Ref: CC-PRAXIS-{selectedRecordForInvoice.id.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 print:text-slate-900 block">
                    Fecha: {selectedRecordForInvoice.paymentDate || new Date().toISOString().split('T')[0]}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                    Exento de IVA Art. 476 E.T.
                  </span>
                </div>
              </div>
            </div>

            {/* Printable Body */}
            <div
              id="cuenta-cobro-sheet"
              className="space-y-4 text-xs official-document-sheet print:p-0 print:border-none print:shadow-none print:bg-white print:text-slate-900"
            >
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 block text-[11px]">Intermediario / Agencia:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                    alt={agencyProfile?.shortName || 'PRAXIS'}
                    className="h-8 w-auto object-contain my-1 max-h-10"
                  />
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 block text-sm font-bold">
                    {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA.'}
                  </strong>
                  <span className="text-slate-500 print:text-slate-600 font-mono text-[11px]">
                    NIT: {agencyProfile?.nit || '901.884.200-1'} • RUI MinTrabajo: {agencyProfile?.ruiNumber || 'RUI-MINTRABAJO-2024-8849'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600 block text-[11px]">Entidad ARL Receptora:</span>
                  <strong className="text-slate-900 dark:text-white print:text-slate-900 block text-sm font-bold">
                    {arls.find((a) => a.id === selectedRecordForInvoice.arlId)?.name}
                  </strong>
                  <span className="text-slate-500 print:text-slate-600 text-[11px] block">Periodo de Liquidación: <strong>{selectedRecordForInvoice.month}</strong></span>
                  <span className="text-slate-500 print:text-slate-600 text-[11px] block">Empresa Cliente: <strong className="text-slate-900 print:text-slate-900">{selectedRecordForInvoice.clientName}</strong></span>
                </div>
              </div>

              {/* Financial Traceability Breakdown Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950/80 print:bg-slate-100 text-slate-600 dark:text-slate-400 print:text-slate-800 font-semibold border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
                    <tr>
                      <th className="py-2 px-3 text-left">Concepto Financiero</th>
                      <th className="py-2 px-3 text-right">Base Liquidación</th>
                      <th className="py-2 px-3 text-right">Tasa / %</th>
                      <th className="py-2 px-3 text-right">Monto (COP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                    <tr>
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-900 dark:text-white print:text-slate-900">Comisión Bruta de Intermediación</strong>
                        <span className="block text-[10px] text-slate-500 print:text-slate-600">
                          (Calculada sobre Aportes PILA antes de retención)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 print:text-slate-800">
                        {formatCOP(selectedRecordForInvoice.arlContribution)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 print:text-slate-800">
                        {selectedRecordForInvoice.commissionPercentage}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white print:text-slate-900">
                        {formatCOP(selectedRecordForInvoice.expectedCommission)}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/50 dark:bg-rose-950/20 print:bg-rose-50/50 text-rose-700 dark:text-rose-400 print:text-rose-800">
                      <td colSpan={2} className="py-2 px-3 text-left font-medium">
                        (-) Retención en la Fuente aplicada por la ARL
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">10.0%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        -{formatCOP(selectedRecordForInvoice.expectedCommission * 0.10)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 print:bg-emerald-50/50 text-emerald-800 dark:text-emerald-300 print:text-emerald-900">
                      <td colSpan={2} className="py-2 px-3 text-left font-bold">
                        (=) Comisión Neta Recibida de la Aseguradora
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">90.0%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatCOP(selectedRecordForInvoice.expectedCommission * 0.90)}
                      </td>
                    </tr>
                    <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 print:bg-indigo-50/50 text-indigo-800 dark:text-indigo-300 print:text-indigo-900">
                      <td colSpan={2} className="py-2 px-3 text-left font-medium">
                        Retorno Acordado para Acompañamiento / Reinversión SST de la Empresa
                        <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 print:text-indigo-800">
                          (Calculado sobre la comisión bruta generada)
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {selectedRecordForInvoice.clientReturnPercentage ?? 25}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatCOP(selectedRecordForInvoice.expectedCommission * ((selectedRecordForInvoice.clientReturnPercentage ?? 25) / 100))}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60 dark:bg-slate-950/40 print:bg-slate-50">
                      <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-600 dark:text-slate-300 print:text-slate-700">
                        Impuesto sobre las Ventas (IVA 0% - Art. 476 Num. 3 ET):
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-700">$ 0</td>
                    </tr>
                    <tr className="bg-blue-50/60 dark:bg-blue-950/30 print:bg-blue-50/80 border-t-2 border-slate-200 dark:border-slate-800 print:border-slate-400">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-extrabold text-sm text-slate-900 dark:text-white print:text-slate-900">
                        MARGEN NETO FINAL PRAXIS:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-base text-blue-600 dark:text-blue-400 print:text-blue-800">
                        {formatCOP(
                          (selectedRecordForInvoice.expectedCommission * 0.90) -
                          (selectedRecordForInvoice.expectedCommission * ((selectedRecordForInvoice.clientReturnPercentage ?? 25) / 100))
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legal Note Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-white text-[10.5px] text-slate-600 dark:text-slate-400 print:text-slate-700 leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-200 print:text-slate-900 block mb-0.5">Certificación Legal Tributaria & Acompañamiento:</strong>
                Se certifica que la presente comisión proviene de los <strong>Gastos de Administración de la ARL</strong>, en estricto cumplimiento de la <strong>Sentencia C-049 de 2022</strong> de la Corte Constitucional y la Resolución 3544. La retención en la fuente del 10% ha sido deducida conforme al Estatuto Tributario, y la bolsa de retorno del <strong>{selectedRecordForInvoice.clientReturnPercentage ?? 25}%</strong> se encuentra destinada a la financiación de horas técnicas y asesorías SG-SST sin costo adicional para la empresa.
              </div>

              {/* Dual Signature Block for Official Settlement */}
              <div className="pt-6 grid grid-cols-2 gap-8 page-break-inside-avoid">
                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    FÉLIX BEDOYA
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Director Técnico & Financiero
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
                    PRAXIS PREVENCIÓN Y SEGUROS LTDA.
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">NIT: 901.884.200-1</p>
                </div>

                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    REPRESENTANTE LEGAL / DELEGADO
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Recibido & Aprobado Conforme
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-bold truncate">
                    {selectedRecordForInvoice.clientName}
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">Firma y Sello de la Empresa</p>
                </div>
              </div>

              {/* Pie de Página Oficial */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800 print:border-slate-300 font-sans text-[9px] text-slate-500 flex justify-between items-center">
                <span>Cuenta de cobro y liquidación de comisiones expedida bajo el Estatuto Tributario y Sentencia C-049 de 2022.</span>
                <span>Exento de IVA Art. 476 Num. 3 E.T.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => printDocumentById('cuenta-cobro-sheet', `Cuenta de Cobro - ${selectedRecordForInvoice.clientName}`)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <Printer size={14} /> Imprimir / Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA LIQUIDACIÓN PILA */}
      {showNewRecordModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNewRecordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                CONCILIACIÓN MANUAL & PILA
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Registrar Liquidación de Planilla PILA & Retorno
              </h3>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Empresa Cliente Activa</label>
                <select
                  value={selectedClientForNew}
                  onChange={(e) => handleClientChangeForNew(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.workCenters && c.workCenters.length > 1 ? `(${c.workCenters.length} Centros)` : `(${c.riskClass})`} - {c.primaryArlId.toUpperCase()} (Retorno: {c.returnPercentage ?? 25}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Multirisk Work Center Overview inside modal if applicable */}
              {activeModalFin && activeModalFin.isMultiRisk ? (
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} /> {activeModalFin.workCentersCount} Centros de Trabajo Multiriesgo
                    </span>
                    <span className="font-mono text-[10px]">Tasa: {activeModalFin.effectiveArlRateFormatted}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {activeModalFin.breakdown.map((b) => (
                      <div key={b.id} className="flex justify-between text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                        <span>{b.name} ({b.percentageText}):</span>
                        <strong>{formatCOP(b.monthlyIbc)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Periodo (Mes)</label>
                  <input
                    type="month"
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Clase de Riesgo Principal</label>
                  <select
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value as RiskClass)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                  >
                    {Object.keys(RISK_RATES).map((r) => (
                      <option key={r} value={r}>
                        {RISK_RATES[r as RiskClass].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Nómina / IBC Real Reportado en Planilla PILA (COP)
                </label>
                <input
                  type="number"
                  value={newIbc}
                  onChange={(e) => setNewIbc(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Valor Real Pagado por la ARL en Extracto (COP)
                </label>
                <input
                  type="number"
                  placeholder="0 si aún está en mora"
                  value={newPaidCommission}
                  onChange={(e) => setNewPaidCommission(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>

              {/* Selector de Porcentaje de Retorno para la empresa */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-indigo-950 dark:text-indigo-200 font-bold flex items-center gap-1.5">
                    <Percent size={14} className="text-indigo-600 dark:text-indigo-400" />
                    % de Retorno / Acompañamiento Pactado con la Empresa
                  </label>
                  <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                    {newReturnPercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={newReturnPercentage}
                    onChange={(e) => setNewReturnPercentage(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[0, 15, 20, 25, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setNewReturnPercentage(pct)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        newReturnPercentage === pct
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Calculado sobre la comisión bruta generada antes del 10% de retención en la fuente que descuenta la ARL.
                </p>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Observaciones / Notas</label>
                <input
                  type="text"
                  placeholder="Ej. Planilla pagada dentro del plazo legal sin glosas."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Guardar Liquidación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
