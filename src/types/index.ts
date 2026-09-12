export type RiskClass = 'CLASE_I' | 'CLASE_II' | 'CLASE_III' | 'CLASE_IV' | 'CLASE_V';

export type CommissionConcept = 
  | 'EMPRESA_NUEVA' 
  | 'NOMBRAMIENTO' 
  | 'CAMBIO_INTERMEDIARIO';

export type LeadStage = 
  | 'NUEVO_LEAD' 
  | 'DIAGNOSTICO_ARL' 
  | 'PROPUESTA_ENVIADA' 
  | 'CARTA_NOMBRAMIENTO' 
  | 'GANADA_AFILIADA' 
  | 'PERDIDA_DESCARTADA';

export interface RiskRateDefinition {
  class: RiskClass;
  label: string;
  nominalRate: number;
  percentageText: string;
  description: string;
}

export const RISK_RATES: Record<RiskClass, RiskRateDefinition> = {
  CLASE_I: { class: 'CLASE_I', label: 'Clase I (Mínimo)', nominalRate: 0.00522, percentageText: '0.522%', description: 'Oficinas, comercio, colegios, finanzas' },
  CLASE_II: { class: 'CLASE_II', label: 'Clase II (Bajo)', nominalRate: 0.01044, percentageText: '1.044%', description: 'Manufactura liviana, textiles, laboratorios' },
  CLASE_III: { class: 'CLASE_III', label: 'Clase III (Medio)', nominalRate: 0.02436, percentageText: '2.436%', description: 'Procesos químicos, alimentos, metalmecánica' },
  CLASE_IV: { class: 'CLASE_IV', label: 'Clase IV (Alto)', nominalRate: 0.04350, percentageText: '4.350%', description: 'Transporte de carga, fundición, aceites' },
  CLASE_V: { class: 'CLASE_V', label: 'Clase V (Máximo)', nominalRate: 0.06960, percentageText: '6.960%', description: 'Construcción, minería, explosivos, petróleos' },
};

export interface CommissionMatrix {
  EMPRESA_NUEVA: Record<RiskClass, number>;
  NOMBRAMIENTO: Record<RiskClass, number>;
  CAMBIO_INTERMEDIARIO: Record<RiskClass, number>;
}

export interface EconomicActivityCommission {
  id: string;
  riskClass: RiskClass;
  ciiuCode?: string;
  activityName: string;
  commissionRate: number; // Porcentaje de comisión pactado (ej. 9.5%)
  notes?: string;
}

export interface ARLCompany {
  id: string;
  name: string;
  shortName: string;
  code?: string;
  superintendenciaCode?: string;
  logo?: string;
  color?: string;
  colorTheme?: string;
  status: 'ACTIVA' | 'INACTIVA';
  phone?: string;
  supportPhone?: string;
  supportEmail?: string;
  website?: string;
  commissionRegime?: string;
  defaultCommissionMatrix: CommissionMatrix;
  economicActivityCommissions?: EconomicActivityCommission[];
  notes?: string;
}

export interface WorkCenter {
  id: string;
  name: string;
  ciiuCode?: string;
  riskClass: RiskClass;
  employeeCount: number;
  monthlyIbc: number;
  address?: string;
  city?: string;
}

export interface LeadProspect {
  id: string;
  name: string;
  nit: string;
  economicActivity: string;
  ciiuCode?: string;
  currentArlId: string;
  proposedArlId: string;
  riskClass: RiskClass;
  estimatedIbc: number;
  employeeCount: number;
  city: string;
  stage: LeadStage;
  source: 'WHATSAPP' | 'REFERIDO' | 'LLAMADA_FRIO' | 'WEB' | 'EVENTO_SST';
  conceptType: CommissionConcept;
  customCommissionOverride?: number;
  returnPercentage?: number;
  workCenters?: WorkCenter[];
  
  // Representante Legal
  legalRepName: string;
  legalRepEmail: string;
  legalRepPhone: string;

  // Responsable SST
  sstResponsibleName: string;
  sstResponsibleEmail: string;
  sstResponsiblePhone: string;

