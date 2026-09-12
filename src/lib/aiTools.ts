/**
 * AI Tool Calling Engine for PRAXIS
 * Define las herramientas que el Agente Gemini puede invocar para interactuar con la plataforma
 * y ejecutar tareas reales: crear empresas, agendar visitas, registrar accidentes y liquidar planillas.
 */

import {
  ClientCompany,
  LeadProspect,
  FieldVisit,
  MedicalRecord,
  PilaRecord,
  RiskClass,
  CommissionConcept,
  WorkCenter,
} from '@/types';

export const PRAXIS_GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'crear_cliente',
        description:
          'Registra y afilia una nueva empresa cliente activa en PRAXIS con su NIT, ARL, IBC, trabajadores y centros de trabajo.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Razón social de la empresa (ej: Constructora Bolívar S.A.S.)' },
            nit: { type: 'STRING', description: 'NIT con dígito de verificación (ej: 901.888.777-1)' },
            city: { type: 'STRING', description: 'Ciudad principal (ej: Cali, Bogotá, Medellín)' },
            primaryArlId: {
              type: 'STRING',
              description: 'Identificador de la ARL (sura, positiva, colpatria, bolivar)',
            },
            monthlyIbc: { type: 'NUMBER', description: 'Masa salarial o IBC mensual en COP (ej: 80000000)' },
            employeeCount: { type: 'NUMBER', description: 'Número total de trabajadores (ej: 45)' },
            riskClass: {
              type: 'STRING',
              description: 'Clase de riesgo principal: CLASE_I, CLASE_II, CLASE_III, CLASE_IV o CLASE_V',
            },
            returnPercentage: {
              type: 'NUMBER',
              description: 'Porcentaje de retorno pactado para la bolsa de acompañamiento SST (ej: 25)',
            },
            economicActivity: { type: 'STRING', description: 'Actividad económica principal de la empresa' },
            legalRepName: { type: 'STRING', description: 'Nombre del representante legal' },
            legalRepPhone: { type: 'STRING', description: 'Celular o teléfono del representante legal' },
          },
          required: ['name', 'nit', 'primaryArlId', 'monthlyIbc', 'employeeCount', 'riskClass'],
        },
      },
      {
        name: 'crear_prospecto_lead',
        description:
          'Crea un nuevo prospecto comercial (Lead) en el pipeline de ventas de PRAXIS en etapa de contacto inicial o diagnóstico.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Nombre de la empresa prospecto' },
            nit: { type: 'STRING', description: 'NIT de la empresa' },
            city: { type: 'STRING', description: 'Ciudad' },
            currentArlId: { type: 'STRING', description: 'ARL actual de la empresa (sura, positiva, colpatria, bolivar)' },
            proposedArlId: { type: 'STRING', description: 'ARL propuesta a la que se desea trasladar o nombrar' },
            estimatedIbc: { type: 'NUMBER', description: 'IBC mensual aproximado' },
            employeeCount: { type: 'NUMBER', description: 'Número de empleados' },
            riskClass: { type: 'STRING', description: 'CLASE_I, CLASE_II, CLASE_III, CLASE_IV o CLASE_V' },
            stage: {
              type: 'STRING',
              description: 'Etapa inicial: NUEVO_LEAD, DIAGNOSTICO_ARL, PROPUESTA_ENVIADA o CARTA_NOMBRAMIENTO',
            },
            nextFollowUpAction: { type: 'STRING', description: 'Próxima acción de seguimiento comercial' },
            legalRepName: { type: 'STRING', description: 'Representante legal' },
          },
          required: ['name', 'nit', 'proposedArlId', 'estimatedIbc', 'employeeCount', 'riskClass'],
        },
      },
      {
        name: 'crear_visita_sst',
        description:
          'Agenda o registra una visita técnica de campo SST o auditoría de la Resolución 0312 para una empresa cliente.',
        parameters: {
          type: 'OBJECT',
          properties: {
            companyNameOrId: { type: 'STRING', description: 'Nombre o ID de la empresa cliente' },
            visitDate: { type: 'STRING', description: 'Fecha de la visita en formato AAAA-MM-DD (ej: 2026-09-20)' },
            visitType: {
              type: 'STRING',
              description: 'Tipo de visita: AUDITORIA_0312, INSPECCION_CAMPO, ASESORIA_TECNICA, CAPACITACION, INVESTIGACION_AT',
            },
            status: {
              type: 'STRING',
              description: 'Estado de la visita: PROGRAMADA, REALIZADA o PENDIENTE',
            },
            hoursSpent: { type: 'NUMBER', description: 'Horas técnicas invertidas (ej: 4)' },
            location: { type: 'STRING', description: 'Ubicación o sede inspeccionada' },
            findings: { type: 'STRING', description: 'Hallazgos principales o resumen de la actividad' },
            observations: { type: 'STRING', description: 'Observaciones técnicas' },
          },
          required: ['companyNameOrId', 'visitDate', 'visitType'],
        },
      },
      {
        name: 'registrar_caso_medico',
        description:
          'Registra un caso médico: Accidente de Trabajo (con código FURAT), Enfermedad Laboral (FUREL) o Ausentismo Común.',
        parameters: {
          type: 'OBJECT',
          properties: {
            companyNameOrId: { type: 'STRING', description: 'Nombre o ID de la empresa' },
            incidentType: {
              type: 'STRING',
              description: 'Tipo de evento: ACCIDENTE_TRABAJO, AUSENTISMO_COMUN, ENFERMEDAD_LABORAL o EXAMEN_MEDICO',
            },
            employeeName: { type: 'STRING', description: 'Nombre completo del trabajador accidentado o incapacitado' },
            employeeDocument: { type: 'STRING', description: 'Cédula de ciudadanía o documento' },
            employeeRole: { type: 'STRING', description: 'Cargo u ocupación del trabajador' },
            diagnosisCie10: { type: 'STRING', description: 'Código diagnóstico CIE-10 (ej: S93.4, S61.0, G56.0)' },
            diagnosisDescription: { type: 'STRING', description: 'Descripción clínica del diagnóstico o lesión' },
            daysLost: { type: 'NUMBER', description: 'Días de incapacidad médica otorgados' },
            furatFurepCode: { type: 'STRING', description: 'Código del radicado FURAT / FUREP ante la ARL' },
            date: { type: 'STRING', description: 'Fecha del evento en formato AAAA-MM-DD' },
          },
          required: ['companyNameOrId', 'incidentType', 'employeeName', 'daysLost', 'diagnosisDescription'],
        },
      },
      {
        name: 'liquidar_planilla_pila',
        description:
          'Registra la liquidación de una planilla PILA mensual para una empresa, calculando aportes ARL, comisión y retorno.',
        parameters: {
          type: 'OBJECT',
          properties: {
            companyNameOrId: { type: 'STRING', description: 'Nombre o ID de la empresa' },
            month: { type: 'STRING', description: 'Mes de la planilla en formato AAAA-MM (ej: 2026-08)' },
            ibcReported: { type: 'NUMBER', description: 'IBC total reportado en la planilla' },
            realPaidCommission: {
              type: 'NUMBER',
              description: 'Comisión efectivamente girada por la ARL (dejar 0 o omitir para usar la calculada)',
            },
            returnPercentage: { type: 'NUMBER', description: 'Porcentaje de retorno pactado (ej: 25)' },
            notes: { type: 'STRING', description: 'Notas o novedades de la planilla' },
          },
          required: ['companyNameOrId', 'month'],
        },
      },
      {
        name: 'consultar_plataforma',
        description:
          'Consulta el resumen consolidado de cartera, lista de empresas activas, prospectos o métricas del sistema.',
        parameters: {
          type: 'OBJECT',
          properties: {
            queryType: {
              type: 'STRING',
              description: 'Tipo de consulta: RESUMEN_CARTERA, LISTA_EMPRESAS, LISTA_LEADS, ESTADISTICAS_SST, TODAS',
            },
          },
          required: ['queryType'],
        },
      },
    ],
  },
];

