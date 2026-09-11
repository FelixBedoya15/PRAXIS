'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  Shield,
  Calculator,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  Users,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { getStoredClients, getStoredWhatsAppMessages, saveStoredWhatsAppMessages, getStoredARLs } from '@/lib/storage';
import { ClientCompany, WhatsAppMessage, ARLCompany } from '@/types';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
}

const KNOWLEDGE_RESPONSES: Record<string, string> = {
  iva: `💡 **Exclusión de IVA en Comisiones ARL (Estatuto Tributario & Sentencia C-049 de 2022):**

1. **Fundamento Legal:** El Artículo 476 numeral 3 del Estatuto Tributario excluye expresamente del IVA los servicios de intermediación en el Sistema de Seguridad Social Integral.
2. **Sentencia C-049 de 2022:** La Corte Constitucional ratificó que las comisiones que pagan las ARLs a los intermediarios provienen exclusivamente de los **gastos de administración de la ARL**, sin afectar las reservas de siniestros ni las cotizaciones de los trabajadores.
3. **Facturación:** Al emitir la cuenta de cobro o factura electrónica a la ARL, se registra tarifa de **0% de IVA** con la leyenda de exclusión legal.`,

  decreto768: `📋 **Tabla de Cotización y Clases de Riesgo (Decreto 768 de 2022):**

* **Clase I (Mínimo):** Tasa 0.522% (Rango 0.348% - 0.696%) - Oficinas, finanzas, comercio.
* **Clase II (Bajo):** Tasa 1.044% (Rango 0.435% - 1.653%) - Manufactura liviana, textiles.
* **Clase III (Medio):** Tasa 2.436% (Rango 0.783% - 4.089%) - Químicos, alimentos, metalmecánica.
* **Clase IV (Alto):** Tasa 4.350% (Rango 1.740% - 6.960%) - Transporte de carga, fundición.
* **Clase V (Máximo):** Tasa 6.960% (Rango 3.219% - 8.700%) - Minería, construcción, petróleos.

*Fórmula:* Aporte ARL = IBC Mensual x Tasa de Cotización.`,

  res0312: `👷 **Estándares Mínimos del SG-SST (Resolución 0312 de 2019):**

1. **7 Estándares:** Empresas con 10 o menos trabajadores clasificadas en Riesgo I, II o III.
2. **21 Estándares:** Empresas de 11 a 50 trabajadores clasificadas en Riesgo I, II o III.
3. **60 Estándares:** Todas las empresas de más de 50 trabajadores (cualquier riesgo) y TODAS las empresas clasificadas en Riesgo IV o V (sin importar el número de trabajadores).

*Criterios de Evaluación:*
* Menor al 60%: **Crítico** (Plan de mejoramiento inmediato).
* Entre 60% y 85%: **Moderadamente Aceptable**.
* Mayor al 85%: **Aceptable**.`,

  comisiones: `💰 **Esquema de Liquidación de Comisiones según Concepto de Negocio:**

1. **Empresa Nueva (Vinculación inicial):** Comisión acordada según la clase de riesgo y masa salarial (típicamente 6.0% a 10.0% del aporte recaudado).
2. **Nombramiento de Intermediario:** Designación de agencia para empresas ya activas en la ARL.
3. **Cambio / Traslado de ARL:** Migración de empresa entre entidades aseguradoras (requiere antelación de 30 días y paz y salvo PILA).

*Nota:* Los honorarios son asumidos 100% por la ARL receptora mediante sus gastos de administración.`,
};