  nextFollowUpDate: string;
  nextFollowUpAction: string;
  estimatedMonthlyCommission: number;
  notes: string;
  createdAt: string;
}

export interface ClientCompany {
  id: string;
  nit: string;
  name: string;
  economicActivity: string;
  ciiuCode: string;
  primaryArlId: string;
  riskClass: RiskClass;
  monthlyIbc: number;
  employeeCount: number;
  address: string;
  city: string;
  conceptType: CommissionConcept;
  customCommissionOverride?: number;
  returnPercentage?: number; // Porcentaje de retorno / acompañamiento para la empresa (antes de retefuente 10%)
  workCenters?: WorkCenter[];
  status: 'ACTIVO' | 'EN_PROCESO' | 'MORA' | 'RETIRADO';
  
  // Representante Legal
  legalRepName: string;
  legalRepEmail: string;
  legalRepPhone: string;

  // Responsable de Seguridad y Salud en el Trabajo (SG-SST)
  sstResponsibleName: string;
  sstResponsibleEmail: string;
  sstResponsiblePhone: string;
  sstResponsibleLicense?: string;

  lastPilaDate?: string;
  createdAt: string;

  // Calificación del SG-SST (Resolución 0312 de 2019) ligada a la empresa
  standardsCount?: 7 | 21 | 60;
  standardsScore?: number; // Ej: 73 (%)
  standardsRating?: 'CRITICO' | 'MODERADAMENTE_ACEPTABLE' | 'ACEPTABLE';
  lastStandardsAuditDate?: string;
  standardsEvaluations?: Record<string, { status: 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA'; observation?: string }>;
}

export interface PilaRecord {
  id: string;
  clientId: string;
  clientName: string;
  month: string;
  year: number;
  ibcReported: number;
  riskClass: RiskClass;
  arlRate: number;
  arlContribution: number;
  commissionPercentage: number;
  expectedCommission: number;
  realPaidCommission: number;
  difference: number;
  status: 'CONCILIADO' | 'DIVERGENCIA' | 'MORA' | 'PENDIENTE';
  arlId: string;
  paymentDate?: string;
  notes?: string;

