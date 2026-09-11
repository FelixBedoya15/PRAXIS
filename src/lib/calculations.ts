import { ARLCompany, CommissionConcept, RiskClass, RISK_RATES, WorkCenter } from '@/types';

export interface WorkCenterFinancialSummary {
  id: string;
  name: string;
  riskClass: RiskClass;
  riskLabel: string;
  nominalRate: number;
  percentageText: string;
  employeeCount: number;
  monthlyIbc: number;
  arlContribution: number;
  commissionPercentage: number;
  commissionAmount: number;
  appliedActivityName?: string;
  appliedActivityCiiu?: string;
}

export interface CompanyFinancialTotals {
  isMultiRisk: boolean;
  workCentersCount: number;
  totalIbc: number;
  totalEmployees: number;
  totalArlContribution: number;
  effectiveArlRate: number;
  effectiveArlRateFormatted: string;
  totalCommission: number; // Comisión Bruta antes de retefuente ARL
  grossCommission: number; // Comisión Bruta antes de retefuente ARL (10%)
  retefuenteRate: number; // Tasa Retefuente (10% = 0.10)
  retefuenteAmount: number; // Valor Retefuente descontado por la ARL
  netCommissionReceived: number; // Comisión Neta recibida de la ARL (90%)
  clientReturnPercentage: number; // % Retorno pactado con la empresa
  clientReturnAmount: number; // Valor destinado para acompañamiento / retorno a la empresa
  agencyNetMargin: number; // Margen neto que le queda a la agencia PRAXIS
  effectiveCommissionRate: number;
  breakdown: WorkCenterFinancialSummary[];
}

