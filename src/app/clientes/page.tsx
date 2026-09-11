'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Shield,
  Phone,
  Mail,
  MapPin,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Sparkles,
  Percent,
  UserCheck,
  HardHat,
  Target,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Calendar,
  Check,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  GripVertical,
  Hand,
  ExternalLink,
  RotateCcw,
  FileText,
  Printer,
  Download,
  Send,
  Undo2,
  Calculator,
  Stethoscope,
  Bot,
  Copy,
  Clock,
  Share2,
  Layers,
  Info,
  Award,
  ClipboardList,
  Save
} from 'lucide-react';
import { getStoredARLs, getStoredClients, saveStoredClients, getStoredLeads, saveStoredLeads, getStoredAgencyProfile } from '@/lib/storage';
import { ARLCompany, ClientCompany, CommissionConcept, RiskClass, RISK_RATES, LeadProspect, LeadStage, WorkCenter, AgencyProfile } from '@/types';
import { calculateCompanyFinancials, CompanyFinancialTotals } from '@/lib/calculations';
import {
  STANDARDS_0312,
  StandardItem0312,
  StandardEvaluationRecord,
  StandardComplianceStatus,
  getStandardsByScope,
  calculateScore0312
} from '@/lib/standards0312';
import { printDocumentById } from '@/lib/printUtils';