export default function WappyIAPage() {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'ASSISTANT' | 'WHATSAPP'>('ASSISTANT');

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'AI',
      text: '¡Hola Félix! Soy el asistente inteligente de **PRAXIS Prevención y Seguros**. Puedo orientarte en normatividad (Sentencia C-049/2022, Decreto 768/2022, Res. 0312/2019), exclusión de IVA, liquidación de comisiones de las 5 ARLs oficiales o redactar notificaciones de cartera para WhatsApp. ¿En qué puedo apoyarte hoy?',
      timestamp: 'Ahora',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // WhatsApp Automation State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [templateType, setTemplateType] = useState<WhatsAppMessage['messageType']>('RECORDATORIO_PILA');
  const [customMessage, setCustomMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    const cls = getStoredClients();
    setClients(cls);
    setMessages(getStoredWhatsAppMessages());
    if (cls.length > 0) {
      setSelectedClientId(cls[0].id);
      updateTemplatePreview(cls[0], 'RECORDATORIO_PILA');
    }
  }, []);

  const updateTemplatePreview = (client: ClientCompany, type: WhatsAppMessage['messageType']) => {
    let msg = '';
    const contactName = client.legalRepName || client.name;

    if (type === 'RECORDATORIO_PILA') {
      msg = `Hola ${contactName}, cordial saludo desde PRAXIS Prevención y Seguros. Te recordamos que se aproxima la fecha límite de pago de tu planilla PILA para ${client.name}. Si requieres asistencia técnica o soporte con la liquidación de la ARL, estamos atentos para servirte.`;
    } else if (type === 'ALERTA_MORA') {
      msg = `Estimado(a) ${contactName}, hemos detectado en el extracto de la ARL que la planilla PILA del periodo en curso presenta estado pendiente para ${client.name}. Evita la suspensión de coberturas por accidentes de trabajo. Escríbenos para conciliar tu estado de cuenta con el respaldo de PRAXIS.`;
    } else if (type === 'VISITA_SST') {
      msg = `Buen día ${contactName}, el equipo técnico de campo de PRAXIS Prevención y Seguros tiene programada la auditoría técnica de estándares mínimos (Res. 0312) para ${client.name} el próximo viernes a las 9:00 AM. Por favor confirma la disponibilidad del responsable SST.`;
    } else {
      msg = `Hola ${contactName}, nos complace informarle que la afiliación e intermediación ARL de ${client.name} se encuentra formalmente activa y respaldada por PRAXIS Prevención y Seguros Agencia de Seguros Ltda. Quedamos a su completa disposición.`;
    }

    setCustomMessage(msg);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const cli = clients.find((c) => c.id === clientId);
    if (cli) updateTemplatePreview(cli, templateType);
  };

  const handleTemplateChange = (type: WhatsAppMessage['messageType']) => {
    setTemplateType(type);
    const cli = clients.find((c) => c.id === selectedClientId);
    if (cli) updateTemplatePreview(cli, type);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const cli = clients.find((c) => c.id === selectedClientId);
    if (!cli) return;

    const newMsg: WhatsAppMessage = {
      id: `wapp-${Date.now().toString().slice(-4)}`,
      recipientPhone: cli.legalRepPhone || '+573000000000',
      recipientName: cli.legalRepName || cli.name,
      companyName: cli.name,
      messageType: templateType,
      content: customMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'ENVIADO',
      direction: 'OUTBOUND',
    };

    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveStoredWhatsAppMessages(updated);
    setSendSuccess(`Mensaje de WhatsApp enviado a ${cli.legalRepName || cli.name} (${cli.name})`);
    setTimeout(() => setSendSuccess(null), 3500);
  };

  const handleSendPrompt = (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    setTimeout(() => {
      let aiText = '';
      const lower = textToSend.toLowerCase();

      if (lower.includes('iva') || lower.includes('tribut') || lower.includes('476') || lower.includes('c-049')) {
        aiText = KNOWLEDGE_RESPONSES.iva;
      } else if (lower.includes('768') || lower.includes('tasa') || lower.includes('clase') || lower.includes('riesgo')) {
        aiText = KNOWLEDGE_RESPONSES.decreto768;
      } else if (lower.includes('0312') || lower.includes('estandar') || lower.includes('auditoria')) {
        aiText = KNOWLEDGE_RESPONSES.res0312;
      } else if (lower.includes('comision') || lower.includes('nombramiento') || lower.includes('nueva') || lower.includes('concepto')) {
        aiText = KNOWLEDGE_RESPONSES.comisiones;
      } else if (lower.includes('calcular') || lower.includes('nomina') || lower.includes('ibc') || lower.includes('200')) {
        aiText = `📊 **Cálculo de Liquidación Estimada (Ejemplo Nómina $200.000.000 COP):**

1. **Clase I (0.522%):** Aporte ARL = $1.044.000 COP | Comisión al 6.0% = **$62.640 COP** (0% IVA)
2. **Clase III (2.436%):** Aporte ARL = $4.872.000 COP | Comisión al 7.5% = **$365.400 COP** (0% IVA)
3. **Clase V (6.960%):** Aporte ARL = $13.920.000 COP | Comisión al 9.0% = **$1.252.800 COP** (0% IVA)

*Recuerda que la liquidación final dependerá del número de novedades y días cotizados reportados en la Planilla PILA.*`;
      } else {
        aiText = `He analizado tu consulta con el motor normativo de **PRAXIS Prevención y Seguros & SGRL Colombia**.

La normatividad vigente (Sentencia C-049 de 2022 y Decreto 768 de 2022) exige que la intermediación de ARL mantenga estricta concordancia con la nómina reportada en PILA y la clase de riesgo del centro de trabajo.

¿Deseas que simulemos un cálculo específico para una empresa o configuremos una notificación automática de cartera por WhatsApp?`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'AI',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 flex items-center gap-1">
              <Bot size={12} /> GEMINI 2.5 & WHATSAPP
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Motor de Asistencia & CRM Omnicanal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            PRAXIS IA & Automatización WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Consultas normativas SGRL, soporte técnico para {clients.length} empresas activas y disparadores de WhatsApp.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ASSISTANT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ASSISTANT'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Bot size={14} /> Asistente Normativo IA
          </button>
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'WHATSAPP'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare size={14} /> Automatizaciones WhatsApp
          </button>
        </div>
      </div>

      {sendSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{sendSuccess}</span>
        </div>
      )}

      {/* TAB 1: AI ASSISTANT */}
      {activeTab === 'ASSISTANT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col h-[520px] justify-between shadow-sm">
              {/* Messages Container */}
              <div className="overflow-y-auto space-y-4 pr-1">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.sender === 'USER' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                        msg.sender === 'AI'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {msg.sender === 'AI' ? <Bot size={16} /> : 'FB'}
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.sender === 'AI'
                          ? 'bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {msg.text}
                      <span
                        className={`text-[9px] block mt-1 font-mono ${
                          msg.sender === 'AI' ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                    <Sparkles size={14} className="animate-spin text-blue-500" />
                    <span>PRAXIS IA consultando decretos y jurisprudencia...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                  placeholder="Formula una consulta legal, cálculo de comisión o estándar SST..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSendPrompt()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Prompts Column */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" /> Consultas Rápidas Preconfiguradas
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => handleSendPrompt('¿Por qué las comisiones de ARL no tienen IVA según la Sentencia C-049 de 2022?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-semibold text-[11px]">Exclusión IVA (Art. 476 ET & C-049)</span>
                  <span className="text-slate-400 group-hover:text-blue-500">→</span>
                </button>

                <button
                  onClick={() => handleSendPrompt('Muéstrame la tabla oficial de cotización del Decreto 768 de 2022')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-semibold text-[11px]">Tasas de Cotización (Dec. 768/2022)</span>
                  <span className="text-slate-400 group-hover:text-blue-500">→</span>
                </button>

                <button
                  onClick={() => handleSendPrompt('¿Cómo se dividen los estándares mínimos en la Resolución 0312 de 2019?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-semibold text-[11px]">Estándares Mínimos (Res. 0312)</span>
                  <span className="text-slate-400 group-hover:text-blue-500">→</span>
                </button>

                <button
                  onClick={() => handleSendPrompt('Calcula la comisión para una empresa con nómina de 200 millones en riesgos I, III y V')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-semibold text-[11px]">Cálculo Comisiones Nómina $200M</span>
                  <span className="text-slate-400 group-hover:text-blue-500">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHATSAPP AUTOMATION */}
      {activeTab === 'WHATSAPP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sender Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-500" /> Disparador de Notificaciones WhatsApp
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  Canal Directo
                </span>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Empresa Destinataria</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.legalRepName || 'Representante'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Plantilla de Notificación</label>
                    <select
                      value={templateType}
                      onChange={(e) => handleTemplateChange(e.target.value as WhatsAppMessage['messageType'])}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                    >
                      <option value="RECORDATORIO_PILA">📅 Recordatorio Vencimiento PILA</option>
                      <option value="ALERTA_MORA">⚠️ Alerta de Mora / Planilla Pendiente</option>
                      <option value="VISITA_SST">👷 Programación Visita Técnica SST</option>
                      <option value="BIENVENIDA_AFILIACION">🎉 Bienvenida & Cobertura Activa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Vista Previa del Mensaje (Editable)
                  </label>
                  <textarea
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-200 leading-relaxed font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Send size={14} /> Disparar Mensaje WhatsApp
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Outbox Activity */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-500" /> Registro de Envíos Recientes
              </h3>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900 dark:text-white font-semibold">{m.companyName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">{m.recipientName} ({m.recipientPhone})</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{m.content}"</p>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block pt-0.5">
                      ✓✓ {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