  // Trazabilidad Financiera: Retefuente 10% ARL & Retorno / Acompañamiento
  retefuenteRate?: number; // 0.10 por defecto
  retefuenteAmount?: number; // 10% retenido por la ARL
  netCommissionReceived?: number; // Comisión neta de la ARL (90%)
  clientReturnPercentage?: number; // % pactado con la empresa (ej: 30%)
  clientReturnAmount?: number; // Monto asignado para retorno / acompañamiento al cliente
  agencyNetMargin?: number; // Margen final neto para PRAXIS
}

export interface FieldVisit {
  id: string;
  clientId: string;
  clientName: string;
  engineerId: string;
  engineerName: string;
  visitDate: string;
  hoursSpent: number;
  visitType: 'AUDITORIA_0312' | 'ERGONOMICA' | 'HIGIENE' | 'CAPACITACION' | 'MATRIZ_PELIGROS' | 'INSPECCION_SEGURIDAD';
  checklistScore?: number;
  standardsCount?: 7 | 21 | 60;
  standardEvaluations?: Record<string, { status: 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA'; observation?: string }>;
  findings: string;
  actionPlan: string;
  observations?: string;
  status: 'PROGRAMADA' | 'PENDIENTE' | 'REALIZADA' | 'COMPLETADA' | 'BORRADOR_OFFLINE' | 'SINCRONIZADA' | 'EN_REVISION';
  clientSignature?: string;
  location?: string;

  // Valorización del Acompañamiento Técnico
  hasCost?: boolean; // false = Sin costo adicional (cubierto 100% por retorno / intermediación ARL)
  visitCost?: number; // Valor comercial o liquidado en COP (o 0 si no tiene valor)
  costNotes?: string; // Justificación (ej: "Cubierto 100% por bolsa de retorno ARL")
}

export interface MedicalRecord {
  id: string;
  clientId: string;
  clientName: string;
  incidentType: 'ACCIDENTE_TRABAJO' | 'INCIDENTE_LABORAL' | 'ENFERMEDAD_LABORAL' | 'AUSENTISMO_COMUN';
  employeeDocument: string;
  employeeName: string;
  employeeRole: string;
  diagnosisCie10: string;
  diagnosisDescription: string;
  daysLost: number;
  furatFurepCode?: string;
  pveProgram?: 'OSTEOMUSCULAR' | 'PSICOSOCIAL' | 'AUDITIVO' | 'CARDIOVASCULAR' | 'RESPIRATORIO' | 'NINGUNO';
  medicalNotes: string;
  confidentialFlag: boolean;
  date: string;
  createdByDoctor: string;
}

export type OccupationalExamType = 
  | 'INGRESO' 
  | 'PERIODICO' 
  | 'RETIRO' 
  | 'POST_INCAPACIDAD' 
  | 'CAMBIO_OCUPACION';

export type AptitudeStatus = 
  | 'APTO' 
  | 'APTO_CON_RESTRICCIONES' 
  | 'NO_APTO' 
  | 'APLAZADO';

export interface ExamCatalogItem {
  id: string;
  name: string;
  shortName: string;
  category: 'MEDICO_GENERAL' | 'AUDICION' | 'VISION' | 'PULMONAR' | 'CARDIOVASCULAR' | 'LABORATORIO' | 'ESPECIALIZADO';
  normativeBase: string; // Ej: 'Resolución 2346 de 2007', 'Resolución 1843 de 1991', 'Resolución 4272 de 2021'
  targetActivities: string[]; // Ej: ['Metalmecánica', 'Construcción', 'Alturas']
  estimatedCost: number; // Costo referencial en COP
  description: string;
}

export interface OccupationalExam {
  id: string;
  clientId: string;
  clientName: string;
  employeeDocument: string;
  employeeName: string;
  employeeRole: string;
  workCenter?: string;
  examType: OccupationalExamType;
  testsIncluded: string[]; // IDs de pruebas del catálogo
  totalCost: number; // Monto cubierto con la Bolsa de Reinversión (COP)
  coveredByReinvestment: boolean; // true = 100% cubierto por retorno ARL ($0 de bolsillo)
  aptitudeStatus: AptitudeStatus;
  restrictions?: string;
  recommendations?: string;
  specializedEmphasis?: string; // Ej: 'Trabajo Seguro en Alturas (Res. 4272/2021)'
  doctorName: string;
  doctorLicense: string;
  date: string;
  certificateCode: string;
  expiresAt?: string;
  clinicalNotes?: string;
}

export interface RUIIntermediaryProfile {
  registrationNumber: string;
  agencyName: string;
  nit: string;
  legalRepresentative: string;
  technicalDoctorName: string;
  technicalDoctorLicense: string;
  technicalEngineerName: string;
  technicalEngineerLicense: string;
  legalAdvisorName: string;
  legalAdvisorCard: string;
  insurancePolicyNumber: string;
  insurancePolicyCompany: string;
  policyExpiryDate: string;
  totalCertifiedHours: number;
}

export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  companyName: string;
  messageType: 'ALERTA_PILA' | 'RECORDATORIO_PILA' | 'RECORDATORIO_VISITA' | 'VISITA_SST' | 'ALERTA_MORA' | 'NOTIFICACION_ARL' | 'CHAT_IA';
  content: string;
  timestamp: string;
  status: 'ENVIADO' | 'ENTREGADO' | 'LEIDO' | 'FALLIDO';
  direction: 'OUTBOUND' | 'INBOUND';
}

export type UserRole = 'ADMIN' | 'ANALISTA_FINANCIERO' | 'INGENIERO_SST' | 'MEDICO_LABORAL' | 'ASESOR_COMERCIAL';

export interface UserProfile {
  id: string;
  name: string;
  roleTitle: string;
  roleType: UserRole;
  licenseSST?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface AgencyProfile {
  name: string;
  shortName: string;
  suffix: string;
  tagline: string;
  nit: string;
  ruiNumber: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
}