export function calculateCompanyFinancials(
  company: {
    monthlyIbc?: number;
    estimatedIbc?: number;
    employeeCount: number;
    riskClass: RiskClass;
    conceptType: CommissionConcept;
    ciiuCode?: string;
    economicActivity?: string;
    customCommissionOverride?: number;
    returnPercentage?: number;
    workCenters?: WorkCenter[];
  },
  arl?: ARLCompany
): CompanyFinancialTotals {
  const concept = company.conceptType || 'EMPRESA_NUEVA';
  const returnPct = company.returnPercentage ?? 0;
  const hasWorkCenters = Array.isArray(company.workCenters) && company.workCenters.length > 0;

  // Helper to resolve commission rate taking into account economic activity overrides
  const resolveCommission = (
    riskClass: RiskClass,
    centerCiiu?: string,
    centerName?: string
  ): { rate: number; activityName?: string; activityCiiu?: string } => {
    if (
      company.customCommissionOverride !== undefined &&
      company.customCommissionOverride !== null &&
      !isNaN(company.customCommissionOverride)
    ) {
      return { rate: company.customCommissionOverride };
    }

    // Check economic activity overrides in ARL
    if (arl?.economicActivityCommissions && arl.economicActivityCommissions.length > 0) {
      const targetCiiu = (centerCiiu || company.ciiuCode || '').trim().toLowerCase();
      const targetActivity = (company.economicActivity || centerName || '').trim().toLowerCase();

      const matched = arl.economicActivityCommissions.find((act) => {
        if (act.riskClass !== riskClass) return false;
        if (targetCiiu && act.ciiuCode && (act.ciiuCode.trim().toLowerCase() === targetCiiu || targetCiiu.startsWith(act.ciiuCode.trim().toLowerCase()))) {
          return true;
        }
        if (targetActivity && act.activityName && (targetActivity.includes(act.activityName.toLowerCase()) || act.activityName.toLowerCase().includes(targetActivity))) {
          return true;
        }
        return false;
      });

      if (matched) {
        return {
          rate: matched.commissionRate,
          activityName: matched.activityName,
          activityCiiu: matched.ciiuCode,
        };
      }
    }

    // Fallback to default matrix for risk class and concept
    const defaultRate = arl?.defaultCommissionMatrix?.[concept]?.[riskClass] ?? 6.0;
    return { rate: defaultRate };
  };

  let totalIbc = 0;
  let totalEmployees = 0;
  let totalArlContribution = 0;
  let totalCommission = 0;
  let effectiveArlRate = 0;
  let effectiveCommissionRate = 0;
  let breakdown: WorkCenterFinancialSummary[] = [];

  if (hasWorkCenters && company.workCenters && company.workCenters.length > 0) {
    breakdown = company.workCenters.map((wc, idx) => {
      const riskDef = RISK_RATES[wc.riskClass] || RISK_RATES['CLASE_I'];
      const nominalRate = riskDef.nominalRate;
      const ibc = wc.monthlyIbc || 0;
      const arlContrib = ibc * nominalRate;

      // Commission rate resolved
      const resolved = resolveCommission(wc.riskClass, wc.ciiuCode, wc.name);
      const commPct = resolved.rate;
      const commAmount = arlContrib * (commPct / 100);

      return {
        id: wc.id || `wc-${idx}`,
        name: wc.name || `Centro de Trabajo ${idx + 1}`,
        riskClass: wc.riskClass,
        riskLabel: riskDef.label,
        nominalRate,
        percentageText: riskDef.percentageText,
        employeeCount: wc.employeeCount || 0,
        monthlyIbc: ibc,
        arlContribution: arlContrib,
        commissionPercentage: commPct,
        commissionAmount: commAmount,
        appliedActivityName: resolved.activityName,
        appliedActivityCiiu: resolved.activityCiiu,
      };
    });

    totalIbc = breakdown.reduce((sum, b) => sum + b.monthlyIbc, 0);
    totalEmployees = breakdown.reduce((sum, b) => sum + b.employeeCount, 0);
    totalArlContribution = breakdown.reduce((sum, b) => sum + b.arlContribution, 0);
    totalCommission = breakdown.reduce((sum, b) => sum + b.commissionAmount, 0);
    effectiveArlRate = totalIbc > 0 ? totalArlContribution / totalIbc : 0;
    effectiveCommissionRate = totalArlContribution > 0 ? (totalCommission / totalArlContribution) * 100 : 0;
  } else {
    // Fallback / Single Risk Center
    const singleIbc = company.monthlyIbc ?? company.estimatedIbc ?? 0;
    const singleRisk = company.riskClass || 'CLASE_I';
    const riskDef = RISK_RATES[singleRisk] || RISK_RATES['CLASE_I'];
    const arlContrib = singleIbc * riskDef.nominalRate;

    const resolved = resolveCommission(singleRisk, company.ciiuCode, company.economicActivity);
    const commPct = resolved.rate;
    totalCommission = arlContrib * (commPct / 100);
    totalIbc = singleIbc;
    totalEmployees = company.employeeCount || 1;
    totalArlContribution = arlContrib;
    effectiveArlRate = riskDef.nominalRate;
    effectiveCommissionRate = commPct;

    breakdown = [
      {
        id: 'wc-principal',
        name: 'Sede Principal / Centro Único',
        riskClass: singleRisk,
        riskLabel: riskDef.label,
        nominalRate: riskDef.nominalRate,
        percentageText: riskDef.percentageText,
        employeeCount: company.employeeCount || 1,
        monthlyIbc: singleIbc,
        arlContribution: arlContrib,
        commissionPercentage: commPct,
        commissionAmount: totalCommission,
        appliedActivityName: resolved.activityName,
        appliedActivityCiiu: resolved.activityCiiu,
      },
    ];
  }

  // Trazabilidad Financiera Retefuente 10% y Retorno para el Cliente
  const grossCommission = totalCommission;
  const retefuenteRate = 0.10; // 10% Retefuente ARL
  const retefuenteAmount = grossCommission * retefuenteRate;
  const netCommissionReceived = grossCommission - retefuenteAmount;
  const clientReturnAmount = grossCommission * (returnPct / 100);
  const agencyNetMargin = netCommissionReceived - clientReturnAmount;

  return {
    isMultiRisk: breakdown.length > 1,
    workCentersCount: breakdown.length,
    totalIbc,
    totalEmployees,
    totalArlContribution,
    effectiveArlRate,
    effectiveArlRateFormatted: (effectiveArlRate * 100).toFixed(3) + '%',
    totalCommission,
    grossCommission,
    retefuenteRate,
    retefuenteAmount,
    netCommissionReceived,
    clientReturnPercentage: returnPct,
    clientReturnAmount,
    agencyNetMargin,
    effectiveCommissionRate,
    breakdown,
  };
}
