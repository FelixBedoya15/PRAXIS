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
  PieChart as PieChartIcon,
  BarChart3,
  MessageSquare,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  getStoredARLs,
  getStoredClients,
  getStoredPilaRecords,
  getStoredFieldVisits,
  getStoredLeads,
  getStoredAgencyProfile,
  getStoredMedicalRecords,
} from '@/lib/storage';
import {
  ARLCompany,
  ClientCompany,
  PilaRecord,
  FieldVisit,
  LeadProspect,
  RISK_RATES,
  RiskClass,
  AgencyProfile,
  MedicalRecord,
} from '@/types';
import { calculateCompanyFinancials } from '@/lib/calculations';

const RISK_COLORS: Record<RiskClass, string> = {
  CLASE_I: '#10b981',    // Emerald
  CLASE_II: '#3b82f6',   // Blue
  CLASE_III: '#f59e0b',  // Amber
  CLASE_IV: '#f97316',   // Orange
  CLASE_V: '#ef4444',    // Rose
};

export default function DashboardPage() {
  const [arls, setArls] = useState<ARLCompany[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [leads, setLeads] = useState<LeadProspect[]>([]);
  const [pilaRecords, setPilaRecords] = useState<PilaRecord[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setArls(getStoredARLs());
    setClients(getStoredClients());
    setLeads(getStoredLeads());
    setPilaRecords(getStoredPilaRecords());
    setFieldVisits(getStoredFieldVisits());
    setMedicalRecords(getStoredMedicalRecords());
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    const handleDataSynced = () => {
      setArls(getStoredARLs());
      setClients(getStoredClients());
      setLeads(getStoredLeads());
      setPilaRecords(getStoredPilaRecords());
      setFieldVisits(getStoredFieldVisits());
      setMedicalRecords(getStoredMedicalRecords());
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    window.addEventListener('praxis_data_synced', handleDataSynced);
    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
      window.removeEventListener('praxis_data_synced', handleDataSynced);
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

  // ARL Distribution Data for Tables & Charts
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

  const arlChartData = arls.map((arl) => {
    const arlClients = clients.filter((c) => c.primaryArlId === arl.id);
    const arlIbc = arlClients.reduce((sum, c) => {
      const fin = calculateCompanyFinancials(c, arl);
      return sum + fin.totalIbc;
    }, 0);
    const arlCommission = arlClients.reduce((sum, c) => {
      const fin = calculateCompanyFinancials(c, arl);
      return sum + fin.totalCommission;
    }, 0);
    return {
      name: arl.shortName || arl.name,
      logo: arl.logo || '🛡️',
      ibc: arlIbc,
      commission: arlCommission,
      clientCount: arlClients.length,
    };
  }).filter((a) => a.ibc > 0 || a.commission > 0);

  // Risk Pie Chart Data
  const riskPieData = (Object.keys(RISK_RATES) as RiskClass[]).map((r) => {
    const def = RISK_RATES[r];
    const value = riskDistribution[r] || 0;
    const percentage = totalIbc > 0 ? ((value / totalIbc) * 100).toFixed(1) : '0';
    return {
      name: `${r.replace('_', ' ')} (${def.percentageText})`,
      rawClass: r,
      value,
      percentage,
      color: RISK_COLORS[r],
    };
  }).filter((d) => d.value > 0);

  // Health & Medicine Metrics
  const totalDaysLost = medicalRecords.reduce((sum, m) => sum + (m.daysLost || 0), 0);
  const accidentesCount = medicalRecords.filter((m) => m.incidentType === 'ACCIDENTE_TRABAJO').length;
  const examenesCount = medicalRecords.filter((m) => m.incidentType === 'EXAMEN_MEDICO').length;
  const pveActiveCount = medicalRecords.filter((m) => m.pveProgram && m.pveProgram !== 'NINGUNO').length;

  // Res 0312 Compliance Metrics
  const clientsWithScore = clients.filter((c) => c.standardsScore !== undefined);
  const avgStandardsScore = clientsWithScore.length > 0
    ? Math.round(clientsWithScore.reduce((sum, c) => sum + (c.standardsScore || 0), 0) / clientsWithScore.length)
    : 0;

  // Pipeline Stages Funnel
  const pipelineStages = [
    { key: 'NUEVO_LEAD', label: 'Nuevo', color: 'bg-blue-500' },
    { key: 'DIAGNOSTICO_ARL', label: 'Diagnóstico', color: 'bg-indigo-500' },
    { key: 'PROPUESTA_ENVIADA', label: 'Propuesta', color: 'bg-amber-500' },
    { key: 'CARTA_NOMBRAMIENTO', label: 'Carta Nombramiento', color: 'bg-emerald-500' },
  ];

  // Custom Chart Tooltips
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <span>🛡️</span> {label}
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-400">Nómina IBC:</span>
            <span className="font-mono font-bold text-white">{formatCOP(payload[0]?.value || 0)}</span>
          </div>
          {payload[1] && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-400">Comisión Mensual:</span>
              <span className="font-mono font-bold text-white">{formatCOP(payload[1]?.value || 0)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="p-3 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-200">{data.name}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Masa Salarial:</span>
            <span className="font-mono font-bold text-white">{formatCOP(data.value)}</span>
          </div>
          <p className="text-[10px] text-emerald-400 font-mono text-right">{data.payload.percentage}% del total</p>
        </div>
      );
    }
    return null;
  };

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

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <Link
              href="/comisiones"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all text-center"
            >
              <Calculator size={14} /> <span>Conciliar PILA</span>
            </Link>
            <Link
              href="/clientes"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all text-center"
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

        {/* Card 4: Horas Técnicas SST */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all group shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Prevención SG-SST</span>
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
              Campo SST
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Dynamic Interactive Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Dynamic Chart 1: Participación y Comisiones por Aseguradora ARL */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <BarChart3 size={13} /> Analítica Financiera por Aseguradora
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Distribución de Cartera & Comisiones por ARL
              </h3>
            </div>
            <Link
              href="/comisiones"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              Liquidador PILA ➔
            </Link>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arlChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="ibc"
                    name="Nómina Total (IBC)"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="commission"
                    name="Comisión Mensual"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                Cargando gráfica dinámica...
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Chart 2: Donut Chart Distribución de Riesgos */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <PieChartIcon size={13} /> Matriz de Riesgo Normativa
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Composición de Riesgo (Centros de Trabajo)
            </h3>
          </div>

          <div className="h-56 sm:h-60 w-full relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                Cargando distribución...
              </div>
            )}
          </div>

          {/* Clean Legend Chips */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {riskPieData.map((r) => (
              <span
                key={r.rawClass}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                {r.rawClass.replace('_', ' ')}: {r.percentage}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Comprehensive Multi-Module Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Operational SST Compliance & Medical Surveillance */}
        <div className="lg:col-span-2 space-y-5">
          {/* Module 1: Estándares Mínimos Res. 0312 de 2019 */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Award size={13} /> Cumplimiento Normativo Res. 0312 de 2019
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Índice de Madurez SG-SST de Empresas Afiliadas
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono font-bold text-xs">
                  Promedio Portafolio: {avgStandardsScore}%
                </span>
                <Link
                  href="/campo-sst"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  Auditar ➔
                </Link>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {clients.map((client) => {
                const score = client.standardsScore ?? 0;
                const isEvaluated = client.standardsScore !== undefined;
                const statusColor = score >= 86 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                const statusBadge = score >= 86
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : score >= 60
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                return (
                  <div
                    key={client.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {client.name}
                        </strong>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          (NIT: {client.nit})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{client.economicActivity}</span>
                        <span>•</span>
                        <span>{client.standardsCount || 60} Estándares</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:w-60 shrink-0">
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                          <span className="text-slate-500">Calificación:</span>
                          <span className="text-slate-900 dark:text-white">{isEvaluated ? `${score}%` : 'Pendiente'}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${statusColor} rounded-full transition-all duration-500`}
                            style={{ width: `${isEvaluated ? score : 0}%` }}
                          />
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                          isEvaluated ? statusBadge : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isEvaluated ? client.standardsRating || 'Aceptable' : 'Sin auditar'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module 2: Vigilancia Médica & Salud Laboral */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Stethoscope size={13} /> Medicina Laboral & Ausentismo
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Programas de Vigilancia Epidemiológica & Accidentalidad
                </h3>
              </div>
              <Link
                href="/medico"
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Módulo Médico ➔
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
                  Días Perdidos
                </span>
                <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 font-mono">
                  {totalDaysLost} días
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ausentismo total</span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">
                  FURAT Radicados
                </span>
                <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  {accidentesCount} casos
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Accidentes de trabajo</span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">
                  Exámenes Ocup.
                </span>
                <div className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
                  {examenesCount} registros
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ingreso / Egreso / Per.</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">
                  PVE Activos
                </span>
                <div className="text-lg sm:text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {pveActiveCount} casos
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Osteomuscular / Psico</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Commercial Pipeline & Operational Alerts */}
        <div className="space-y-5">
          {/* Module 3: Embudo Comercial de Leads */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <Target size={13} /> Embudo de Conversión ARL
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Pipeline Comercial Activo
                </h3>
              </div>
              <Link
                href="/clientes"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver Leads ➔
              </Link>
            </div>

            <div className="space-y-3">
              {pipelineStages.map((stg) => {
                const stageLeads = leads.filter((l) => l.stage === stg.key);
                const stageCommission = stageLeads.reduce((sum, l) => {
                  const arl = arls.find((a) => a.id === l.proposedArlId);
                  const fin = calculateCompanyFinancials(l, arl);
                  return sum + fin.totalCommission;
                }, 0);
                const pct = leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0;

                return (
                  <div
                    key={stg.key}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        <span className={`w-2.5 h-2.5 rounded-full ${stg.color} shrink-0`} />
                        <span>{stg.label}</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          ({stageLeads.length} {stageLeads.length === 1 ? 'prospecto' : 'prospectos'})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatCOP(stageCommission)}/m
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stg.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, stageLeads.length > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module 4: Alertas Operativas en Tiempo Real */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0" /> Alertas Operativas
              </h3>
              <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                {pilaRecords.filter((r) => r.status === 'MORA' || r.status === 'DIVERGENCIA').length} Novedades
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
                      {rec.notes || `Planilla ${rec.month} presenta novedad en recaudo de comisión.`}
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
        </div>
      </div>
    </div>
  );
}