const STAGES: { key: LeadStage; label: string; shortLabel: string; color: string; bg: string; icon: string; border: string }[] = [
  { key: 'NUEVO_LEAD', label: 'Contacto Inicial', shortLabel: 'Contacto', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-500/30', icon: '📥' },
  { key: 'DIAGNOSTICO_ARL', label: 'Diagnóstico & Cotización', shortLabel: 'Diagnóstico', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-500/30', icon: '🔍' },
  { key: 'PROPUESTA_ENVIADA', label: 'Propuesta Enviada', shortLabel: 'Propuesta', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-500/30', icon: '📑' },
  { key: 'CARTA_NOMBRAMIENTO', label: 'Carta en Trámite', shortLabel: 'Trámite', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-500/30', icon: '✍️' },
  { key: 'GANADA_AFILIADA', label: 'Afiliada / Ganada', shortLabel: 'Afiliada', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-500/30', icon: '🏆' },
];

export default function ClientesPage() {
  const [activeTab, setActiveTab] = useState<'LEADS' | 'CLIENTES'>('CLIENTES');
  const [mobileSelectedStage, setMobileSelectedStage] = useState<LeadStage | 'ALL'>('ALL');
  const [arls, setArls] = useState<ARLCompany[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [leads, setLeads] = useState<LeadProspect[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArl, setFilterArl] = useState('TODAS');
  const [filterRisk, setFilterRisk] = useState('TODAS');
  const [filterSource, setFilterSource] = useState('TODOS');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Drag and Drop State (Mover con la manito)
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  // Client Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);

  // Lead Modal State
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadProspect | null>(null);

  // Work Centers Modal / Quick View State
  const [viewingWorkCentersTarget, setViewingWorkCentersTarget] = useState<{
    name: string;
    nit: string;
    arlName: string;
    financials: CompanyFinancialTotals;
  } | null>(null);

  // Letter Generation Modal State
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [letterData, setLetterData] = useState<{
    companyName: string;
    nit: string;
    city: string;
    legalRep: string;
    targetArl: string;
    concept: string;
  } | null>(null);

  // Reopen to Pipeline Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenClient, setReopenClient] = useState<ClientCompany | null>(null);
  const [reopenTargetStage, setReopenTargetStage] = useState<LeadStage>('CARTA_NOMBRAMIENTO');

  // WhatsApp Step-by-Step Cadence Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{
    leadOrClientId: string;
    companyName: string;
    currentArl: string;
    proposedArl: string;
    ibc: number;
    riskClass: RiskClass;
    city: string;
    legalRepName: string;
    legalRepPhone: string;
    sstName: string;
    sstPhone: string;
    workCentersCount?: number;
    effectiveArlRateFormatted?: string;
    currentStage?: LeadStage;
  } | null>(null);
  const [selectedRecipientType, setSelectedRecipientType] = useState<'LEGAL_REP' | 'SST_RESPONSIBLE'>('LEGAL_REP');
  const [whatsAppStep, setWhatsAppStep] = useState<number>(1);
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Direct Res. 0312 SG-SST Evaluation Modal State
  const [direct0312Client, setDirect0312Client] = useState<ClientCompany | null>(null);
  const [directStandardsCount, setDirectStandardsCount] = useState<7 | 21 | 60>(60);
  const [directEvaluations, setDirectEvaluations] = useState<Record<string, StandardEvaluationRecord>>({});
  const [directModalSearch, setDirectModalSearch] = useState('');
  const [directModalCycleFilter, setDirectModalCycleFilter] = useState<'TODOS' | 'PLANEAR' | 'HACER' | 'VERIFICAR' | 'ACTUAR'>('TODOS');
  const [directSaveSuccess, setDirectSaveSuccess] = useState(false);

  // Retorno a la Empresa & Bolsa SST Modal State
  const [retornoClient, setRetornoClient] = useState<ClientCompany | null>(null);
  const [retornoModalPercentage, setRetornoModalPercentage] = useState<number>(25);
  const [retornoSaveSuccess, setRetornoSaveSuccess] = useState<boolean>(false);

  // Form State: Empresa & Lead
  const [nit, setNit] = useState('');
  const [name, setName] = useState('');
  const [economicActivity, setEconomicActivity] = useState('');
  const [ciiuCode, setCiiuCode] = useState('');
  const [primaryArlId, setPrimaryArlId] = useState('sura');
  const [riskClass, setRiskClass] = useState<RiskClass>('CLASE_I');
  const [monthlyIbc, setMonthlyIbc] = useState<number>(50000000);
  const [employeeCount, setEmployeeCount] = useState<number>(15);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bogotá');
  const [conceptType, setConceptType] = useState<CommissionConcept>('EMPRESA_NUEVA');
  const [customOverride, setCustomOverride] = useState<string>('');
  const [returnPercentage, setReturnPercentage] = useState<number>(25);

  // Multi-Risk Centros de Trabajo Form State
  const [isMultiRiskMode, setIsMultiRiskMode] = useState<boolean>(false);
  const [formWorkCenters, setFormWorkCenters] = useState<WorkCenter[]>([]);

  // Form State: Lead Specific
  const [currentArlId, setCurrentArlId] = useState('positiva');
  const [proposedArlId, setProposedArlId] = useState('sura');
  const [leadStage, setLeadStage] = useState<LeadStage>('NUEVO_LEAD');
  const [leadSource, setLeadSource] = useState<LeadProspect['source']>('WHATSAPP');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextFollowUpAction, setNextFollowUpAction] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  // Representante Legal
  const [legalRepName, setLegalRepName] = useState('');
  const [legalRepEmail, setLegalRepEmail] = useState('');
  const [legalRepPhone, setLegalRepPhone] = useState('');

  // Responsable SST
  const [sstResponsibleName, setSstResponsibleName] = useState('');
  const [sstResponsibleEmail, setSstResponsibleEmail] = useState('');
  const [sstResponsiblePhone, setSstResponsiblePhone] = useState('');
  const [sstResponsibleLicense, setSstResponsibleLicense] = useState('');

  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    setArls(getStoredARLs());
    setClients(getStoredClients());
    setLeads(getStoredLeads());
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    const handleDataSynced = () => {
      setArls(getStoredARLs());
      setClients(getStoredClients());
      setLeads(getStoredLeads());
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);
    window.addEventListener('praxis_data_synced', handleDataSynced);
    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
      window.removeEventListener('praxis_data_synced', handleDataSynced);
    };
  }, []);

  // Keyboard shortcut listener to cleanly intercept Cmd+P / Ctrl+P when Letter Modal is open
  useEffect(() => {
    if (!showLetterModal || !letterData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printDocumentById('carta-nombramiento-sheet', `Carta Nombramiento - ${letterData.companyName}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLetterModal, letterData]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper to add a work center in form
  const handleAddWorkCenter = () => {
    const newWc: WorkCenter = {
      id: `wc-${Date.now()}`,
      name: `Centro de Trabajo ${formWorkCenters.length + 1}`,
      ciiuCode: ciiuCode || '8211',
      riskClass: 'CLASE_I',
      employeeCount: 5,
      monthlyIbc: 15000000,
      city: city || 'Bogotá',
    };
    setFormWorkCenters([...formWorkCenters, newWc]);
  };

  const handleRemoveWorkCenter = (id: string) => {
    if (formWorkCenters.length <= 1) {
      alert('Debe existir al menos un Centro de Trabajo en modo multiriesgo.');
      return;
    }
    setFormWorkCenters(formWorkCenters.filter((w) => w.id !== id));
  };

  const handleUpdateWorkCenter = (id: string, field: keyof WorkCenter, val: any) => {
    setFormWorkCenters(
      formWorkCenters.map((w) => (w.id === id ? { ...w, [field]: val } : w))
    );
  };

  // Compute live totals for the modal form
  const formCalculatedTotals = isMultiRiskMode
    ? calculateCompanyFinancials(
        {
          monthlyIbc: 0,
          employeeCount: 0,
          riskClass,
          conceptType,
          customCommissionOverride: customOverride ? parseFloat(customOverride) : undefined,
      returnPercentage,
          workCenters: formWorkCenters,
        },
        arls.find((a) => a.id === (activeTab === 'LEADS' ? proposedArlId : primaryArlId))
      )
    : calculateCompanyFinancials(
        {
          monthlyIbc,
          employeeCount,
          riskClass,
          conceptType,
          customCommissionOverride: customOverride ? parseFloat(customOverride) : undefined,
        },
        arls.find((a) => a.id === (activeTab === 'LEADS' ? proposedArlId : primaryArlId))
      );

  // WhatsApp Sequencer helper
  const buildStepMessage = (
    stepNum: number,
    target: NonNullable<typeof whatsAppTarget>,
    recipient: 'LEGAL_REP' | 'SST_RESPONSIBLE'
  ) => {
    const contactName = recipient === 'LEGAL_REP' ? target.legalRepName || 'Representante Legal' : target.sstName || 'Encargado de Seguridad y Salud en el Trabajo';
    const curArlName = arls.find((a) => a.id === target.currentArl)?.name || target.currentArl;
    const propArlName = arls.find((a) => a.id === target.proposedArl)?.name || target.proposedArl;
    const formattedIbc = formatCOP(target.ibc);
    const riskLabel = target.workCentersCount && target.workCentersCount > 1
      ? `${target.workCentersCount} Centros de Trabajo (Tasa Ponderada ${target.effectiveArlRateFormatted || 'mixta'})`
      : RISK_RATES[target.riskClass]?.label || target.riskClass;

    switch (stepNum) {
      case 1:
        return `Hola ${contactName}, cordial saludo de parte del equipo de *PRAXIS Prevención y Seguros*. 

Hemos realizado un análisis preliminar de las coberturas y oportunidades de optimización en riesgos laborales para *${target.companyName}* (actualmente con ${curArlName}). 

Con *${propArlName}*, podemos coordinar acompañamiento técnico especializado en SG-SST, médicos laborales y optimización de tarifas en sus centros de trabajo sin ningún costo adicional para su empresa (honorarios cubiertos 100% por la ARL según Sentencia C-049/2022).

¿Podríamos coordinar una breve llamada de 5 minutos hoy para presentarle los beneficios?`;

      case 2:
        return `Estimado(a) ${contactName}, un gusto saludarle nuevamente.

Ya tenemos listo el *Diagnóstico Técnico de Siniestralidad y Cotización ARL* para *${target.companyName}*, estructurado sobre su nómina consolidada de ${formattedIbc} en ${riskLabel}.

Este estudio demuestra cómo optimizar aportes y acceder a horas de ingeniería SST in situ y auditoría Res. 0312 de forma inmediata.

¿Le parece bien si le comparto el reporte en PDF por este medio o programamos una videollamada de 10 minutos para revisarlo?`;

      case 3:
        return `Hola ${contactName}, le comparto que la *Propuesta Integral de Intermediación ARL* para *${target.companyName}* ante *${propArlName}* ha sido emitida satisfactoriamente.

Incluye:
✅ Asignación de ingeniero SST con bitácora RUI MinTrabajo.
✅ Médico especialista para historias clínicas y ausentismo (Res. 2346).
✅ Asistencia en liquidación mensual PILA 0% IVA por cada centro de trabajo.

Quedamos muy atentos a sus observaciones para proceder con la carta formal de nombramiento.`;

      case 4:
        return `Apreciado(a) ${contactName}, para formalizar el inicio de actividades y la intermediación de *${target.companyName}* ante *${propArlName}*, solo requerimos la firma digital de la *Carta de Nombramiento de Intermediario*.

Le recordamos que, conforme a la *Sentencia C-049 de 2022* de la Corte Constitucional y la Res. 3544, este trámite no genera ningún gasto ni descuento en su nómina.

¿Pudo revisar el borrador que le preparamos o requiere que se lo reenvíe?`;

      case 5:
        return `🎉 ¡Felicitaciones ${contactName}! 

Nos complace informarle que el proceso de vinculación e intermediación de *${target.companyName}* con *${propArlName}* ha culminado con éxito.

A partir de este momento cuentan con el respaldo integral de *PRAXIS Prevención y Seguros* para todos sus centros de trabajo. Nuestro equipo técnico se comunicará esta semana para agendar la primera visita diagnóstica del SG-SST.

¡Gracias por confiar en nosotros!`;

      default:
        return `Hola ${contactName}, te escribimos desde PRAXIS Prevención y Seguros para dar seguimiento a la gestión de riesgos laborales de ${target.companyName}.`;
    }
  };

  const openWhatsAppModalForLead = (lead: LeadProspect) => {
    let initialStep = 1;
    if (lead.stage === 'DIAGNOSTICO_ARL') initialStep = 2;
    else if (lead.stage === 'PROPUESTA_ENVIADA') initialStep = 3;
    else if (lead.stage === 'CARTA_NOMBRAMIENTO') initialStep = 4;
    else if (lead.stage === 'GANADA_AFILIADA') initialStep = 5;

    const propArl = arls.find((a) => a.id === lead.proposedArlId);
    const fin = calculateCompanyFinancials(lead, propArl);

    const target = {
      leadOrClientId: lead.id,
      companyName: lead.name,
      currentArl: lead.currentArlId,
      proposedArl: lead.proposedArlId,
      ibc: fin.totalIbc,
      riskClass: lead.riskClass,
      city: lead.city,
      legalRepName: lead.legalRepName || 'Representante Legal',
      legalRepPhone: lead.legalRepPhone || '',
      sstName: lead.sstResponsibleName || 'Responsable SST',
      sstPhone: lead.sstResponsiblePhone || '',
      workCentersCount: fin.workCentersCount,
      effectiveArlRateFormatted: fin.effectiveArlRateFormatted,
      currentStage: lead.stage,
    };

    setWhatsAppTarget(target);
    setSelectedRecipientType('LEGAL_REP');
    setWhatsAppStep(initialStep);
    setCustomWhatsAppMessage(buildStepMessage(initialStep, target, 'LEGAL_REP'));
    setShowWhatsAppModal(true);
  };

  const openWhatsAppModalForClient = (client: ClientCompany) => {
    const arl = arls.find((a) => a.id === client.primaryArlId);
    const fin = calculateCompanyFinancials(client, arl);

    const target = {
      leadOrClientId: client.id,
      companyName: client.name,
      currentArl: client.primaryArlId,
      proposedArl: client.primaryArlId,
      ibc: fin.totalIbc,
      riskClass: client.riskClass,
      city: client.city || 'Bogotá',
      legalRepName: client.legalRepName || 'Representante Legal',
      legalRepPhone: client.legalRepPhone || '',
      sstName: client.sstResponsibleName || 'Responsable SST',
      sstPhone: client.sstResponsiblePhone || '',
      workCentersCount: fin.workCentersCount,
      effectiveArlRateFormatted: fin.effectiveArlRateFormatted,
    };

    setWhatsAppTarget(target);
    setSelectedRecipientType('LEGAL_REP');
    setWhatsAppStep(5);
    setCustomWhatsAppMessage(buildStepMessage(5, target, 'LEGAL_REP'));
    setShowWhatsAppModal(true);
  };

  const handleStepChange = (step: number) => {
    setWhatsAppStep(step);
    if (whatsAppTarget) {
      setCustomWhatsAppMessage(buildStepMessage(step, whatsAppTarget, selectedRecipientType));
    }
  };

  const handleRecipientChange = (type: 'LEGAL_REP' | 'SST_RESPONSIBLE') => {
    setSelectedRecipientType(type);
    if (whatsAppTarget) {
      setCustomWhatsAppMessage(buildStepMessage(whatsAppStep, whatsAppTarget, type));
    }
  };

  const cleanPhoneNumber = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.startsWith('57')) return digits;
    if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
    return digits;
  };

  const handleSendDirectToWhatsApp = () => {
    if (!whatsAppTarget) return;
    const phoneRaw = selectedRecipientType === 'LEGAL_REP' ? whatsAppTarget.legalRepPhone : whatsAppTarget.sstPhone;
    const phone = cleanPhoneNumber(phoneRaw);

    if (!phone) {
      alert('Por favor registra o verifica el número de celular del destinatario antes de enviar.');
      return;
    }

    const encoded = encodeURIComponent(customWhatsAppMessage);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
    showToast(`🚀 Mensaje enviado a WhatsApp (${phone})`);
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(customWhatsAppMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
    showToast('📋 Mensaje copiado al portapapeles');
  };

  // Direct Res. 0312 SG-SST Handlers
  const openDirect0312Modal = (client: ClientCompany) => {
    setDirect0312Client(client);
    setDirectSaveSuccess(false);
    setDirectModalSearch('');
    setDirectModalCycleFilter('TODOS');

    const emp = client.employeeCount || 10;
    const isHighRisk = client.riskClass === 'CLASE_IV' || client.riskClass === 'CLASE_V';
    const defaultScope: 7 | 21 | 60 = client.standardsCount || (isHighRisk || emp > 50 ? 60 : emp >= 11 ? 21 : 7);

    setDirectStandardsCount(defaultScope);

    if (client.standardsEvaluations && Object.keys(client.standardsEvaluations).length > 0) {
      setDirectEvaluations(client.standardsEvaluations);
    } else {
      const items = getStandardsByScope(defaultScope);
      const initial: Record<string, StandardEvaluationRecord> = {};
      items.forEach((item, index) => {
        initial[item.id] = {
          status: index % 5 === 0 ? 'NO_CUMPLE' : 'CUMPLE',
          observation: '',
        };
      });
      setDirectEvaluations(initial);
    }
  };

  const handleDirectScopeChange = (newScope: 7 | 21 | 60) => {
    setDirectStandardsCount(newScope);
    const items = getStandardsByScope(newScope);
    const initial: Record<string, StandardEvaluationRecord> = {};
    items.forEach((item, index) => {
      initial[item.id] = directEvaluations[item.id] || {
        status: index % 5 === 0 ? 'NO_CUMPLE' : 'CUMPLE',
        observation: '',
      };
    });
    setDirectEvaluations(initial);
  };

  const handleDirectStatusChange = (itemId: string, status: StandardComplianceStatus) => {
    setDirectEvaluations((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status,
      },
    }));
  };

  const handleDirectObservationChange = (itemId: string, observation: string) => {
    setDirectEvaluations((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observation,
      },
    }));
  };

  const handleDirectMarkAllCumple = () => {
    const updated = { ...directEvaluations };
    const items = getStandardsByScope(directStandardsCount);
    items.forEach((s) => {
      updated[s.id] = {
        ...(updated[s.id] || {}),
        status: 'CUMPLE',
      };
    });
    setDirectEvaluations(updated);
  };

  const handleDirectResetEvaluations = () => {
    const updated = { ...directEvaluations };
    const items = getStandardsByScope(directStandardsCount);
    items.forEach((s) => {
      updated[s.id] = {
        ...(updated[s.id] || {}),
        status: 'NO_CUMPLE',
      };
    });
    setDirectEvaluations(updated);
  };

  const handleSaveDirect0312 = () => {
    if (!direct0312Client) return;
    const scoreData = calculateScore0312(directStandardsCount, directEvaluations);
    const today = new Date().toISOString().split('T')[0];

    const updatedClients = clients.map((c) =>
      c.id === direct0312Client.id
        ? {
            ...c,
            standardsCount: directStandardsCount,
            standardsScore: scoreData.score,
            standardsRating: scoreData.rating,
            lastStandardsAuditDate: today,
            standardsEvaluations: directEvaluations,
          }
        : c
    );

    setClients(updatedClients);
    saveStoredClients(updatedClients);
    setDirectSaveSuccess(true);
    showToast(`✅ Autoevaluación 0312 de "${direct0312Client.name}" guardada: ${scoreData.score}% (${scoreData.ratingLabel})`);
    setTimeout(() => {
      setDirectSaveSuccess(false);
      setDirect0312Client(null);
    }, 1000);
  };

  // Retorno a Empresa Handlers
  const openRetornoModal = (client: ClientCompany) => {
    setRetornoClient(client);
    setRetornoModalPercentage(client.returnPercentage ?? 25);
    setRetornoSaveSuccess(false);
  };

  const handleSaveRetorno = () => {
    if (!retornoClient) return;
    const updatedClients = clients.map((c) =>
      c.id === retornoClient.id
        ? { ...c, returnPercentage: retornoModalPercentage }
        : c
    );
    setClients(updatedClients);
    saveStoredClients(updatedClients);
    setRetornoSaveSuccess(true);
    showToast(`✅ Retorno a empresa para "${retornoClient.name}" fijado en ${retornoModalPercentage}%`);
    setTimeout(() => {
      setRetornoSaveSuccess(false);
      setRetornoClient(null);
    }, 900);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    const updated = leads.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l));
    setLeads(updated);
    saveStoredLeads(updated);
    setDraggedLeadId(null);

    const targetStageDef = STAGES.find((s) => s.key === targetStage);
    showToast(`✋ Prospecto "${lead.name}" desplazado a: ${targetStageDef?.label}`);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  // Revert / Advance single stage directly
  const handleStepStage = (leadId: string, direction: 'PREV' | 'NEXT') => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = STAGES.findIndex((s) => s.key === lead.stage);
    const targetIndex = direction === 'NEXT' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < STAGES.length) {
      const targetStage = STAGES[targetIndex].key;
      const updated = leads.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l));
      setLeads(updated);
      saveStoredLeads(updated);
      showToast(`Prospecto "${lead.name}" movido a: ${STAGES[targetIndex].label}`);
    }
  };

  // Reopen Client to Pipeline
  const handleConfirmReopenToPipeline = () => {
    if (!reopenClient) return;

    const arl = arls.find((a) => a.id === reopenClient.primaryArlId);
    const fin = calculateCompanyFinancials(reopenClient, arl);

    const reopenedLead: LeadProspect = {
      id: `lead-reopen-${Date.now().toString().slice(-4)}`,
      name: reopenClient.name,
      nit: reopenClient.nit,
      economicActivity: reopenClient.economicActivity,
      currentArlId: reopenClient.primaryArlId,
      proposedArlId: reopenClient.primaryArlId,
      riskClass: reopenClient.riskClass,
      estimatedIbc: fin.totalIbc,
      employeeCount: fin.totalEmployees,
      city: reopenClient.city || 'Bogotá',
      stage: reopenTargetStage,
      source: 'REFERIDO',
      conceptType: reopenClient.conceptType,
      customCommissionOverride: reopenClient.customCommissionOverride,
      returnPercentage: reopenClient.returnPercentage ?? 25,
      workCenters: reopenClient.workCenters,
      legalRepName: reopenClient.legalRepName || '',
      legalRepEmail: reopenClient.legalRepEmail || '',
      legalRepPhone: reopenClient.legalRepPhone || '',
      sstResponsibleName: reopenClient.sstResponsibleName || '',
      sstResponsibleEmail: reopenClient.sstResponsibleEmail || '',
      sstResponsiblePhone: reopenClient.sstResponsiblePhone || '',
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      nextFollowUpAction: 'Revisión y renegociación de condiciones con la ARL o trámite de traslado.',
      estimatedMonthlyCommission: fin.totalCommission,
      notes: `Reabierto desde cartera activa el ${new Date().toLocaleDateString('es-CO')}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedLeads = [reopenedLead, ...leads];
    setLeads(updatedLeads);
    saveStoredLeads(updatedLeads);
    setShowReopenModal(false);
    showToast(`↩️ "${reopenClient.name}" reabierto en el Pipeline de Prospección`);
    setActiveTab('LEADS');
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setNit('');
    setName('');
    setEconomicActivity('');
    setCiiuCode('');
    setPrimaryArlId(arls[0]?.id || 'sura');
    setRiskClass('CLASE_I');
    setMonthlyIbc(50000000);
    setEmployeeCount(15);
    setAddress('');
    setCity('Bogotá');
    setConceptType('EMPRESA_NUEVA');
    setCustomOverride('');
    setReturnPercentage(25);
    setIsMultiRiskMode(false);
    setFormWorkCenters([
      { id: 'wc-1', name: 'Sede Administrativa Principal', ciiuCode: '8211', riskClass: 'CLASE_I', employeeCount: 10, monthlyIbc: 30000000, city: 'Bogotá' },
      { id: 'wc-2', name: 'Planta Operativa / Almacén', ciiuCode: '4923', riskClass: 'CLASE_III', employeeCount: 15, monthlyIbc: 25000000, city: 'Bogotá' }
    ]);
    setLegalRepName('');
    setLegalRepEmail('');
    setLegalRepPhone('');
    setSstResponsibleName('');
    setSstResponsibleEmail('');
    setSstResponsiblePhone('');
    setSstResponsibleLicense('');
    setShowClientModal(true);
  };

  const openEditClientModal = (client: ClientCompany) => {
    setEditingClient(client);
    setNit(client.nit);
    setName(client.name);
    setEconomicActivity(client.economicActivity);
    setCiiuCode(client.ciiuCode);
    setPrimaryArlId(client.primaryArlId);
    setRiskClass(client.riskClass);
    setMonthlyIbc(client.monthlyIbc);
    setEmployeeCount(client.employeeCount);
    setAddress(client.address || '');
    setCity(client.city || 'Bogotá');
    setConceptType(client.conceptType);
    setCustomOverride(client.customCommissionOverride ? client.customCommissionOverride.toString() : '');
    setReturnPercentage(client.returnPercentage ?? 25);

    if (client.workCenters && client.workCenters.length > 0) {
      setIsMultiRiskMode(true);
      setFormWorkCenters(client.workCenters);
    } else {
      setIsMultiRiskMode(false);
      setFormWorkCenters([
        { id: 'wc-1', name: 'Sede Administrativa', ciiuCode: client.ciiuCode || '8211', riskClass: client.riskClass, employeeCount: client.employeeCount, monthlyIbc: client.monthlyIbc, city: client.city }
      ]);
    }

    setLegalRepName(client.legalRepName || '');
    setLegalRepEmail(client.legalRepEmail || '');
    setLegalRepPhone(client.legalRepPhone || '');
    setSstResponsibleName(client.sstResponsibleName || '');
    setSstResponsibleEmail(client.sstResponsibleEmail || '');
    setSstResponsiblePhone(client.sstResponsiblePhone || '');
    setSstResponsibleLicense(client.sstResponsibleLicense || '');
    setShowClientModal(true);
  };

  const openNewLeadModal = () => {
    setEditingLead(null);
    setName('');
    setNit('');
    setEconomicActivity('');
    setCurrentArlId(arls[0]?.id || 'positiva');
    setProposedArlId('sura');
    setRiskClass('CLASE_III');
    setMonthlyIbc(80000000);
    setEmployeeCount(25);
    setCity('Bogotá');
    setLeadStage('NUEVO_LEAD');
    setLeadSource('WHATSAPP');
    setConceptType('NOMBRAMIENTO');
    setCustomOverride('');
    setReturnPercentage(25);
    setIsMultiRiskMode(false);
    setFormWorkCenters([
      { id: 'wc-lead-1', name: 'Sede Administrativa Principal', ciiuCode: '8211', riskClass: 'CLASE_I', employeeCount: 10, monthlyIbc: 30000000, city: 'Bogotá' },
      { id: 'wc-lead-2', name: 'Operación Técnica / Campo', ciiuCode: '4111', riskClass: 'CLASE_IV', employeeCount: 15, monthlyIbc: 50000000, city: 'Bogotá' }
    ]);
    setLegalRepName('');
    setLegalRepEmail('');
    setLegalRepPhone('');
    setSstResponsibleName('');
    setSstResponsibleEmail('');
    setSstResponsiblePhone('');
    setNextFollowUpDate(new Date().toISOString().split('T')[0]);
    setNextFollowUpAction('Llamar para coordinar diagnóstico de siniestralidad y propuesta de valor');
    setLeadNotes('');
    setShowLeadModal(true);
  };

  const openEditLeadModal = (lead: LeadProspect) => {
    setEditingLead(lead);
    setName(lead.name);
    setNit(lead.nit || '');
    setEconomicActivity(lead.economicActivity);
    setCurrentArlId(lead.currentArlId);
    setProposedArlId(lead.proposedArlId);
    setRiskClass(lead.riskClass);
    setMonthlyIbc(lead.estimatedIbc);
    setEmployeeCount(lead.employeeCount);
    setCity(lead.city);
    setLeadStage(lead.stage);
    setLeadSource(lead.source);
    setConceptType(lead.conceptType);
    setCustomOverride(lead.customCommissionOverride ? lead.customCommissionOverride.toString() : '');
    setReturnPercentage(lead.returnPercentage ?? 25);
    setIsMultiRiskMode(!!(lead.workCenters && lead.workCenters.length > 0));
    setFormWorkCenters(lead.workCenters || []);
    setLegalRepName(lead.legalRepName || '');
    setLegalRepEmail(lead.legalRepEmail || '');
    setLegalRepPhone(lead.legalRepPhone || '');
    setSstResponsibleName(lead.sstResponsibleName || '');
    setSstResponsibleEmail(lead.sstResponsibleEmail || '');
    setSstResponsiblePhone(lead.sstResponsiblePhone || '');
    setNextFollowUpDate(lead.nextFollowUpDate || new Date().toISOString().split('T')[0]);
    setNextFollowUpAction(lead.nextFollowUpAction || '');
    setLeadNotes(lead.notes || '');
    setShowLeadModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIbc = isMultiRiskMode ? formCalculatedTotals.totalIbc : monthlyIbc;
    const finalEmployees = isMultiRiskMode ? formCalculatedTotals.totalEmployees : employeeCount;
    const finalRisk = isMultiRiskMode && formWorkCenters.length > 0 ? formWorkCenters[0].riskClass : riskClass;

    const clientPayload: ClientCompany = {
      id: editingClient ? editingClient.id : `cli-${Date.now().toString().slice(-4)}`,
      nit,
      name,
      economicActivity,
      ciiuCode,
      primaryArlId,
      riskClass: finalRisk,
      monthlyIbc: finalIbc,
      employeeCount: finalEmployees,
      address,
      city,
      conceptType,
      customCommissionOverride: customOverride ? parseFloat(customOverride) : undefined,
      workCenters: isMultiRiskMode ? formWorkCenters : undefined,
      status: editingClient ? editingClient.status : 'ACTIVO',
      legalRepName,
      legalRepEmail,
      legalRepPhone,
      sstResponsibleName,
      sstResponsibleEmail,
      sstResponsiblePhone,
      sstResponsibleLicense,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString().split('T')[0],
      lastPilaDate: editingClient ? editingClient.lastPilaDate : new Date().toISOString().split('T')[0],
    };

    let updated: ClientCompany[];
    if (editingClient) {
      updated = clients.map((c) => (c.id === editingClient.id ? clientPayload : c));
    } else {
      updated = [clientPayload, ...clients];
    }

    setClients(updated);
    saveStoredClients(updated);
    setShowClientModal(false);
    showToast(`Empresa "${name}" guardada con ${isMultiRiskMode ? formWorkCenters.length + ' centros de trabajo' : 'sede única'}`);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIbc = isMultiRiskMode ? formCalculatedTotals.totalIbc : monthlyIbc;
    const finalEmployees = isMultiRiskMode ? formCalculatedTotals.totalEmployees : employeeCount;
    const finalRisk = isMultiRiskMode && formWorkCenters.length > 0 ? formWorkCenters[0].riskClass : riskClass;
    const estCommission = formCalculatedTotals.totalCommission;

    const leadPayload: LeadProspect = {
      id: editingLead ? editingLead.id : `lead-${Date.now().toString().slice(-4)}`,
      name,
      nit,
      economicActivity,
      currentArlId,
      proposedArlId,
      riskClass: finalRisk,
      estimatedIbc: finalIbc,
      employeeCount: finalEmployees,
      city,
      stage: leadStage,
      source: leadSource,
      conceptType,
      customCommissionOverride: customOverride ? parseFloat(customOverride) : undefined,
      returnPercentage: returnPercentage || 25,
      workCenters: isMultiRiskMode ? formWorkCenters : undefined,
      legalRepName,
      legalRepEmail,
      legalRepPhone,
      sstResponsibleName,
      sstResponsibleEmail,
      sstResponsiblePhone,
      nextFollowUpDate,
      nextFollowUpAction,
      estimatedMonthlyCommission: estCommission,
      notes: leadNotes,
      createdAt: editingLead ? editingLead.createdAt : new Date().toISOString().split('T')[0],
    };

    let updated: LeadProspect[];
    if (editingLead) {
      updated = leads.map((l) => (l.id === editingLead.id ? leadPayload : l));
    } else {
      updated = [leadPayload, ...leads];
    }

    setLeads(updated);
    saveStoredLeads(updated);
    setShowLeadModal(false);
    showToast(`Prospecto "${name}" guardado en el pipeline comercial`);
  };

  const handleConvertLeadToClient = (lead: LeadProspect) => {
    const arl = arls.find((a) => a.id === lead.proposedArlId);
    const fin = calculateCompanyFinancials(lead, arl);

    // Resolución 0312 de 2019: Determinación automática y rigurosa de estándares
    const isHighRisk = lead.riskClass === 'CLASE_IV' || lead.riskClass === 'CLASE_V';
    const totalEmp = fin.totalEmployees || lead.employeeCount || 10;
    const defaultStandardsCount: 7 | 21 | 60 = (isHighRisk || totalEmp > 50) ? 60 : (totalEmp >= 11 ? 21 : 7);

    const newClient: ClientCompany = {
      id: `cli-${Date.now().toString().slice(-4)}`,
      nit: lead.nit || '900.000.000-0',
      name: lead.name,
      economicActivity: lead.economicActivity,
      ciiuCode: lead.ciiuCode || '4111',
      primaryArlId: lead.proposedArlId,
      riskClass: lead.riskClass,
      monthlyIbc: fin.totalIbc,
      employeeCount: fin.totalEmployees,
      address: `Sede Principal ${lead.city}`,
      city: lead.city,
      conceptType: lead.conceptType,
      customCommissionOverride: lead.customCommissionOverride,
      returnPercentage: lead.returnPercentage ?? 25,
      workCenters: lead.workCenters,
      status: 'ACTIVO',
      legalRepName: lead.legalRepName,
      legalRepEmail: lead.legalRepEmail,
      legalRepPhone: lead.legalRepPhone,
      sstResponsibleName: lead.sstResponsibleName,
      sstResponsibleEmail: lead.sstResponsibleEmail,
      sstResponsiblePhone: lead.sstResponsiblePhone,
      createdAt: new Date().toISOString().split('T')[0],
      lastPilaDate: new Date().toISOString().split('T')[0],
      standardsCount: defaultStandardsCount,
      standardsScore: 0,
      standardsRating: 'CRITICO',
    };

    const updatedClients = [newClient, ...clients];
    setClients(updatedClients);
    saveStoredClients(updatedClients);

    const updatedLeads = leads.map((l) => (l.id === lead.id ? { ...l, stage: 'GANADA_AFILIADA' as const } : l));
    setLeads(updatedLeads);
    saveStoredLeads(updatedLeads);

    showToast(`🎉 ¡"${lead.name}" ha sido afiliada con ${defaultStandardsCount} estándares (Res. 0312) y ${newClient.returnPercentage}% de retorno SST!`);
    setActiveTab('CLIENTES');
  };

  const openLetterGenerator = (company: {
    name: string;
    nit: string;
    city: string;
    legalRepName: string;
    arlId: string;
    conceptType: string;
  }) => {
    const arl = arls.find((a) => a.id === company.arlId);
    setLetterData({
      companyName: company.name,
      nit: company.nit,
      city: company.city || 'Bogotá D.C.',
      legalRep: company.legalRepName || 'REPRESENTANTE LEGAL',
      targetArl: arl?.name || 'ADMINISTRADORA DE RIESGOS LABORALES',
      concept: company.conceptType === 'CAMBIO_INTERMEDIARIO' ? 'CAMBIO DE INTERMEDIARIO' : company.conceptType === 'EMPRESA_NUEVA' ? 'EMPRESA NUEVA' : 'NOMBRAMIENTO DE INTERMEDIARIO',
    });
    setShowLetterModal(true);
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'LEADS') {
      csvContent += 'ID,Empresa,NIT,Ciudad,ARL_Actual,ARL_Propuesta,Riesgo_Principal,Centros_Trabajo,IBC_Mensual,Empleados,Etapa,Comision_Estimada,Rep_Legal,Celular_Rep,Encargado_SST\n';
      leads.forEach((l) => {
        const arl = arls.find((a) => a.id === l.proposedArlId);
        const fin = calculateCompanyFinancials(l, arl);
        csvContent += `"${l.id}","${l.name}","${l.nit}","${l.city}","${l.currentArlId}","${l.proposedArlId}","${l.riskClass}",${fin.workCentersCount},${fin.totalIbc},${fin.totalEmployees},"${l.stage}",${fin.totalCommission},"${l.legalRepName}","${l.legalRepPhone}","${l.sstResponsibleName}"\n`;
      });
    } else {
      csvContent += 'ID,Empresa,NIT,Ciudad,ARL,Riesgo_Principal,Centros_Trabajo,IBC_Mensual,Empleados,Concepto,Rep_Legal,Celular_Rep,Encargado_SST,Licencia_SST\n';
      clients.forEach((c) => {
        const arl = arls.find((a) => a.id === c.primaryArlId);
        const fin = calculateCompanyFinancials(c, arl);
        csvContent += `"${c.id}","${c.name}","${c.nit}","${c.city}","${c.primaryArlId}","${c.riskClass}",${fin.workCentersCount},${fin.totalIbc},${fin.totalEmployees},"${c.conceptType}","${c.legalRepName}","${c.legalRepPhone}","${c.sstResponsibleName}","${c.sstResponsibleLicense || ''}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wappy_${activeTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Base de datos exportada a CSV`);
  };

  const handleDeleteLead = (id: string) => {
    if (confirm('¿Deseas eliminar este prospecto del pipeline?')) {
      const updated = leads.filter((l) => l.id !== id);
      setLeads(updated);
      saveStoredLeads(updated);
    }
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta empresa cliente? Se actualizarán todos los módulos asociados.')) {
      const updated = clients.filter((c) => c.id !== id);
      setClients(updated);
      saveStoredClients(updated);
    }
  };

  const showToast = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const filteredClients = clients.filter((c) => {
    const matchesArl = filterArl === 'TODAS' || c.primaryArlId === filterArl;
    const matchesRisk = filterRisk === 'TODAS' || c.riskClass === filterRisk;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.legalRepName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sstResponsibleName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArl && matchesRisk && matchesSearch;
  });

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.nit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.legalRepName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'TODOS' || l.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const totalPipelineCommission = leads.reduce((sum, l) => {
    const arl = arls.find((a) => a.id === l.proposedArlId);
    const fin = calculateCompanyFinancials(l, arl);
    return sum + fin.totalCommission;
  }, 0);

  const directCurrentScoreData = calculateScore0312(directStandardsCount, directEvaluations);

  const directStandardsList = getStandardsByScope(directStandardsCount);
  const directFilteredStandards = directStandardsList.filter((s) => {
    const matchesCycle = directModalCycleFilter === 'TODOS' || s.cycle === directModalCycleFilter;
    const matchesSearch =
      directModalSearch === '' ||
      s.numeral.toLowerCase().includes(directModalSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(directModalSearch.toLowerCase()) ||
      s.criterion.toLowerCase().includes(directModalSearch.toLowerCase());
    return matchesCycle && matchesSearch;
  });

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
              CRM & GESTIÓN 360°
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers size={13} className="text-blue-500" /> Centros de Trabajo Multiriesgo (Clases I a V)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Gestión Comercial, Leads & Clientes ARL
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Cálculo exacto de comisiones ponderadas por múltiples centros de trabajo, nóminas y clases de riesgo.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
            title="Exportar a Excel / CSV"
          >
            <Download size={14} /> <span className="inline">Exportar Excel</span>
          </button>

          {activeTab === 'LEADS' ? (
            <button
              onClick={openNewLeadModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              <UserPlus size={14} /> <span>Nuevo Lead Multiriesgo</span>
            </button>
          ) : (
            <button
              onClick={openNewClientModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              <Plus size={14} /> <span>Nueva Empresa Multiriesgo</span>
            </button>
          )}
        </div>
      </div>

      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{successBanner}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LEADS')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'LEADS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Target size={14} /> Pipeline Leads ({leads.length})
          </button>

          <button
            onClick={() => setActiveTab('CLIENTES')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CLIENTES'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Building2 size={14} /> Empresas Activas ({clients.length} Clientes)
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold justify-end">
          <TrendingUp size={14} /> {activeTab === 'LEADS' ? `Potencial Cartera: ${formatCOP(totalPipelineCommission)}/m` : `${clients.length} Empresas Gestionadas`}
        </div>
      </div>

      {/* Search and Filters Strip */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empresa, NIT, centro de trabajo, rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeTab === 'CLIENTES' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
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
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas las Clases de Riesgo</option>
              {Object.keys(RISK_RATES).map((r) => (
                <option key={r} value={r}>
                  {RISK_RATES[r as RiskClass].label} ({RISK_RATES[r as RiskClass].percentageText})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Origen:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full md:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los Orígenes</option>
              <option value="WHATSAPP">💬 WhatsApp</option>
              <option value="REFERIDO">🤝 Referido</option>
              <option value="LLAMADA_FRIO">📞 Llamada Comercial</option>
              <option value="WEB">🌐 Sitio Web</option>
              <option value="EVENTO_SST">👷 Evento SST</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: PIPELINE LEADS (KANBAN) */}
      {activeTab === 'LEADS' && (
        <div className="space-y-4">
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setMobileSelectedStage('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                mobileSelectedStage === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas ({leads.length})
            </button>
            {STAGES.map((s) => {
              const count = filteredLeads.filter((l) => l.stage === s.key).length;
              return (
                <button
                  key={s.key}
                  onClick={() => setMobileSelectedStage(s.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    mobileSelectedStage === s.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.shortLabel}</span>
                  <span className="opacity-70 text-[9px]">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 items-start">
            {STAGES.filter((s) => mobileSelectedStage === 'ALL' || mobileSelectedStage === s.key).map((stage, stageIndex) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
              const stageCommission = stageLeads.reduce((s, l) => {
                const arl = arls.find((a) => a.id === l.proposedArlId);
                const fin = calculateCompanyFinancials(l, arl);
                return s + fin.totalCommission;
              }, 0);
              const isOver = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                  className={`min-w-[290px] sm:min-w-[320px] w-full md:w-[320px] lg:w-1/5 rounded-2xl p-3 sm:p-3.5 flex flex-col space-y-2.5 min-h-[500px] transition-all duration-200 shrink-0 ${
                    isOver
                      ? 'bg-blue-100/70 dark:bg-blue-950/60 border-2 border-blue-500 ring-4 ring-blue-500/20 shadow-xl'
                      : 'bg-white/95 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="space-y-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{stage.icon}</span>
                        <span>{stage.label}</span>
                      </span>
                      <span className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatCOP(stageCommission)}
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 max-h-[68vh] pt-0.5">
                    {stageLeads.length === 0 ? (
                      <div
                        className={`text-center py-14 text-xs rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center gap-2 ${
                          isOver
                            ? 'border-blue-500 text-blue-500 bg-blue-500/10 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        <Hand size={20} className={isOver ? 'animate-pulse' : 'opacity-40'} />
                        <span>{isOver ? '¡Suelta la tarjeta aquí!' : 'Sin prospectos en esta etapa'}</span>
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const curArl = arls.find((a) => a.id === lead.currentArlId);
                        const propArl = arls.find((a) => a.id === lead.proposedArlId);
                        const fin = calculateCompanyFinancials(lead, propArl);
                        const isBeingDragged = draggedLeadId === lead.id;

                        return (
                          <div
                            key={lead.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 cursor-grab active:cursor-grabbing select-none shadow-sm group ${
                              isBeingDragged
                                ? 'opacity-40 scale-95 border-blue-500 bg-blue-500/10'
                                : 'bg-slate-50 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800/90 hover:border-blue-500/60 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-slate-400 group-hover:text-blue-500 transition-colors" title="Arrastrar con la mano">
                                  <GripVertical size={14} />
                                </span>
                                <div>
                                  <span className="text-[9px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                                    {lead.source} • {lead.city}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors leading-snug">
                                    {lead.name}
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {stageIndex > 0 && (
                                  <button
                                    onClick={() => handleStepStage(lead.id, 'PREV')}
                                    className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-600 dark:text-slate-400 transition-colors"
                                    title="Devolver etapa"
                                  >
                                    <ChevronLeft size={12} />
                                  </button>
                                )}
                                {stageIndex < STAGES.length - 1 && (
                                  <button
                                    onClick={() => handleStepStage(lead.id, 'NEXT')}
                                    className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-400 transition-colors"
                                    title="Avanzar etapa"
                                  >
                                    <ChevronRight size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar Lead"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Centros de Trabajo Badge / Quick View */}
                            {fin.isMultiRisk ? (
                              <button
                                onClick={() =>
                                  setViewingWorkCentersTarget({
                                    name: lead.name,
                                    nit: lead.nit || 'En prospección',
                                    arlName: propArl?.name || lead.proposedArlId,
                                    financials: fin,
                                  })
                                }
                                className="w-full p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 text-[10px] text-left hover:border-indigo-400 transition-all flex items-center justify-between"
                              >
                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
                                  <Layers size={13} />
                                  <span>{fin.workCentersCount} Centros de Trabajo (Multiriesgo)</span>
                                </div>
                                <span className="font-mono text-[9px] bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.2 rounded">
                                  Tasa: {fin.effectiveArlRateFormatted}
                                </span>
                              </button>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                <span className="font-medium">Riesgo Único:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {RISK_RATES[lead.riskClass]?.percentageText} ({lead.riskClass})
                                </span>
                              </div>
                            )}

                            <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-[11px] space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400">ARL Actual:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <span>{curArl?.logo || '🛡️'}</span> {curArl?.shortName || lead.currentArlId}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">ARL Propuesta:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                                  <span>{propArl?.logo || '🛡️'}</span> {propArl?.shortName || lead.proposedArlId}
                                </span>
                              </div>
                            </div>

                            <div className="text-[10px] sm:text-[11px] space-y-1 bg-white/60 dark:bg-slate-900/60 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
                              <div className="truncate">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">Rep. Legal: </span>
                                <span className="text-slate-800 dark:text-slate-200">{lead.legalRepName}</span>
                              </div>
                              <div className="truncate text-slate-500 dark:text-slate-400 font-mono text-[9px] sm:text-[10px]">
                                {lead.legalRepPhone} {lead.legalRepEmail && `• ${lead.legalRepEmail}`}
                              </div>

                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 truncate">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">SST: </span>
                                <span className="text-slate-800 dark:text-slate-200">{lead.sstResponsibleName}</span>
                              </div>
                            </div>

                            <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-[10px] text-blue-900 dark:text-blue-200">
                              <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                                <Calendar size={11} /> Seguimiento ({lead.nextFollowUpDate}):
                              </div>
                              <p className="line-clamp-2 leading-tight">{lead.nextFollowUpAction}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
                              <div>
                                <span className="text-[9px] text-slate-400 block font-sans">
                                  Comisión Est. ({fin.isMultiRisk ? `${fin.effectiveCommissionRate.toFixed(1)}% Ponderado` : `${fin.effectiveCommissionRate}%`})
                                </span>
                                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                  {formatCOP(fin.totalCommission)}/m
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditLeadModal(lead)}
                                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                                  title="Editar Prospecto & Condiciones Económicas"
                                >
                                  <Edit2 size={13} />
                                </button>

                                <button
                                  onClick={() => openLetterGenerator({
                                    name: lead.name,
                                    nit: lead.nit,
                                    city: lead.city,
                                    legalRepName: lead.legalRepName,
                                    arlId: lead.proposedArlId,
                                    conceptType: lead.conceptType
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                                  title="Generar Carta de Nombramiento / Traslado"
                                >
                                  <FileText size={13} />
                                </button>

                                {/* Interactive WhatsApp Cadence Trigger */}
                                <button
                                  onClick={() => openWhatsAppModalForLead(lead)}
                                  className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all shadow-sm flex items-center gap-1"
                                  title="Abrir Secuencia Paso a Paso de WhatsApp"
                                >
                                  <MessageSquare size={13} />
                                  <span className="text-[10px] font-bold hidden sm:inline">WhatsApp</span>
                                </button>

                                {lead.stage !== 'GANADA_AFILIADA' ? (
                                  <button
                                    onClick={() => handleConvertLeadToClient(lead)}
                                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow-sm transition-all flex items-center gap-1"
                                    title="Convertir a Cliente Activo"
                                  >
                                    <span>🏆</span> <span className="hidden sm:inline">Afiliar</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStepStage(lead.id, 'PREV')}
                                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white font-bold text-[10px] transition-all flex items-center gap-1"
                                    title="Devolver a Carta en Trámite"
                                  >
                                    <Undo2 size={11} /> Reabrir
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EMPRESAS ACTIVAS VIEW */}
      {activeTab === 'CLIENTES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredClients.map((client) => {
            const arl = arls.find((a) => a.id === client.primaryArlId);
            const fin = calculateCompanyFinancials(client, arl);

            return (
              <div
                key={client.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group shadow-sm min-w-0"
              >
                <div>
                  {/* Card Header & Fast Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                        NIT: {client.nit}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors leading-snug break-words">
                        {client.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {client.economicActivity} {client.ciiuCode ? `(CIIU ${client.ciiuCode})` : ''}
                      </p>
                    </div>

                    {/* Botonera Superior de Acciones Rápidas */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botón Popup Retorno Empresa */}
                      <button
                        type="button"
                        onClick={() => openRetornoModal(client)}
                        className="p-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm"
                        title={`Retorno a Empresa: ${client.returnPercentage ?? 25}% ($${formatCOP(fin.totalCommission * ((client.returnPercentage ?? 25) / 100))}/mes bolsa SST) - Clic para abrir popup`}
                      >
                        <Percent size={13} />
                      </button>

                      {/* Botón Popup Autoevaluación 0312 */}
                      <button
                        type="button"
                        onClick={() => openDirect0312Modal(client)}
                        className={`p-1.5 rounded-full transition-all border shadow-sm ${
                          client.standardsScore !== undefined
                            ? client.standardsScore >= 86
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white'
                              : client.standardsScore >= 60
                              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-600 hover:text-white'
                              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 hover:text-slate-800'
                        }`}
                        title={
                          client.standardsScore !== undefined
                            ? `Calificación Res. 0312: ${client.standardsScore}% (${client.standardsRating || 'Registrado'}) - Clic para abrir autoevaluación`
                            : 'Autoevaluación de Estándares Mínimos Res. 0312 - Clic para calificar'
                        }
                      >
                        <ClipboardList size={13} />
                      </button>

                      {/* Botón Reabrir en Pipeline */}
                      <button
                        type="button"
                        onClick={() => {
                          setReopenClient(client);
                          setShowReopenModal(true);
                        }}
                        className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 text-slate-500 dark:text-slate-400 hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Devolver / Reabrir en Pipeline de Prospección"
                      >
                        <Undo2 size={13} />
                      </button>

                      {/* Botón Generar Carta */}
                      <button
                        type="button"
                        onClick={() => openLetterGenerator({
                          name: client.name,
                          nit: client.nit,
                          city: client.city || 'Bogotá',
                          legalRepName: client.legalRepName || '',
                          arlId: client.primaryArlId,
                          conceptType: client.conceptType
                        })}
                        className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 text-slate-500 dark:text-slate-400 hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Generar Carta Oficial de Nombramiento"
                      >
                        <FileText size={13} />
                      </button>

                      {/* Botón Editar Empresa */}
                      <button
                        type="button"
                        onClick={() => openEditClientModal(client)}
                        className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 text-slate-500 dark:text-slate-400 hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Editar Empresa & Centros de Trabajo"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Botón Eliminar Empresa */}
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 text-slate-500 dark:text-slate-400 hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Eliminar Empresa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Clean Tags Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300 shrink-0">
                      <span>{arl?.logo || '🛡️'}</span>
                      <span>{arl?.shortName || client.primaryArlId}</span>
                    </span>

                    {fin.isMultiRisk ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1 shrink-0">
                        <Layers size={11} /> {fin.workCentersCount} Centros ({fin.effectiveArlRateFormatted})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-300 shrink-0">
                        {RISK_RATES[client.riskClass]?.percentageText} ({client.riskClass})
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-medium shrink-0">
                      {client.conceptType === 'CAMBIO_INTERMEDIARIO' ? 'Cambio de Intermediario' : client.conceptType === 'EMPRESA_NUEVA' ? 'Empresa Nueva' : 'Nombramiento'}
                    </span>

                    {/* Compact Interactive Pill for Retorno */}
                    <button
                      type="button"
                      onClick={() => openRetornoModal(client)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shrink-0"
                      title="Clic para ver y ajustar porcentaje de retorno a la empresa"
                    >
                      <Percent size={10} /> Retorno: {client.returnPercentage ?? 25}%
                    </button>

                    {/* Compact Interactive Pill for 0312 */}
                    <button
                      type="button"
                      onClick={() => openDirect0312Modal(client)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors shrink-0 ${
                        client.standardsScore !== undefined
                          ? client.standardsScore >= 86
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                            : client.standardsScore >= 60
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Clic para ver o actualizar autoevaluación Res. 0312"
                    >
                      <Award size={10} /> {client.standardsScore !== undefined ? `${client.standardsScore}% Res. 0312` : '0312 Pendiente'}
                    </button>
                  </div>
                </div>

                {/* Multirisk Work Center Quick View Button */}
                {fin.isMultiRisk && (
                  <button
                    onClick={() =>
                      setViewingWorkCentersTarget({
                        name: client.name,
                        nit: client.nit,
                        arlName: arl?.name || client.primaryArlId,
                        financials: fin,
                      })
                    }
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-400 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] min-w-0">
                      <Layers size={14} className="shrink-0" />
                      <span className="truncate">Ver Desglose de {fin.workCentersCount} Centros de Trabajo</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">Detalle ➔</span>
                  </button>
                )}

                {/* Financial Summary */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">Nómina Total (IBC):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                      {formatCOP(fin.totalIbc)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">Aporte ARL Ponderado:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold shrink-0">
                      {formatCOP(fin.totalArlContribution)}
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline gap-2">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                      Comisión Agencia ({fin.effectiveCommissionRate.toFixed(1)}%):
                    </span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      {formatCOP(fin.totalCommission)}/m
                    </span>
                  </div>
                </div>

                {/* Direct Cross-Module Action Bar */}
                <div className="p-2.5 rounded-2xl bg-blue-50/60 dark:bg-slate-950/80 border border-blue-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Gestionar Empresa en Módulos:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    <Link
                      href={`/comisiones?cliente=${encodeURIComponent(client.id)}`}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-800 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-0"
                      title="Liquidar comisión PILA para esta empresa"
                    >
                      <Calculator size={13} className="text-blue-500 group-hover:text-white shrink-0" />
                      <span className="truncate w-full block">Comisión</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => openDirect0312Modal(client)}
                      className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-500 hover:text-white border border-amber-200 dark:border-amber-800 text-center text-[10px] font-bold text-amber-800 dark:text-amber-300 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-0 group"
                      title="Evaluar o calificar Estándares Mínimos Res. 0312 de la empresa"
                    >
                      <Award size={13} className="text-amber-600 group-hover:text-white shrink-0" />
                      <span className="truncate w-full block">0312 Directo</span>
                    </button>

                    <Link
                      href={`/campo-sst?cliente=${encodeURIComponent(client.id)}`}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-600 hover:text-white border border-slate-200 dark:border-slate-800 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-0"
                      title="Programar o consultar visitas técnicas en campo"
                    >
                      <HardHat size={13} className="text-emerald-500 group-hover:text-white shrink-0" />
                      <span className="truncate w-full block">Visita SST</span>
                    </Link>

                    <Link
                      href={`/medico?cliente=${encodeURIComponent(client.id)}`}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-600 hover:text-white border border-slate-200 dark:border-slate-800 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-0"
                      title="Registrar ausentismo, FURAT o PVE"
                    >
                      <Stethoscope size={13} className="text-rose-500 group-hover:text-white shrink-0" />
                      <span className="truncate w-full block">Médico</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => openWhatsAppModalForClient(client)}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-600 hover:text-white border border-slate-200 dark:border-slate-800 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-0"
                      title="Enviar WhatsApp de seguimiento o servicio"
                    >
                      <MessageSquare size={13} className="text-emerald-500 group-hover:text-white shrink-0" />
                      <span className="truncate w-full block">WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Stakeholders Contact Snippet */}
                <div className="space-y-2 pt-0.5">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <UserCheck size={12} className="shrink-0" /> Representante:
                      </span>
                      <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 shrink-0">{client.legalRepPhone}</span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{client.legalRepName || 'No registrado'}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <HardHat size={12} className="shrink-0" /> Responsable SST:
                      </span>
                      <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 shrink-0">{client.sstResponsiblePhone}</span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{client.sstResponsibleName || 'No registrado'}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-slate-400" />
                    <span>{fin.totalEmployees} trabajadores</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <MapPin size={11} className="text-slate-400" />
                    <span>{client.city}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: VER DESGLOSE DE CENTROS DE TRABAJO MULTIRIESGO */}
      {viewingWorkCentersTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setViewingWorkCentersTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Layers size={16} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  ESTRUCTURA DE CENTROS DE TRABAJO & TARIFAS ARL
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                {viewingWorkCentersTarget.name}
              </h3>
              <p className="text-xs text-slate-500">
                NIT: <strong className="font-mono text-slate-700 dark:text-slate-300">{viewingWorkCentersTarget.nit}</strong> • ARL: <strong className="text-slate-700 dark:text-slate-300">{viewingWorkCentersTarget.arlName}</strong>
              </p>
            </div>

            {/* Breakdown Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Centro de Trabajo</th>
                    <th className="p-3 text-center">Clase Riesgo</th>
                    <th className="p-3 text-right">Trabajadores</th>
                    <th className="p-3 text-right">IBC Mensual</th>
                    <th className="p-3 text-right">Aporte ARL</th>
                    <th className="p-3 text-right">Comisión Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {viewingWorkCentersTarget.financials.breakdown.map((wc) => (
                    <tr key={wc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {wc.name}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          {wc.percentageText} ({wc.riskClass.replace('CLASE_', '')})
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {wc.employeeCount}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCOP(wc.monthlyIbc)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCOP(wc.arlContribution)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCOP(wc.commissionAmount)}
                        <span className="text-[9px] block text-slate-400 font-normal">({wc.commissionPercentage}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  <tr>
                    <td className="p-3 text-slate-900 dark:text-white font-extrabold">Totales Ponderados</td>
                    <td className="p-3 text-center font-mono text-indigo-600 dark:text-indigo-400">
                      {viewingWorkCentersTarget.financials.effectiveArlRateFormatted}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {viewingWorkCentersTarget.financials.totalEmployees}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatCOP(viewingWorkCentersTarget.financials.totalIbc)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900 dark:text-white">
                      {formatCOP(viewingWorkCentersTarget.financials.totalArlContribution)}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCOP(viewingWorkCentersTarget.financials.totalCommission)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingWorkCentersTarget(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTERACTIVO: SECUENCIA PASO A PASO WHATSAPP */}
      {showWhatsAppModal && whatsAppTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare size={16} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  CADENCIA COMERCIAL WHATSAPP
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                Enviar Mensaje a: {whatsAppTarget.companyName}
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona el paso de la secuencia para generar automáticamente el mensaje personalizado para WhatsApp.
              </p>
            </div>

            {/* 1. Recipient Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block">
                1. Selecciona el Destinatario del Mensaje:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRecipientChange('LEGAL_REP')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedRecipientType === 'LEGAL_REP'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <UserCheck size={13} className="text-blue-500" />
                      <span>Representante Legal</span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate mt-0.5">
                      {whatsAppTarget.legalRepName || 'No registrado'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {whatsAppTarget.legalRepPhone || 'Sin cel'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecipientChange('SST_RESPONSIBLE')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedRecipientType === 'SST_RESPONSIBLE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <HardHat size={13} className="text-emerald-500" />
                      <span>Responsable SG-SST</span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate mt-0.5">
                      {whatsAppTarget.sstName || 'No registrado'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {whatsAppTarget.sstPhone || 'Sin cel'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Step-by-Step Cadence Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block">
                2. Paso a Paso de la Cadencia Comercial:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { step: 1, label: 'Paso 1', title: 'Acercamiento', icon: '📥' },
                  { step: 2, label: 'Paso 2', title: 'Diagnóstico', icon: '🔍' },
                  { step: 3, label: 'Paso 3', title: 'Propuesta', icon: '📑' },
                  { step: 4, label: 'Paso 4', title: 'Carta Firma', icon: '✍️' },
                  { step: 5, label: 'Paso 5', title: 'Bienvenida', icon: '🏆' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleStepChange(s.step)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      whatsAppStep === s.step
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm block">{s.icon}</span>
                    <span className="text-[10px] font-extrabold block mt-0.5">{s.label}</span>
                    <span className="text-[9px] opacity-80 block truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Live Message Preview & Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block">
                  3. Mensaje Listo para Enviar (Puedes editarlo antes de abrir WhatsApp):
                </label>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Copy size={12} /> {copiedSuccess ? '¡Copiado!' : 'Copiar Texto'}
                </button>
              </div>

              {/* Chat Bubble Style Editor */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <textarea
                  rows={6}
                  value={customWhatsAppMessage}
                  onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/90 border border-emerald-300/50 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    Destino: <strong className="text-slate-800 dark:text-slate-200 font-mono">{cleanPhoneNumber(selectedRecipientType === 'LEGAL_REP' ? whatsAppTarget.legalRepPhone : whatsAppTarget.sstPhone) || 'Sin número'}</strong>
                  </span>
                  <span>Directo a la App de WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleSendDirectToWhatsApp}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Send size={14} /> <span>Abrir WhatsApp y Enviar al Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REABRIR CLIENTE EN PIPELINE */}
      {showReopenModal && reopenClient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowReopenModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                REABRIR PROCESO COMERCIAL
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Devolver a Pipeline: {reopenClient.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona a qué etapa del embudo deseas enviar esta empresa para renegociación, carta de nombramiento o traslado.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Etapa de Destino en el Embudo:
              </label>
              <select
                value={reopenTargetStage}
                onChange={(e) => setReopenTargetStage(e.target.value as LeadStage)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-semibold"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReopenToPipeline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
              >
                Confirmar y Enviar al Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERADOR DE CARTA OFICIAL DE NOMBRAMIENTO */}
      {showLetterModal && letterData && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 printable-modal-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto printable-modal-box">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 no-print">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  FORMATO OFICIAL DE INTERMEDIACIÓN
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Carta de Nombramiento de Intermediario ARL
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeLetterhead(!includeLetterhead)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    includeLetterhead
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                  title="Alternar inclusión del membrete/encabezado institucional de PRAXIS en la carta"
                >
                  <span>{includeLetterhead ? '✓ Con Membrete' : 'Sin Membrete'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => printDocumentById('carta-nombramiento-sheet', `Carta Nombramiento - ${letterData.companyName}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Printer size={13} /> <span className="hidden sm:inline">Imprimir / Guardar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLetterModal(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              id="carta-nombramiento-sheet"
              className="p-4 sm:p-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-serif leading-relaxed text-xs space-y-3 shadow-inner official-document-sheet print:p-0 print:border-none print:shadow-none print:bg-white print:text-slate-900"
            >
              {/* Membrete Oficial para Impresión y Pantalla (Opcional) */}
              {includeLetterhead && (
                <div className="flex items-center justify-between border-b border-slate-900 dark:border-slate-600 print:border-slate-900 pb-2 mb-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                      alt={agencyProfile?.shortName || 'PRAXIS'}
                      className="h-10 w-auto object-contain max-h-12"
                    />
                    <div>
                      <h2 className="font-sans font-black text-xs sm:text-sm text-slate-900 dark:text-white print:text-slate-900 tracking-tight">
                        {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA.'}
                      </h2>
                      <p className="font-sans text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-medium">
                        NIT: {agencyProfile?.nit || '901.884.200-1'} • Registro RUI MinTrabajo: {agencyProfile?.ruiNumber || 'RUI-MINTRABAJO-2024-8849'}
                      </p>
                      <p className="font-sans text-[9px] text-slate-500 font-mono">
                        {agencyProfile?.tagline || 'Intermediación Técnica & Asesoría Integral en el Sistema General de Riesgos Laborales (SGRL)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-sans text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-700 shrink-0">
                    <span className="font-bold text-blue-700 dark:text-blue-400 print:text-blue-800 block text-xs">
                      FORMATO OFICIAL
                    </span>
                    <span>Decreto 1072 de 2015</span>
                  </div>
                </div>
              )}

              <div className="text-right text-[11px] font-sans text-slate-500 dark:text-slate-400 print:text-slate-600">
                {letterData.city}, {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <div className="space-y-0.5 font-sans text-[11px]">
                <p className="font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">Señores:</p>
                <p className="font-extrabold text-blue-700 dark:text-blue-400 print:text-blue-800 text-xs uppercase">{letterData.targetArl}</p>
                <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">Dirección Comercial y de Operaciones</p>
                <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">{letterData.city}, Colombia</p>
              </div>

              <div className="pt-1 font-sans font-bold text-xs border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-1 text-slate-900 dark:text-white print:text-slate-900">
                Asunto: Designación y Nombramiento de Intermediario en Seguros de Riesgos Laborales (SGRL)
              </div>

              <p>
                Respetados señores:
              </p>

              <p>
                Por medio de la presente, la empresa <strong>{letterData.companyName}</strong>, identificada con NIT <strong>{letterData.nit}</strong>, en ejercicio de la autonomía que confiere el Decreto 1072 de 2015 y la normatividad vigente del Sistema General de Riesgos Laborales (SGRL), se permite informar que ha designado formalmente a la agencia:
              </p>

              <div className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 print:border-slate-300 font-sans text-xs space-y-0.5 text-center font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                  alt={agencyProfile?.shortName || 'PRAXIS'}
                  className="h-8 w-auto object-contain mx-auto mb-1 max-h-10"
                />
                <p className="text-blue-700 dark:text-blue-400 print:text-blue-800 text-xs sm:text-sm font-black">
                  {agencyProfile?.name || 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA.'}
                </p>
                <p className="text-[10.5px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                  {agencyProfile?.tagline || 'Intermediación Técnica, Jurídica y Financiera en Riesgos Laborales (SGRL)'}
                </p>
                <p className="text-[9.5px] text-slate-500 font-mono">
                  Registro Único de Intermediarios (RUI) MinTrabajo {agencyProfile?.ruiNumber ? `: ${agencyProfile.ruiNumber}` : 'Vigente'}
                </p>
              </div>

              <p>
                El intermediario designado queda plenamente facultado para prestar los servicios de asesoría técnica en el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), acompañamiento médico laboral, revisión de siniestralidad, análisis de PILA y gestión comercial ante su entidad aseguradora para todos sus centros de trabajo.
              </p>

              <p>
                Agradecemos proceder con la respectiva asignación de la clave de intermediación en su sistema operativo y liquidar las comisiones correspondientes con cargo a sus <strong>gastos de administración</strong>, conforme a lo establecido en la <strong>Sentencia C-049 de 2022</strong> de la Corte Constitucional y el Art. 476 numeral 3 del Estatuto Tributario (Exento de IVA).
              </p>

              <div className="pt-4 sm:pt-6 space-y-6 sm:space-y-8 page-break-inside-avoid">
                <div>
                  <p>Atentamente,</p>
                </div>

                <div className="space-y-0.5 border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 w-64 sm:w-72 pt-1.5 font-sans text-xs">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900">{letterData.legalRep}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">Representante Legal</p>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 print:text-slate-800 font-bold">{letterData.companyName}</p>
                  <p className="text-[9.5px] font-mono text-slate-500">NIT: {letterData.nit}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => setShowLetterModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => printDocumentById('carta-nombramiento-sheet', `Carta Nombramiento - ${letterData.companyName}`)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO LEAD CON SOPORTE MULTIRIESGO */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                PROSPECCIÓN & PIPELINE COMERCIAL
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {editingLead ? 'Editar Prospecto de Empresa' : 'Nuevo Prospecto de Empresa (Lead)'}
              </h3>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-500" /> Datos de la Empresa Prospectada
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Razón Social</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre de la empresa"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">NIT (Opcional)</label>
                    <input
                      type="text"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="Ej. 901.000.000-1"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">ARL Actual</label>
                    <select
                      value={currentArlId}
                      onChange={(e) => setCurrentArlId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      {arls.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">ARL Propuesta</label>
                    <select
                      value={proposedArlId}
                      onChange={(e) => setProposedArlId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      {arls.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Ciudad Principal</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ciudad"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>
                </div>

                {/* Multi-Risk Work Center Toggle */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        ¿Maneja múltiples centros de trabajo con diferentes riesgos (I a V)?
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Permite cotizar sedes administrativas (Clase I), plantas (Clase III) y obras (Clase V).
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMultiRiskMode(!isMultiRiskMode)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isMultiRiskMode
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isMultiRiskMode ? '✓ Multiriesgo Activado' : 'Sede Única'}
                  </button>
                </div>

                {/* Multirisk Work Center Dynamic Table */}
                {isMultiRiskMode ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                        Centros de Trabajo Registrados ({formWorkCenters.length}):
                      </span>
                      <button
                        type="button"
                        onClick={handleAddWorkCenter}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm"
                      >
                        <Plus size={12} /> Agregar Centro de Trabajo
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formWorkCenters.map((wc, idx) => (
                        <div
                          key={wc.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <div className="sm:col-span-4">
                            <label className="text-[10px] text-slate-500 block">Nombre del Centro / Sede</label>
                            <input
                              type="text"
                              value={wc.name}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'name', e.target.value)}
                              placeholder={`Ej. Planta de Producción ${idx + 1}`}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[10px] text-slate-500 block">Clase de Riesgo</label>
                            <select
                              value={wc.riskClass}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'riskClass', e.target.value as RiskClass)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                            >
                              {Object.keys(RISK_RATES).map((r) => (
                                <option key={r} value={r}>
                                  {RISK_RATES[r as RiskClass].label} ({RISK_RATES[r as RiskClass].percentageText})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block">Trabajadores</label>
                            <input
                              type="number"
                              value={wc.employeeCount}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'employeeCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block">Nómina IBC ($)</label>
                            <input
                              type="number"
                              value={wc.monthlyIbc}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'monthlyIbc', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkCenter(wc.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                              title="Eliminar este centro"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Calculated Totals Banner */}
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">Consolidado Multiriesgo:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formCalculatedTotals.totalEmployees} Trabajadores • Nómina: {formatCOP(formCalculatedTotals.totalIbc)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">
                          Tasa Ponderada: <strong className="font-mono">{formCalculatedTotals.effectiveArlRateFormatted}</strong>
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          Comisión: {formatCOP(formCalculatedTotals.totalCommission)}/m
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Clase de Riesgo Principal</label>
                      <select
                        value={riskClass}
                        onChange={(e) => setRiskClass(e.target.value as RiskClass)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      >
                        {Object.keys(RISK_RATES).map((rk) => (
                          <option key={rk} value={rk}>
                            {RISK_RATES[rk as RiskClass].label} ({RISK_RATES[rk as RiskClass].percentageText})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nómina Mensual (IBC COP)</label>
                      <input
                        type="number"
                        value={monthlyIbc}
                        onChange={(e) => setMonthlyIbc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">N° Trabajadores</label>
                      <input
                        type="number"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Condiciones Económicas y Retorno SST */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 border-b border-amber-500/20 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Percent size={13} /> Condiciones Económicas & Bolsa de Retorno SST
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">
                    Propuesta al prospecto
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      % Retorno SST Acordado (Bolsa de Acompañamiento)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[10, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setReturnPercentage(pct)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            returnPercentage === pct
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={returnPercentage}
                        onChange={(e) => setReturnPercentage(parseInt(e.target.value, 10) || 0)}
                        className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-200 font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Comisión Pactada Override (% Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={customOverride}
                      onChange={(e) => setCustomOverride(e.target.value)}
                      placeholder="Según Matriz ARL por defecto"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Stakeholders Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-blue-200 dark:border-blue-500/20 space-y-2">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <UserCheck size={12} /> Representante Legal
                  </h4>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 text-[10px] block">Nombre Completo</label>
                    <input
                      type="text"
                      value={legalRepName}
                      onChange={(e) => setLegalRepName(e.target.value)}
                      placeholder="Nombre representante"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 text-[10px] block">Celular / WhatsApp</label>
                    <input
                      type="text"
                      value={legalRepPhone}
                      onChange={(e) => setLegalRepPhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-emerald-200 dark:border-emerald-500/20 space-y-2">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <HardHat size={12} /> Responsable SG-SST
                  </h4>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 text-[10px] block">Nombre Completo</label>
                    <input
                      type="text"
                      value={sstResponsibleName}
                      onChange={(e) => setSstResponsibleName(e.target.value)}
                      placeholder="Nombre encargado SST"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 text-[10px] block">Celular / Teléfono</label>
                    <input
                      type="text"
                      value={sstResponsiblePhone}
                      onChange={(e) => setSstResponsiblePhone(e.target.value)}
                      placeholder="+57 310 000 0000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Next Follow-up Plan */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Calendar size={13} /> Plan de Seguimiento Comercial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Próxima Fecha de Contacto</label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Etapa Inicial</label>
                    <select
                      value={leadStage}
                      onChange={(e) => setLeadStage(e.target.value as LeadStage)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.icon} {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Acción a Realizar</label>
                  <textarea
                    value={nextFollowUpAction}
                    onChange={(e) => setNextFollowUpAction(e.target.value)}
                    rows={2}
                    placeholder="Ej. Enviar propuesta económica por WhatsApp y solicitar carta de nombramiento..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30"
                >
                  Guardar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA / EDITAR EMPRESA CLIENTE CON CENTROS DE TRABAJO */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowClientModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                FICHA DE CLIENTE & CENTROS DE TRABAJO MULTIRIESGO
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {editingClient ? 'Editar Empresa Cliente' : 'Nueva Empresa Cliente'}
              </h3>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Building2 size={14} className="text-blue-500" /> 1. Datos Generales de la Empresa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">NIT de la Empresa</label>
                    <input
                      type="text"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="Ej. 900.123.456-7"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Razón Social</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre legal completo"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Actividad Económica Principal</label>
                    <input
                      type="text"
                      value={economicActivity}
                      onChange={(e) => setEconomicActivity(e.target.value)}
                      placeholder="Ej. Construcción de obras civiles y administración"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Código CIIU</label>
                    <input
                      type="text"
                      value={ciiuCode}
                      onChange={(e) => setCiiuCode(e.target.value)}
                      placeholder="Ej. 4111"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">ARL Asignada</label>
                    <select
                      value={primaryArlId}
                      onChange={(e) => setPrimaryArlId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      {arls.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Concepto de Vinculación</label>
                    <select
                      value={conceptType}
                      onChange={(e) => setConceptType(e.target.value as CommissionConcept)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      <option value="EMPRESA_NUEVA">🆕 Empresa Nueva</option>
                      <option value="CAMBIO_INTERMEDIARIO">🔄 Cambio de Intermediario</option>
                      <option value="NOMBRAMIENTO">📜 Nombramiento de Intermediario</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">% Comisión Fija (Opcional)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Vacío = matriz ARL"
                      value={customOverride}
                      onChange={(e) => setCustomOverride(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Porcentaje de Retorno / Acompañamiento a la Empresa */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 text-xs">
                        <Percent size={14} className="text-indigo-600 dark:text-indigo-400" />
                        Porcentaje de Retorno para la Empresa (Acompañamiento SST)
                      </label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Dictamina el % que se entregará / asignará para acompañamiento y reinversión (antes de retefuente 10% ARL).
                      </span>
                    </div>
                    <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">
                      {returnPercentage}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={returnPercentage}
                    onChange={(e) => setReturnPercentage(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {[0, 15, 20, 25, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setReturnPercentage(pct)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                            returnPercentage === pct
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    {/* Live Financial Breakdown */}
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 text-[10px] font-mono space-y-0.5 text-right w-full sm:w-auto">
                      <div className="flex justify-between sm:justify-end gap-3 text-slate-600 dark:text-slate-300">
                        <span>Comisión Bruta Est.:</span>
                        <strong>{formatCOP(formCalculatedTotals.totalCommission)}</strong>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-3 text-rose-600 dark:text-rose-400">
                        <span>Retefuente 10% ARL:</span>
                        <strong>-{formatCOP(formCalculatedTotals.totalCommission * 0.10)}</strong>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-3 text-indigo-600 dark:text-indigo-400 font-bold">
                        <span>Retorno a Empresa ({returnPercentage}%):</span>
                        <strong>{formatCOP(formCalculatedTotals.totalCommission * (returnPercentage / 100))}</strong>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-3 text-emerald-600 dark:text-emerald-400 font-bold border-t border-slate-200 dark:border-slate-800 pt-0.5">
                        <span>Margen Neto PRAXIS:</span>
                        <strong>{formatCOP((formCalculatedTotals.totalCommission * 0.90) - (formCalculatedTotals.totalCommission * (returnPercentage / 100)))}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multirisk Work Centers Switch */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Estructura por Centros de Trabajo (Multiriesgo I a V)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Cada centro de trabajo cotiza a su clase de riesgo respectiva (I, II, III, IV, V).
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMultiRiskMode(!isMultiRiskMode)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isMultiRiskMode
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isMultiRiskMode ? '✓ Multiriesgo Activado' : 'Sede Única'}
                  </button>
                </div>

                {/* Multirisk Table in Client Form */}
                {isMultiRiskMode ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                        Centros de Trabajo Registrados ({formWorkCenters.length}):
                      </span>
                      <button
                        type="button"
                        onClick={handleAddWorkCenter}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm"
                      >
                        <Plus size={12} /> Agregar Centro de Trabajo
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formWorkCenters.map((wc, idx) => (
                        <div
                          key={wc.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <div className="sm:col-span-4">
                            <label className="text-[10px] text-slate-500 block">Nombre del Centro / Sede</label>
                            <input
                              type="text"
                              value={wc.name}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'name', e.target.value)}
                              placeholder={`Ej. Sede Administrativa ${idx + 1}`}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[10px] text-slate-500 block">Clase de Riesgo</label>
                            <select
                              value={wc.riskClass}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'riskClass', e.target.value as RiskClass)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                            >
                              {Object.keys(RISK_RATES).map((r) => (
                                <option key={r} value={r}>
                                  {RISK_RATES[r as RiskClass].label} ({RISK_RATES[r as RiskClass].percentageText})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block">Trabajadores</label>
                            <input
                              type="number"
                              value={wc.employeeCount}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'employeeCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block">Nómina IBC ($)</label>
                            <input
                              type="number"
                              value={wc.monthlyIbc}
                              onChange={(e) => handleUpdateWorkCenter(wc.id, 'monthlyIbc', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkCenter(wc.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                              title="Eliminar este centro"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Calculated Totals Banner */}
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">Consolidado Multiriesgo:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formCalculatedTotals.totalEmployees} Trabajadores • Nómina: {formatCOP(formCalculatedTotals.totalIbc)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">
                          Tasa Ponderada: <strong className="font-mono">{formCalculatedTotals.effectiveArlRateFormatted}</strong>
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          Comisión: {formatCOP(formCalculatedTotals.totalCommission)}/m
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Clase de Riesgo Principal</label>
                      <select
                        value={riskClass}
                        onChange={(e) => setRiskClass(e.target.value as RiskClass)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      >
                        {Object.keys(RISK_RATES).map((rk) => (
                          <option key={rk} value={rk}>
                            {RISK_RATES[rk as RiskClass].label} ({RISK_RATES[rk as RiskClass].percentageText})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nómina Mensual / IBC (COP)</label>
                      <input
                        type="number"
                        value={monthlyIbc}
                        onChange={(e) => setMonthlyIbc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Total Trabajadores</label>
                      <input
                        type="number"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Ciudad Sede</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ciudad"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Dirección Principal</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Dirección completa"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Stakeholders Sections */}
              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-blue-200 dark:border-blue-500/20">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <UserCheck size={14} /> 2. Datos del Representante Legal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={legalRepName}
                      onChange={(e) => setLegalRepName(e.target.value)}
                      placeholder="Nombres y apellidos"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={legalRepEmail}
                      onChange={(e) => setLegalRepEmail(e.target.value)}
                      placeholder="representante@empresa.com"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Número de Celular</label>
                    <input
                      type="text"
                      value={legalRepPhone}
                      onChange={(e) => setLegalRepPhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-emerald-200 dark:border-emerald-500/20">
                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <HardHat size={14} /> 3. Datos del Responsable de Seguridad y Salud en el Trabajo (SG-SST)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={sstResponsibleName}
                      onChange={(e) => setSstResponsibleName(e.target.value)}
                      placeholder="Nombres y apellidos"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={sstResponsibleEmail}
                      onChange={(e) => setSstResponsibleEmail(e.target.value)}
                      placeholder="sst@empresa.com"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Número de Celular</label>
                    <input
                      type="text"
                      value={sstResponsiblePhone}
                      onChange={(e) => setSstResponsiblePhone(e.target.value)}
                      placeholder="+57 310 000 0000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Licencia SST (Opcional)</label>
                    <input
                      type="text"
                      value={sstResponsibleLicense}
                      onChange={(e) => setSstResponsibleLicense(e.target.value)}
                      placeholder="Ej. Res. 12402-2021"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT 0312 SG-SST EVALUATION MODAL */}
      {direct0312Client && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <Award size={12} /> EXPEDIENTE SG-SST DE LA EMPRESA
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Resolución 0312 de 2019
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  Autoevaluación de Estándares Mínimos: {direct0312Client.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  NIT: <span className="font-mono">{direct0312Client.nit}</span> • {direct0312Client.employeeCount || 10} trabajadores • {direct0312Client.riskClass} • ARL {direct0312Client.primaryArlId.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDirect0312Client(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Scope Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Alcance Aplicable por Tamaño y Clase de Riesgo:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Calculado según Art. 3, 9 y 16 de la Resolución 0312
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDirectScopeChange(7)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      directStandardsCount === 7 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="<= 10 trabajadores en Riesgo I, II, III"
                  >
                    7 Estándares
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectScopeChange(21)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      directStandardsCount === 21 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="11 a 50 trabajadores en Riesgo I, II, III"
                  >
                    21 Estándares
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectScopeChange(60)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      directStandardsCount === 60 ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="> 50 trabajadores o Riesgos IV y V"
                  >
                    60 Estándares
                  </button>
                </div>
              </div>

              {/* Live Score & Valoración MinTrabajo Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white space-y-3 shadow-md border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Calificación Autoevaluación ({directStandardsCount} Estándares)
                    </span>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="text-3xl font-black font-mono text-emerald-400">
                        {directCurrentScoreData.score}%
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${directCurrentScoreData.ratingColor}`}>
                        {directCurrentScoreData.ratingLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      ✓ Cumple: <strong>{directCurrentScoreData.cumpleCount}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                      ✗ No Cumple: <strong>{directCurrentScoreData.noCumpleCount}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700">
                      — No Aplica: <strong>{directCurrentScoreData.noAplicaCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-300 ${
                      directCurrentScoreData.score >= 86
                        ? 'bg-emerald-500'
                        : directCurrentScoreData.score >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, directCurrentScoreData.score)}%` }}
                  />
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300">
                  <span className="font-bold text-amber-300">Criterio Art. 28 Res. 0312: </span>
                  {directCurrentScoreData.score < 60
                    ? 'Realizar y enviar Plan de Mejoramiento a la ARL dentro de los 3 meses posteriores. Visita de la ARL requerida.'
                    : directCurrentScoreData.score <= 85
                    ? 'Enviar a la ARL Plan de Mejoramiento en un plazo máximo de 6 meses posteriores a la autoevaluación.'
                    : 'Mantener la calificación y evidencias a disposición del MinTrabajo e incluir en el Plan de Trabajo Anual.'}
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  {/* PHVA Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {(['TODOS', 'PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'] as const).map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setDirectModalCycleFilter(cycle)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          directModalCycleFilter === cycle
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {cycle === 'TODOS' ? 'Todos los Ciclos' : cycle}
                      </button>
                    ))}
                  </div>

                  {/* Bulk Mark Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleDirectMarkAllCumple}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold transition-all"
                    >
                      ✓ Todo Cumple
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectResetEvaluations}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-all"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={directModalSearch}
                    onChange={(e) => setDirectModalSearch(e.target.value)}
                    placeholder="Buscar estándar por código (ej. 1.1.1) o palabra clave..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {directFilteredStandards.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                    No se encontraron estándares con los filtros aplicados.
                  </div>
                ) : (
                  directFilteredStandards.map((item) => {
                    const weightVal = directStandardsCount === 7
                      ? (typeof item.weight7 === 'number' ? item.weight7 : 0)
                      : directStandardsCount === 21
                      ? (typeof item.weight21 === 'number' ? item.weight21 : 0)
                      : item.weight60;

                    const evalRecord = directEvaluations[item.id] || { status: 'NO_CUMPLE', observation: '' };

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          evalRecord.status === 'CUMPLE'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                            : evalRecord.status === 'NO_APLICA'
                            ? 'bg-slate-50/60 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.numeral}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                {item.cycle} • {item.category}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                Peso: {weightVal}%
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              <strong className="text-slate-600 dark:text-slate-300">Criterio / Verificación:</strong> {item.criterion}
                            </p>
                          </div>

                          {/* Status Selector Buttons */}
                          <div className="flex items-center gap-1 shrink-0 self-start">
                            <button
                              type="button"
                              onClick={() => handleDirectStatusChange(item.id, 'CUMPLE')}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                evalRecord.status === 'CUMPLE'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              ✓ Cumple
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectStatusChange(item.id, 'NO_CUMPLE')}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                evalRecord.status === 'NO_CUMPLE'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              ✗ No Cumple
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectStatusChange(item.id, 'NO_APLICA')}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                evalRecord.status === 'NO_APLICA'
                                  ? 'bg-slate-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              — No Aplica
                            </button>
                          </div>
                        </div>

                        {/* Observation Input */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                          <input
                            type="text"
                            value={evalRecord.observation || ''}
                            onChange={(e) => handleDirectObservationChange(item.id, e.target.value)}
                            placeholder="Observación técnica, evidencia documental o justificación..."
                            className="w-full text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0">
              <Link
                href={`/campo-sst?cliente=${encodeURIComponent(direct0312Client.id)}`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1.5"
              >
                <Calendar size={13} />
                <span>Programar o Vincular con Visita Técnica en Campo SST ➔</span>
              </Link>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDirect0312Client(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDirect0312}
                  disabled={directSaveSuccess}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                >
                  {directSaveSuccess ? (
                    <>
                      <Check size={14} />
                      <span>¡Guardado con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Guardar Calificación 0312 en Ficha</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP / MODAL DE RETORNO A LA EMPRESA & BOLSA SST */}
      {retornoClient && (() => {
        const arl = arls.find((a) => a.id === retornoClient.primaryArlId);
        const fin = calculateCompanyFinancials(retornoClient, arl);
        const grossCommission = fin.totalCommission;
        const retefuente = grossCommission * 0.10;
        const netAfterRetefuente = grossCommission * 0.90;
        const returnAmount = grossCommission * (retornoModalPercentage / 100);
        const agencyFinalAmount = netAfterRetefuente - returnAmount;
        const annualReturnAmount = returnAmount * 12;

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <Percent size={13} />
                    <span>Acuerdo de Retorno & Bolsa SST</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 leading-snug break-words">
                    {retornoClient.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    NIT: <span className="font-mono">{retornoClient.nit}</span> • {arl?.shortName || retornoClient.primaryArlId} • {retornoClient.riskClass}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetornoClient(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-medium text-slate-500 block">Nómina Total (IBC):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {formatCOP(fin.totalIbc)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block">
                    Comisión Bruta ARL ({fin.effectiveCommissionRate.toFixed(1)}%):
                  </span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm">
                    {formatCOP(grossCommission)}/mes
                  </span>
                </div>
              </div>

              {/* Retefuente info banner */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-[11px]">
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  Retención en la fuente 10% aplicada por la ARL:
                </span>
                <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                  - {formatCOP(retefuente)}/mes
                </span>
              </div>

              {/* Interactive Percentage Selector */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Porcentaje de Retorno a la Empresa:
                  </label>
                  <span className="text-lg font-mono font-black text-indigo-700 dark:text-indigo-300">
                    {retornoModalPercentage}%
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {[10, 15, 20, 25, 30, 35, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRetornoModalPercentage(pct)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        retornoModalPercentage === pct
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={retornoModalPercentage}
                  onChange={(e) => setRetornoModalPercentage(parseInt(e.target.value) || 0)}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Dynamic Impact Breakdown */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5 text-xs shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-300 font-bold flex items-center gap-1">
                    <span>🎁</span> Retorno Empresa (Bolsa SST Mensual):
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {formatCOP(returnAmount)}/mes
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                  <span>Proyección Anual Bolsa SST:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatCOP(annualReturnAmount)}/año
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] border-t border-slate-800 pt-2">
                  <span className="text-slate-300">Margen Neto para PRAXIS (post retefuente y retorno):</span>
                  <span className="font-mono font-black text-blue-400">
                    {formatCOP(agencyFinalAmount)}/mes
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setRetornoClient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveRetorno}
                  disabled={retornoSaveSuccess}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  {retornoSaveSuccess ? (
                    <>
                      <Check size={14} />
                      <span>¡Guardado!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Guardar Porcentaje ({retornoModalPercentage}%)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