export interface ToolExecutionResult {
  success: boolean;
  action: string;
  message: string;
  entityType?: 'CLIENT' | 'LEAD' | 'VISIT' | 'MEDICAL' | 'PILA';
  data?: any;
  redirectUrl?: string;
}

/**
 * Ejecutor local de herramientas para procesar la acción del agente de IA
 */
export function executeToolCall(name: string, args: any, currentData: {
  clients: ClientCompany[];
  leads: LeadProspect[];
  visits: FieldVisit[];
  medicalRecords: MedicalRecord[];
  pilaRecords: PilaRecord[];
}): ToolExecutionResult {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  switch (name) {
    case 'crear_cliente': {
      const id = `cli-${Date.now().toString().slice(-5)}`;
      const cleanNit = (args.nit || '').trim();
      const risk = (args.riskClass || 'CLASE_I') as RiskClass;
      const ibc = Number(args.monthlyIbc) || 50000000;
      const emp = Number(args.employeeCount) || 20;

      const newClient: ClientCompany = {
        id,
        nit: cleanNit,
        name: args.name,
        economicActivity: args.economicActivity || 'Actividades comerciales y de servicios',
        ciiuCode: '4690',
        primaryArlId: (args.primaryArlId || 'sura').toLowerCase(),
        riskClass: risk,
        monthlyIbc: ibc,
        employeeCount: emp,
        address: args.address || 'Sede Principal',
        city: args.city || 'Bogotá D.C.',
        conceptType: 'EMPRESA_NUEVA',
        returnPercentage: args.returnPercentage !== undefined ? Number(args.returnPercentage) : 25,
        status: 'ACTIVO',
        legalRepName: args.legalRepName || 'Representante Legal',
        legalRepEmail: 'gerencia@empresa.com.co',
        legalRepPhone: args.legalRepPhone || '300 000 0000',
        sstResponsibleName: 'Coordinador SST',
        sstResponsibleEmail: 'sst@empresa.com.co',
        sstResponsiblePhone: '300 000 0000',
        createdAt: todayStr,
        lastPilaDate: todayStr,
        standardsCount: emp > 50 || risk === 'CLASE_IV' || risk === 'CLASE_V' ? 60 : emp > 10 ? 21 : 7,
        standardsScore: 0,
        standardsRating: 'CRITICO',
        workCenters: [
          {
            id: `wc-${Date.now().toString().slice(-4)}-1`,
            name: 'Centro de Operaciones Principal',
            riskClass: risk,
            employeeCount: emp,
            monthlyIbc: ibc,
            city: args.city || 'Bogotá D.C.',
          },
        ],
      };

      return {
        success: true,
        action: 'crear_cliente',
        message: `Empresa "${newClient.name}" (NIT: ${newClient.nit}) registrada exitosamente en ARL ${newClient.primaryArlId.toUpperCase()} con ${newClient.employeeCount} trabajadores y ${newClient.returnPercentage}% de retorno SST.`,
        entityType: 'CLIENT',
        data: newClient,
        redirectUrl: `/clientes?cliente=${newClient.id}`,
      };
    }

    case 'crear_prospecto_lead': {
      const id = `lead-${Date.now().toString().slice(-5)}`;
      const risk = (args.riskClass || 'CLASE_II') as RiskClass;
      const ibc = Number(args.estimatedIbc) || 40000000;
      const emp = Number(args.employeeCount) || 15;

      const newLead: LeadProspect = {
        id,
        name: args.name,
        nit: (args.nit || '').trim(),
        economicActivity: 'Comercio y distribución',
        currentArlId: (args.currentArlId || 'positiva').toLowerCase(),
        proposedArlId: (args.proposedArlId || 'sura').toLowerCase(),
        riskClass: risk,
        estimatedIbc: ibc,
        employeeCount: emp,
        city: args.city || 'Medellín',
        stage: args.stage || 'NUEVO_LEAD',
        source: 'WHATSAPP',
        conceptType: 'CAMBIO_INTERMEDIARIO',
        returnPercentage: 25,
        legalRepName: args.legalRepName || 'Gerente General',
        legalRepEmail: 'contacto@prospecto.com',
        legalRepPhone: '310 000 0000',
        sstResponsibleName: 'Líder SST',
        sstResponsibleEmail: 'seguridad@prospecto.com',
        sstResponsiblePhone: '310 000 0000',
        nextFollowUpDate: todayStr,
        nextFollowUpAction: args.nextFollowUpAction || 'Presentar propuesta técnica de intermediación y retorno',
        estimatedMonthlyCommission: ibc * 0.005,
        notes: 'Prospecto captado mediante asistente IA.',
        createdAt: todayStr,
      };

      return {
        success: true,
        action: 'crear_prospecto_lead',
        message: `Prospecto "${newLead.name}" añadido al Pipeline comercial en etapa ${newLead.stage} para traslado a ARL ${newLead.proposedArlId.toUpperCase()}.`,
        entityType: 'LEAD',
        data: newLead,
        redirectUrl: '/clientes',
      };
    }

    case 'crear_visita_sst': {
      const query = (args.companyNameOrId || '').toLowerCase();
      const client = currentData.clients.find(
        (c) => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query) || c.nit.includes(query)
      );

      const targetClientId = client ? client.id : currentData.clients[0]?.id || 'cli-001';
      const targetClientName = client ? client.name : args.companyNameOrId;

      const newVisit: FieldVisit = {
        id: `vis-${Date.now().toString().slice(-4)}`,
        clientId: targetClientId,
        clientName: targetClientName,
        engineerId: 'eng-01',
        engineerName: 'Ing. Félix Bedoya (Especialista SST Lic. 14920)',
        visitDate: args.visitDate || todayStr,
        hoursSpent: Number(args.hoursSpent) || 4.0,
        visitType: args.visitType || 'INSPECCION_CAMPO',
        status: args.status || 'PROGRAMADA',
        location: args.location || 'Sede Principal de la Empresa',
        findings: args.findings || 'Visita técnica programada mediante el asistente inteligente PRAXIS IA.',
        observations: args.observations || 'Se coordinará el protocolo de ingreso con el responsable de SST.',
        actionPlan: 'Ejecutar inspección física y remitir informe técnico a la empresa y ARL.',
        clientSignature: 'Pendiente de firma en campo',
      };

      return {
        success: true,
        action: 'crear_visita_sst',
        message: `Visita técnica (${newVisit.visitType}) agendada para "${targetClientName}" el ${newVisit.visitDate} (${newVisit.hoursSpent} hrs).`,
        entityType: 'VISIT',
        data: newVisit,
        redirectUrl: `/campo-sst?cliente=${targetClientId}`,
      };
    }

    case 'registrar_caso_medico': {
      const query = (args.companyNameOrId || '').toLowerCase();
      const client = currentData.clients.find(
        (c) => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query) || c.nit.includes(query)
      );

      const targetClientId = client ? client.id : currentData.clients[0]?.id || 'cli-001';
      const targetClientName = client ? client.name : args.companyNameOrId;

      const newMed: MedicalRecord = {
        id: `med-${Date.now().toString().slice(-4)}`,
        clientId: targetClientId,
        clientName: targetClientName,
        incidentType: args.incidentType || 'ACCIDENTE_TRABAJO',
        employeeName: args.employeeName,
        employeeDocument: args.employeeDocument || 'CC Sin especificar',
        employeeRole: args.employeeRole || 'Operario',
        diagnosisCie10: (args.diagnosisCie10 || 'S93.4').toUpperCase(),
        diagnosisDescription: args.diagnosisDescription,
        daysLost: Number(args.daysLost) || 1,
        furatFurepCode: args.furatFurepCode || `FURAT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        pveProgram: 'NINGUNO',
        medicalNotes: 'Registrado desde la consola inteligente de PRAXIS IA.',
        confidentialFlag: false,
        date: args.date || todayStr,
        createdByDoctor: 'Dra. Marcela Salazar (Médico Especialista SST)',
      };

      return {
        success: true,
        action: 'registrar_caso_medico',
        message: `Caso médico de ${newMed.incidentType} registrado para ${newMed.employeeName} en "${targetClientName}" (${newMed.daysLost} días de incapacidad, Radicado: ${newMed.furatFurepCode}).`,
        entityType: 'MEDICAL',
        data: newMed,
        redirectUrl: `/medico?cliente=${targetClientId}`,
      };
    }

    case 'liquidar_planilla_pila': {
      const query = (args.companyNameOrId || '').toLowerCase();
      const client = currentData.clients.find(
        (c) => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query) || c.nit.includes(query)
      );

      if (!client) {
        throw new Error(`No se encontró una empresa afiliada con el nombre o NIT "${args.companyNameOrId}".`);
      }

      const ibc = Number(args.ibcReported) || client.monthlyIbc;
      const rate = 0.02436; // nominal
      const arlContribution = ibc * rate;
      const commissionRate = 8.0;
      const expectedCommission = arlContribution * (commissionRate / 100);
      const returnPct = args.returnPercentage !== undefined ? Number(args.returnPercentage) : (client.returnPercentage || 25);
      const clientReturnAmount = expectedCommission * (returnPct / 100);
      const retefuenteAmount = expectedCommission * 0.10;
      const agencyNetMargin = (expectedCommission - retefuenteAmount) - clientReturnAmount;

      const newPila: PilaRecord = {
        id: `pila-${Date.now().toString().slice(-4)}`,
        clientId: client.id,
        clientName: client.name,
        month: args.month || '2026-08',
        year: 2026,
        ibcReported: ibc,
        riskClass: client.riskClass,
        arlContribution,
        commissionRate,
        expectedCommission,
        realPaidCommission: args.realPaidCommission ? Number(args.realPaidCommission) : expectedCommission,
        difference: 0,
        status: 'CONCILIADO',
        notes: args.notes || 'Planilla liquidada y conciliada vía PRAXIS IA.',
        invoiceGenerated: true,
        returnPercentage: returnPct,
        clientReturnAmount,
        retefuenteAmount,
        netCommissionReceived: expectedCommission - retefuenteAmount,
        agencyNetMargin,
      };

      return {
        success: true,
        action: 'liquidar_planilla_pila',
        message: `Planilla PILA ${newPila.month} conciliada para "${client.name}". Aporte ARL: $${Math.round(arlContribution).toLocaleString('es-CO')}, Retorno Cliente (${returnPct}%): $${Math.round(clientReturnAmount).toLocaleString('es-CO')}, Margen Agencia: $${Math.round(agencyNetMargin).toLocaleString('es-CO')}.`,
        entityType: 'PILA',
        data: newPila,
        redirectUrl: `/comisiones?cliente=${client.id}`,
      };
    }

    case 'consultar_plataforma': {
      const clientsCount = currentData.clients.length;
      const leadsCount = currentData.leads.length;
      const visitsCount = currentData.visits.length;
      const medicalCount = currentData.medicalRecords.length;
      const totalIbc = currentData.clients.reduce((s, c) => s + c.monthlyIbc, 0);

      return {
        success: true,
        action: 'consultar_plataforma',
        message: `Estado de la plataforma: ${clientsCount} empresas clientes activas (IBC total: $${totalIbc.toLocaleString('es-CO')}), ${leadsCount} prospectos comerciales en pipeline, ${visitsCount} visitas técnicas de campo SST y ${medicalCount} casos médicos/incapacidades registrados.`,
      };
    }

    default:
      return {
        success: false,
        action: name,
        message: `Acción "${name}" no reconocida.`,
      };
  }
}
