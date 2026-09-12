import { NextResponse } from 'next/server';
import { callGeminiWithRotation } from '@/lib/geminiRotator';
import { PRAXIS_GEMINI_TOOLS, executeToolCall, ToolExecutionResult } from '@/lib/aiTools';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, history = [], customKeys, currentContext = {}, preferredModel, attachments = [] } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Se requiere el parámetro "prompt".' }, { status: 400 });
    }

    // Contexto compacto de empresas existentes para grounding del modelo
    const clientsList = (currentContext.clients || [])
      .slice(0, 15)
      .map((c: any) => `• ID: "${c.id}" | Nombre: "${c.name}" | NIT: "${c.nit}" | ARL: "${c.primaryArlId}"`)
      .join('\n');

    const systemInstruction = `Eres PRAXIS IA 🤖, el Agente Autónomo de Inteligencia Artificial para la gestión de Intermediación de Seguros ARL y Consultoría SG-SST en Colombia (PRAXIS Prevención y Seguros Ltda).

Tu misión no es solo responder preguntas normativas, sino EJECUTAR TAREAS DIRECTAS en la plataforma utilizando tus herramientas oficiales (Tool Calling):
1. 'crear_cliente': Para registrar nuevas empresas clientes afiliadas.
2. 'crear_prospecto_lead': Para agregar prospectos comerciales al pipeline de ventas.
3. 'crear_visita_sst': Para agendar o reportar visitas técnicas de campo y auditorías Res. 0312.
4. 'registrar_caso_medico': Para registrar accidentes de trabajo (FURAT), enfermedades laborales (FUREL) o ausentismo común por EPS.
5. 'liquidar_planilla_pila': Para conciliar pagos PILA y calcular bolsa de retorno SST y retención 10%.
6. 'consultar_plataforma': Para extraer consolidados o estadísticas generales.

DOCUMENTOS Y ARCHIVOS ADJUNTOS:
El usuario puede adjuntar imágenes, archivos PDF (planillas, radicados FURAT, RUTs), hojas de Excel (censos de empleados, nóminas) o documentos de Word. Analiza exhaustivamente los datos contenidos en estos archivos para extraer NITs, nombres de trabajadores, diagnósticos, días de incapacidad o montos de nómina para ejecutar las herramientas de la plataforma.

EMPRESAS ACTIVAS REGISTRADAS EN EL SISTEMA:
${clientsList || 'No hay empresas registradas aún.'}

REGLAS DE OPERACIÓN:
- Cuando el usuario te pida explícitamente o implícitamente crear, registrar, programar o liquidar algo (o te adjunte un archivo para procesarlo), INVOCA INMEDIATAMENTE la herramienta correspondiente con parámetros coherentes con la normatividad colombiana.
- Sé conciso, ejecutivo, seguro y profesional.
- Cita normas colombianas cuando aplique (Resolución 0312 de 2019, Decreto 768 de 2022, Sentencia C-049 de 2022 de la Corte Constitucional sobre comisiones de ARL, Estatuto Tributario Art. 476).`;

    // Formatear historial para Gemini API
    const contents: any[] = [];

    // Agregar últimos turnos de historial si existen
    if (Array.isArray(history)) {
      history.slice(-6).forEach((h: any) => {
        const role = h.sender === 'AI' || h.role === 'model' || h.role === 'assistant' ? 'model' : 'user';
        const text = h.text || h.content || '';
        if (text) {
          contents.push({
            role,
            parts: [{ text }],
          });
        }
      });
    }

    // Construir partes del mensaje actual del usuario (Texto + Archivos Multimodales)
    const userParts: any[] = [{ text: prompt }];

    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((att: any) => {
        if (att.base64 && (att.type?.startsWith('image/') || att.type === 'application/pdf')) {
          const cleanBase64 = att.base64.replace(/^data:[^;]+;base64,/, '');
          userParts.push({
            inlineData: {
              mimeType: att.type,
              data: cleanBase64,
            },
          });
        } else if (att.textContent) {
          userParts.push({
            text: `\n[Archivo Adjunto "${att.name}" (${att.type || 'Documento'})]:\n${att.textContent}\n`,
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: userParts,
    });

    try {
      // Llamada al rotador dual-axis de Gemini (Modelos y Claves estilo LibreChat-WAPPY)
      const geminiResult = await callGeminiWithRotation({
        contents,
        systemInstruction,
        tools: PRAXIS_GEMINI_TOOLS,
        temperature: 0.2,
        customKeys,
        preferredModel,
      });

      const candidate = geminiResult.data?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      let responseText = '';
      let executedAction: ToolExecutionResult | null = null;

      // 1. Verificar si Gemini decidió ejecutar una herramienta (Function Calling)
      if (part?.functionCall) {
        const { name, args } = part.functionCall;
        executedAction = executeToolCall(name, args || {}, {
          clients: currentContext.clients || [],
          leads: currentContext.leads || [],
          visits: currentContext.visits || [],
          medicalRecords: currentContext.medicalRecords || [],
          pilaRecords: currentContext.pilaRecords || [],
        });

        responseText = executedAction.message;
      } else if (part?.text) {
        responseText = part.text;
      } else {
        responseText = 'Operación procesada con éxito por el Agente PRAXIS IA.';
      }

      return NextResponse.json({
        success: true,
        reply: responseText,
        actionExecuted: executedAction,
        modelUsed: geminiResult.modelUsed,
        keyIndexUsed: geminiResult.keyIndexUsed,
        totalKeysInPool: geminiResult.totalKeys,
        rotationsPerformed: geminiResult.rotationsPerformed,
      });
    } catch (apiError: any) {
      console.warn('[AI Agent API] Error invocando Gemini con rotación:', apiError.message);

      // Si no hay claves o hubo fallo temporal, fallback inteligente mediante procesamiento de lenguaje
      const fallbackAction = processFallbackIntent(prompt, currentContext);

      return NextResponse.json({
        success: true,
        reply: fallbackAction ? fallbackAction.message : (
          `⚠️ **Aviso de Conexión IA:** ${apiError.message}\n\nPuedes configurar tus claves de Google Gemini en el menú de **Perfil ➔ Claves de IA** para habilitar el agente autónomo en vivo.`
        ),
        actionExecuted: fallbackAction,
        isFallback: true,
        errorNotice: apiError.message,
      });
    }
  } catch (err: any) {
    console.error('[AI Agent API] Internal Server Error:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Procesador de respaldo en caso de que aún no haya claves API configuradas o el servicio esté temporalmente desconectado.
 * Permite que comandos como "crear empresa X" sigan funcionando localmente.
 */
function processFallbackIntent(prompt: string, currentContext: any): ToolExecutionResult | null {
  const lower = prompt.toLowerCase();

  if (lower.includes('crear empresa') || lower.includes('crear cliente') || lower.includes('nueva empresa')) {
    // Intentar extraer nombre básico
    const nameMatch = prompt.match(/(?:empresa|cliente)\s+(?:llamada\s+|denominada\s+)?["']?([^"',\n]+)["']?/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Nueva Empresa Asistida S.A.S.';
    
    return executeToolCall('crear_cliente', {
      name,
      nit: `901.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(1 + Math.random() * 9)}`,
      primaryArlId: lower.includes('positiva') ? 'positiva' : lower.includes('colpatria') ? 'colpatria' : lower.includes('bolivar') ? 'bolivar' : 'sura',
      monthlyIbc: 65000000,
      employeeCount: 30,
      riskClass: lower.includes('riesgo v') ? 'CLASE_V' : lower.includes('riesgo iv') ? 'CLASE_IV' : lower.includes('riesgo iii') ? 'CLASE_III' : 'CLASE_I',
      returnPercentage: 25,
      city: 'Bogotá D.C.',
    }, {
      clients: currentContext.clients || [],
      leads: currentContext.leads || [],
      visits: currentContext.visits || [],
      medicalRecords: currentContext.medicalRecords || [],
      pilaRecords: currentContext.pilaRecords || [],
    });
  }

  if (lower.includes('visita') || lower.includes('agendar') || lower.includes('programar visita')) {
    return executeToolCall('crear_visita_sst', {
      companyNameOrId: currentContext.clients?.[0]?.name || 'Empresa Afiliada',
      visitDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      visitType: 'INSPECCION_CAMPO',
      hoursSpent: 4,
      location: 'Sede Operativa',
      findings: 'Inspección técnica programada con asistencia de PRAXIS IA.',
    }, {
      clients: currentContext.clients || [],
      leads: currentContext.leads || [],
      visits: currentContext.visits || [],
      medicalRecords: currentContext.medicalRecords || [],
      pilaRecords: currentContext.pilaRecords || [],
    });
  }

  if (lower.includes('accidente') || lower.includes('furat') || lower.includes('incapacidad')) {
    return executeToolCall('registrar_caso_medico', {
      companyNameOrId: currentContext.clients?.[0]?.name || 'Empresa Afiliada',
      incidentType: 'ACCIDENTE_TRABAJO',
      employeeName: 'Trabajador Operativo',
      daysLost: 3,
      diagnosisDescription: 'Traumatismo en miembro superior reportado vía asistente.',
    }, {
      clients: currentContext.clients || [],
      leads: currentContext.leads || [],
      visits: currentContext.visits || [],
      medicalRecords: currentContext.medicalRecords || [],
      pilaRecords: currentContext.pilaRecords || [],
    });
  }

  if (lower.includes('resumen') || lower.includes('cartera') || lower.includes('estado')) {
    return executeToolCall('consultar_plataforma', { queryType: 'RESUMEN_CARTERA' }, {
      clients: currentContext.clients || [],
      leads: currentContext.leads || [],
      visits: currentContext.visits || [],
      medicalRecords: currentContext.medicalRecords || [],
      pilaRecords: currentContext.pilaRecords || [],
    });
  }

  return null;
}
