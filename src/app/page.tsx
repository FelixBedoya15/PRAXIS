'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Clock,
  HardHat,
  Stethoscope,
  Calculator,
  ArrowUpRight,
  FileSpreadsheet,
  Bot,
  Percent,
  Sparkles,
  Users,
  AlertCircle,
  Layers,
  ArrowRight,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Target,
  ChevronRight,
  PieChart,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { getStoredARLs, getStoredClients, getStoredPilaRecords, getStoredFieldVisits, getStoredLeads, getStoredAgencyProfile } from '@/lib/storage';
import { ARLCompany, ClientCompany, PilaRecord, FieldVisit, LeadProspect, RISK_RATES, RiskClass, AgencyProfile } from '@/types';
import { calculateCompanyFinancials } from '@/lib/calculations';

export default function DashboardPage() {
  const [arls, setArls] = useState<ARLCompany[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [leads, setLeads] = useState<LeadProspect[]>([]);
  const [pilaRecords, setPilaRecords] = useState<PilaRecord[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    setArls(getStoredARLs());
    setClients(getStoredClients());
    setLeads(getStoredLeads());
    setPilaRecords(getStoredPilaRecords());
    setFieldVisits(getStoredFieldVisits());
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
    };
  }, []);

  // Financial & Operational Metrics
  const totalIbc = clients.reduce((sum, c) => {
    const arl = arls.find((a) => a.id === c.primaryArlId);
    const fin = calculateCompanyFinancials(c, arl);
    return sum + fin.totalIbc;
  }, 0);

  const totalEmployees = clients.reduce((sum, c) => {
    const arl = arls.find((a) => a.id === c.primaryArlId);
    const fin = calculateCompanyFinancials(c, arl);
    return sum + fin.totalEmployees;
  }, 0);

  const totalWorkCenters = clients.reduce((sum, c) => {
    return sum + (c.workCenters && c.workCenters.length > 0 ? c.workCenters.length : 1);
  }, 0);

  const totalExpectedCommission = pilaRecords.reduce((sum, r) => sum + (r.expectedCommission || 0), 0);
  const totalRealPaidCommission = pilaRecords.reduce((sum, r) => sum + (r.realPaidCommission || 0), 0);
  const totalDifference = pilaRecords.reduce((sum, r) => sum + (r.difference || 0), 0);
  const moraCount = pilaRecords.filter((r) => r.status === 'MORA').length;
  const divergenciaCount = pilaRecords.filter((r) => r.status === 'DIVERGENCIA').length;
  const totalTechnicalHours = fieldVisits.reduce((sum, v) => sum + (v.hoursSpent || 0), 0);

  // Pipeline Potential
  const pipelinePotentialCommission = leads.reduce((sum, l) => {
    const arl = arls.find((a) => a.id === l.proposedArlId);
    const fin = calculateCompanyFinancials(l, arl);
    return sum + fin.totalCommission;
  }, 0);

  // Risk Class Distribution
  const riskDistribution: Record<RiskClass, number> = {
    CLASE_I: 0,
    CLASE_II: 0,
    CLASE_III: 0,
    CLASE_IV: 0,
    CLASE_V: 0,
  };

  clients.forEach((c) => {
    if (c.workCenters && c.workCenters.length > 0) {
      c.workCenters.forEach((wc) => {
        riskDistribution[wc.riskClass] = (riskDistribution[wc.riskClass] || 0) + wc.monthlyIbc;
      });
    } else {
      riskDistribution[c.riskClass] = (riskDistribution[c.riskClass] || 0) + c.monthlyIbc;
    }
  });

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const m = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${months[m] || ''}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // ARL Distribution
  const arlStats = arls.map((arl) => {
    const arlClients = clients.filter((c) => c.primaryArlId === arl.id);
    const arlIbc = arlClients.reduce((sum, c) => {
      const fin = calculateCompanyFinancials(c, arl);
      return sum + fin.totalIbc;
    }, 0);
    const arlCommission = arlClients.reduce((sum, c) => {
      const fin = calculateCompanyFinancials(c, arl);
      return sum + fin.totalCommission;
    }, 0);
    const pct = totalIbc > 0 ? (arlIbc / totalIbc) * 100 : 0;
    return {
      ...arl,
      clientCount: arlClients.length,
      ibc: arlIbc,
      commission: arlCommission,
      percentage: pct,
    };
  }).filter((a) => a.clientCount > 0 || a.ibc > 0);

  return (
    <div className="space-y-5 max-w-full animate-fade-in pb-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/95 via-indigo-900 to-slate-900 border border-blue-500/20 p-4 sm:p-6 lg:p-7 shadow-xl text-white">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="hidden sm:flex h-16 w-16 rounded-2xl bg-white p-1.5 items-center justify-center shadow-lg shrink-0 border border-white/20 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                alt={agencyProfile?.shortName || 'PRAXIS'}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-blue-500/40 text-blue-100 border border-blue-400/40 tracking-wider">
                  {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS LTDA.'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Exclusión IVA Art. 476 E.T.
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Layers size={12} /> {totalWorkCenters} Centros Multiriesgo
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Centro de Control & Analítica Integral ARL
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
                Supervisión en tiempo real de nóminas PILA, comisiones de intermediación, pipeline de prospección comercial y horas técnicas de prevención SG-SST.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/comisiones"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Calculator size={14} /> <span>Conciliar PILA</span>
            </Link>
            <Link
              href="/clientes"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
            >
              <Target size={14} /> <span>Pipeline Leads</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 1: 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Comisiones Proyectadas */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all group shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Comisión Proyectada</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">
              {formatCOP(totalExpectedCommission)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 truncate">
              <CheckCircle2 size={12} className="shrink-0" /> Recaudado: {formatCOP(totalRealPaidCommission)}
            </span>
          </div>
        </div>

        {/* Card 2: Masa Salarial (IBC) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition-all group shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Masa Salarial (IBC)</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Building2 size={17} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">
              {formatCOP(totalIbc)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
              {clients.length} empresas ({totalEmployees} trab.)
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-[10px] shrink-0">
              {totalWorkCenters} centros
            </span>
          </div>
        </div>

        {/* Card 3: Pipeline Comercial */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all group shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Pipeline en Trámite</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Target size={17} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight font-mono truncate">
              {formatCOP(pipelinePotentialCommission)}/m
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
              {leads.length} prospectos activos
            </span>
            <Link href="/clientes" className="text-blue-600 dark:text-blue-400 font-bold hover:underline shrink-0">
              Ver ➔
            </Link>
          </div>
        </div>

        {/* Card 4: Horas Técnicas SST RUI */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all group shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Prevención & RUI</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <HardHat size={17} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              {totalTechnicalHours} hrs
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
              {fieldVisits.length} visitas ejecutadas
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px] shrink-0">
              MinTrabajo
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: ARL Market Share & Risk Class Mix */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card: Cartera por ARL */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  DISTRIBUCIÓN DE INTERMEDIACIÓN
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Participación de Cartera por ARL
                </h3>
              </div>
              <Link
                href="/arl-config"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Directorio ARL ➔
              </Link>
            </div>

            <div className="space-y-3.5">
              {arlStats.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 min-w-0">
                      <span className="text-base shrink-0">{a.logo}</span>
                      <span className="truncate">{a.name}</span>
                      <span className="text-[10px] font-normal text-slate-500 shrink-0">
                        ({a.clientCount} {a.clientCount === 1 ? 'empresa' : 'empresas'})
                      </span>
                    </div>
                    <div className="flex sm:flex-col sm:text-right items-baseline sm:items-end justify-between gap-2 sm:gap-0 font-mono shrink-0">
                      <strong className="text-slate-900 dark:text-white text-xs">{formatCOP(a.ibc)}</strong>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Comisión: {formatCOP(a.commission)}/m
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(a.percentage, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Masa Salarial por Clases de Riesgo y Centros de Trabajo */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                COMPOSICIÓN DE RIESGO
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Masa Salarial por Clases de Riesgo (Centros de Trabajo)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 text-xs">
              {Object.keys(RISK_RATES).map((rKey) => {
                const r = rKey as RiskClass;
                const def = RISK_RATES[r];
                const ibcVal = riskDistribution[r] || 0;
                const pct = totalIbc > 0 ? ((ibcVal / totalIbc) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={r}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2 min-w-0"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 block">
                        {def.percentageText}
                      </span>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5 truncate">
                        {r.replace('_', ' ')}
                      </strong>
                    </div>

                    <div>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs truncate">
                        {formatCOP(ibcVal)}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{pct}% del total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Operative Alerts & Fast Actions */}
        <div className="space-y-5">
          {/* Card: Alertas Operativas */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0" /> Alertas Operativas
              </h3>
              <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                {moraCount + divergenciaCount} Activas
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {pilaRecords
                .filter((r) => r.status === 'MORA' || r.status === 'DIVERGENCIA')
                .map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-slate-900 dark:text-white font-bold truncate">{rec.clientName}</strong>
                      <span className="font-mono text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                      {rec.notes || `Planilla ${rec.month} presenta novedad en pago.`}
                    </p>
                  </div>
                ))}

              {leads.slice(0, 2).map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1"
                >
                  <div className="flex justify-between items-start gap-2">
                    <strong className="text-slate-900 dark:text-white font-bold truncate">{l.name}</strong>
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {formatDateLabel(l.nextFollowUpDate)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                    {l.nextFollowUpAction}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Accesos Rápidos */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              Gestión Rápida de Módulos
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/clientes"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 shadow-sm"
              >
                <Users size={16} className="text-blue-500" />
                <span className="truncate">Clientes</span>
              </Link>

              <Link
                href="/comisiones"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 shadow-sm"
              >
                <Calculator size={16} className="text-emerald-500" />
                <span className="truncate">Liquidar PILA</span>
              </Link>

              <Link
                href="/campo-sst"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-amber-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 shadow-sm"
              >
                <HardHat size={16} className="text-amber-500" />
                <span className="truncate">Res. 0312</span>
              </Link>

              <Link
                href="/wappy-ia"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 shadow-sm"
              >
                <Bot size={16} className="text-indigo-500" />
                <span className="truncate">Asistente IA</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
