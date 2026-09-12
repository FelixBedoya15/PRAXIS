'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  Shield,
  Calculator,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  AlertTriangle,
  RotateCcw,
  Zap,
  Key,
  ExternalLink,
  ArrowRight,
  HardHat,
  Stethoscope,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  AlertCircle,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getStoredClients,
  saveStoredClients,
  getStoredLeads,
  saveStoredLeads,
  getStoredFieldVisits,
  saveStoredFieldVisits,
  getStoredMedicalRecords,
  saveStoredMedicalRecords,
  getStoredPilaRecords,
  saveStoredPilaRecords,
  getStoredWhatsAppMessages,
  saveStoredWhatsAppMessages,
  getStoredARLs,
  getStoredGeminiKeys,
} from '@/lib/storage';
import {
  ClientCompany,
  LeadProspect,
  FieldVisit,
  MedicalRecord,
  PilaRecord,
  WhatsAppMessage,
  ARLCompany,
} from '@/types';
import { ToolExecutionResult } from '@/lib/aiTools';
import { extractKeyPool, LIBRECHAT_WAPPY_MODELS } from '@/lib/geminiRotator';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64?: string;
  previewUrl?: string;
  textContent?: string;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  actionExecuted?: ToolExecutionResult;
  modelUsed?: string;
  rotationsPerformed?: number;
  isFallback?: boolean;
  attachments?: AttachedFile[];
}

export default function WappyIAPage() {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [leads, setLeads] = useState<LeadProspect[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [pilaRecords, setPilaRecords] = useState<PilaRecord[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [geminiKeys, setGeminiKeys] = useState<string>('');
  const [keyPool, setKeyPool] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash-lite');
  const [activeTab, setActiveTab] = useState<'ASSISTANT' | 'WHATSAPP'>('ASSISTANT');

  // File Attachments State (LibreChat Style)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'AI',
      text: `¡Hola! Soy **PRAXIS IA** 🤖, el agente autónomo de intermediación de ARL y consultoría SG-SST en Colombia.

No solo resuelvo consultas legales y de comisiones (Sentencia C-049/2022, Decreto 768/2022, Res. 0312/2019), sino que **puedo ejecutar acciones directas en la plataforma por ti**:
• 🏢 **Crear y afiliar empresas** con NIT, ARL y clases de riesgo.
• 📅 **Agendar y registrar visitas técnicas SST** o auditorías Res. 0312.
• 🩺 **Registrar accidentes laborales con FURAT**, ausentismo o enfermedad.
• 💰 **Liquidar planillas PILA** y calcular comisiones y bolsa de retorno SST.
• 📊 **Consultar consolidados y estadísticas** de la agencia.
• 📎 **Analizar archivos adjuntos:** Puedes subir **PDFs (planillas, FURATs), Excel (nóminas), Word o imágenes** para extraer sus datos y procesarlos automáticamente.

¿Qué tarea deseas que ejecute hoy?`,
      timestamp: 'Ahora',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // File reading helper functions
  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as ArrayBuffer);
      reader.onerror = rej;
      reader.readAsArrayBuffer(file);
    });

  const readFileAsBinary = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsBinaryString(file);
    });

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsText(file);
    });

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `file-${Date.now()}-${i}`;

      try {
        if (file.type.startsWith('image/')) {
          const base64 = await readFileAsDataURL(file);
          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            base64,
            previewUrl: base64,
          });
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const base64 = await readFileAsDataURL(file);
          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: 'application/pdf',
            base64,
          });
        } else if (
          file.name.toLowerCase().endsWith('.xlsx') ||
          file.name.toLowerCase().endsWith('.xls') ||
          file.name.toLowerCase().endsWith('.csv')
        ) {
          const buffer = await readFileAsArrayBuffer(file);
          const workbook = XLSX.read(buffer, { type: 'array' });
          let combinedCsv = '';
          workbook.SheetNames.slice(0, 3).forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            combinedCsv += `--- HOJA: ${sheetName} ---\n${csv}\n`;
          });
          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            textContent: combinedCsv.slice(0, 40000),
          });
        } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
          const raw = await readFileAsBinary(file);
          const matches = raw.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          const extracted = matches
            ? matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ')
            : file.name;
          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            textContent: extracted.slice(0, 40000),
          });
        } else {
          const text = await readFileAsText(file);
          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            textContent: text.slice(0, 40000),
          });
        }
      } catch (fileErr) {
        console.warn(`Error procesando archivo ${file.name}:`, fileErr);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
  };

  // WhatsApp Automation State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [templateType, setTemplateType] = useState<WhatsAppMessage['messageType']>('RECORDATORIO_PILA');
  const [customMessage, setCustomMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const loadAllData = () => {
    const cls = getStoredClients();
    setClients(cls);
    setLeads(getStoredLeads());
    setFieldVisits(getStoredFieldVisits());
    setMedicalRecords(getStoredMedicalRecords());
    setPilaRecords(getStoredPilaRecords());
    setMessages(getStoredWhatsAppMessages());

    const keys = getStoredGeminiKeys();
    setGeminiKeys(keys);
    setKeyPool(extractKeyPool(keys));

    const savedModel = localStorage.getItem('praxis_selected_model_v1');
    if (savedModel && LIBRECHAT_WAPPY_MODELS.includes(savedModel)) {
      setSelectedModel(savedModel);
    }

    if (cls.length > 0 && !selectedClientId) {
      setSelectedClientId(cls[0].id);
      updateTemplatePreview(cls[0], 'RECORDATORIO_PILA');
    }
  };

  useEffect(() => {
    loadAllData();

    const handleSync = () => loadAllData();
    window.addEventListener('praxis_data_synced', handleSync);
    window.addEventListener('praxis_profile_updated', handleSync);

    return () => {
      window.removeEventListener('praxis_data_synced', handleSync);
      window.removeEventListener('praxis_profile_updated', handleSync);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const openProfileKeysModal = () => {
    window.dispatchEvent(new CustomEvent('praxis_open_profile', { detail: { tab: 'AI_KEYS' } }));
  };

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

  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isTyping) return;

    const filesToSend = [...attachedFiles];
    setAttachedFiles([]);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'USER',
      text: textToSend || `📎 Se adjuntaron ${filesToSend.length} archivo(s) para procesamiento.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: filesToSend,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    const currentContext = {
      clients: getStoredClients(),
      leads: getStoredLeads(),
      visits: getStoredFieldVisits(),
      medicalRecords: getStoredMedicalRecords(),
      pilaRecords: getStoredPilaRecords(),
    };

    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend || 'Analiza y procesa los documentos o imágenes adjuntas en la plataforma según la normatividad.',
          history: chatMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          customKeys: getStoredGeminiKeys(),
          preferredModel: selectedModel,
          attachments: filesToSend,
          currentContext,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al comunicarse con el Agente PRAXIS IA');
      }

      // Si el agente ejecutó una herramienta de mutación en la plataforma, aplicarla al almacenamiento
      if (result.actionExecuted && result.actionExecuted.data) {
        const action: ToolExecutionResult = result.actionExecuted;
        
        if (action.entityType === 'CLIENT') {
          const updated = [action.data, ...getStoredClients().filter((c) => c.id !== action.data.id)];
          saveStoredClients(updated);
          setClients(updated);
        } else if (action.entityType === 'LEAD') {
          const updated = [action.data, ...getStoredLeads().filter((l) => l.id !== action.data.id)];
          saveStoredLeads(updated);
          setLeads(updated);
        } else if (action.entityType === 'VISIT') {
          const updated = [action.data, ...getStoredFieldVisits().filter((v) => v.id !== action.data.id)];
          saveStoredFieldVisits(updated);
          setFieldVisits(updated);
        } else if (action.entityType === 'MEDICAL') {
          const updated = [action.data, ...getStoredMedicalRecords().filter((m) => m.id !== action.data.id)];
          saveStoredMedicalRecords(updated);
          setMedicalRecords(updated);
        } else if (action.entityType === 'PILA') {
          const updated = [action.data, ...getStoredPilaRecords().filter((p) => p.id !== action.data.id)];
          saveStoredPilaRecords(updated);
          setPilaRecords(updated);
        }

        // Emitir evento global de sincronización para que otras pantallas (Dashboard, Clientes, etc.) se actualicen
        window.dispatchEvent(new Event('praxis_data_synced'));
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'AI',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: result.actionExecuted || undefined,
        modelUsed: result.modelUsed,
        rotationsPerformed: result.rotationsPerformed,
        isFallback: result.isFallback,
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'AI',
        text: `⚠️ **Error en procesamiento:** ${err.message || 'No fue posible completar la solicitud.'}\n\nPuedes configurar o renovar tus claves API de Gemini en el menú de **Perfil ➔ Claves de IA**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 flex items-center gap-1">
              <Bot size={12} /> AGENTE AUTÓNOMO PRAXIS
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Rotación Dual-Axis Gemini (LibreChat Engine) & Ejecución en Vivo
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            PRAXIS IA & Automatización Operativa
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Instruye al agente para crear empresas, agendar visitas SST, radicar accidentes FURAT o liquidar planillas PILA.
          </p>
        </div>

        {/* Tab Buttons & Key Pool Pill */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          {/* Modelo Exclusivo LibreChat: gemini-3.5-flash-lite */}
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-500/30 text-xs flex items-center gap-1.5 shadow-sm text-blue-800 dark:text-blue-300 font-bold">
            <Sparkles size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-[10px] text-blue-500 dark:text-blue-400 uppercase hidden sm:inline">Modelo:</span>
            <span className="font-mono text-[11px]">gemini-3.5-flash-lite</span>
          </div>

          {/* Key Pool Pill */}
          <div
            onClick={openProfileKeysModal}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all hover:scale-[1.02] shadow-sm ${
              keyPool.length > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}
            title="Haz clic para configurar el pool de claves API de Gemini"
          >
            <div className={`h-2 w-2 rounded-full ${keyPool.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div className="text-[11px]">
              <span className="font-bold">Pool Gemini:</span>{' '}
              {keyPool.length > 0 ? (
                <span>
                  <strong>{keyPool.length}</strong> {keyPool.length === 1 ? 'clave activa' : 'claves activas'}
                </span>
              ) : (
                <span>Sin claves configuradas</span>
              )}
            </div>
            <Key size={12} className="opacity-70" />
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('ASSISTANT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ASSISTANT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot size={13} /> Consola del Agente
            </button>
            <button
              onClick={() => setActiveTab('WHATSAPP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'WHATSAPP'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare size={13} /> WhatsApp CRM
            </button>
          </div>
        </div>
      </div>

      {sendSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{sendSuccess}</span>
        </div>
      )}

      {/* TAB 1: AUTONOMOUS AI AGENT */}
      {activeTab === 'ASSISTANT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Stream (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] justify-between shadow-sm">
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
                          : 'bg-slate-800 text-white shadow-sm'
                      }`}
                    >
                      {msg.sender === 'AI' ? <Bot size={16} /> : 'FB'}
                    </div>

                    <div
                      className={`p-4 rounded-2xl max-w-[88%] text-xs leading-relaxed ${
                        msg.sender === 'AI'
                          ? 'bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {/* Archivos adjuntos enviados por el usuario */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/20">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-blue-700/60 border border-blue-400/40 text-[11px] font-mono"
                            >
                              {att.previewUrl ? (
                                <img src={att.previewUrl} alt={att.name} className="h-6 w-6 rounded object-cover" />
                              ) : att.name.toLowerCase().endsWith('.pdf') ? (
                                <FileText size={13} className="text-red-200" />
                              ) : att.name.toLowerCase().endsWith('.xlsx') || att.name.toLowerCase().endsWith('.xls') || att.name.toLowerCase().endsWith('.csv') ? (
                                <FileSpreadsheet size={13} className="text-emerald-200" />
                              ) : (
                                <FileText size={13} className="text-blue-200" />
                              )}
                              <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                              <span className="text-[9px] opacity-70">({(att.size / 1024).toFixed(0)}KB)</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Tarjeta Visual de Acción Ejecutada en la Plataforma */}
                      {msg.actionExecuted && (
                        <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400/40 dark:border-emerald-500/40 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                Tarea Ejecutada: {msg.actionExecuted.action}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              ✓ Plataforma Actualizada
                            </span>
                          </div>

                          {/* Metadatos específicos de la entidad creada */}
                          {msg.actionExecuted.entityType === 'CLIENT' && msg.actionExecuted.data && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div><span className="text-slate-400">Razón Social:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.name}</strong></div>
                              <div><span className="text-slate-400">NIT:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.nit}</strong></div>
                              <div><span className="text-slate-400">ARL:</span> <strong className="text-slate-800 dark:text-slate-200 block uppercase">{msg.actionExecuted.data.primaryArlId}</strong></div>
                              <div><span className="text-slate-400">Trabajadores:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.employeeCount}</strong></div>
                            </div>
                          )}

                          {msg.actionExecuted.entityType === 'VISIT' && msg.actionExecuted.data && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div><span className="text-slate-400">Empresa:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.clientName}</strong></div>
                              <div><span className="text-slate-400">Fecha:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.visitDate}</strong></div>
                              <div><span className="text-slate-400">Tipo:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.visitType}</strong></div>
                              <div><span className="text-slate-400">Horas:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.hoursSpent} hrs</strong></div>
                            </div>
                          )}

                          {msg.actionExecuted.entityType === 'MEDICAL' && msg.actionExecuted.data && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div><span className="text-slate-400">Trabajador:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.employeeName}</strong></div>
                              <div><span className="text-slate-400">Evento:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.incidentType}</strong></div>
                              <div><span className="text-slate-400">Incapacidad:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.daysLost} días</strong></div>
                              <div><span className="text-slate-400">Radicado:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.furatFurepCode}</strong></div>
                            </div>
                          )}

                          {msg.actionExecuted.entityType === 'PILA' && msg.actionExecuted.data && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div><span className="text-slate-400">Empresa:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.clientName}</strong></div>
                              <div><span className="text-slate-400">Periodo:</span> <strong className="text-slate-800 dark:text-slate-200 block">{msg.actionExecuted.data.period}</strong></div>
                              <div><span className="text-slate-400">IBC Nómina:</span> <strong className="text-slate-800 dark:text-slate-200 block">${(msg.actionExecuted.data.totalIbc || 0).toLocaleString('es-CO')} COP</strong></div>
                              <div><span className="text-slate-400">Bolsa Retorno:</span> <strong className="text-emerald-600 dark:text-emerald-400 block">${(msg.actionExecuted.data.retornoValor || 0).toLocaleString('es-CO')} COP</strong></div>
                            </div>
                          )}

                          {msg.actionExecuted.redirectUrl && (
                            <div className="pt-1 flex justify-end">
                              <Link
                                href={msg.actionExecuted.redirectUrl}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Ver registro completo en el módulo <ExternalLink size={11} />
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadatos de la respuesta (Modelo, Rotación) */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 text-[9px] font-mono">
                        <span className={msg.sender === 'AI' ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200'}>
                          {msg.timestamp}
                        </span>
                        {msg.modelUsed && (
                          <span className="text-slate-400 dark:text-slate-500">
                            Modelo: {msg.modelUsed} {msg.rotationsPerformed ? `(rotación x${msg.rotationsPerformed})` : ''}
                          </span>
                        )}
                        {msg.isFallback && (
                          <span className="text-amber-500 font-sans font-bold">
                            (Procesamiento Autónomo Local)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 pl-2 animate-pulse">
                    <Sparkles size={15} className="animate-spin text-blue-500" />
                    <span>PRAXIS IA analizando solicitud y ejecutando herramientas en plataforma...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Contenedor de Archivos Adjuntos (Estilo LibreChat) */}
              {attachedFiles.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-50 dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 shrink-0">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shrink-0 shadow-sm"
                    >
                      {file.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.previewUrl} alt={file.name} className="h-8 w-8 rounded-lg object-cover" />
                      ) : file.name.toLowerCase().endsWith('.pdf') ? (
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[9px] border border-red-500/20">
                          PDF
                        </div>
                      ) : file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv') ? (
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[9px] border border-emerald-500/20">
                          XLS
                        </div>
                      ) : file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? (
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[9px] border border-blue-500/20">
                          DOC
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[9px] border border-slate-500/20">
                          TXT
                        </div>
                      )}
                      <div className="flex flex-col max-w-[140px]">
                        <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Eliminar archivo"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className={`pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 transition-all ${
                  isDragging ? 'p-2 ring-2 ring-blue-500 rounded-xl bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                {/* Botón Adjuntar Archivo (LibreChat Style) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shadow-sm shrink-0"
                  title="Adjuntar Imágenes, PDFs, Excel (.xlsx/.xls) o Word (.docx)"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,text/plain"
                  className="hidden"
                />

                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                  placeholder={
                    attachedFiles.length > 0
                      ? 'Escribe instrucciones para los archivos adjuntos (o presiona Enter)...'
                      : 'Instruye al agente o adjunta documentos (PDF, Excel, Word, imágenes)...'
                  }
                  disabled={isTyping}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSendPrompt()}
                  disabled={isTyping || (!inputPrompt.trim() && attachedFiles.length === 0)}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                  title="Enviar instrucción"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions & Model Architecture (Right Column) */}
          <div className="space-y-4">
            {/* Quick Prompt Cards */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" /> Tareas Autónomas de Ejemplo
              </h3>

              <div className="space-y-2 text-left">
                <button
                  onClick={() => handleSendPrompt('Crear cliente Distribuciones del Caribe SAS con NIT 901.888.777-1 en ARL Sura riesgo 3 con 18 trabajadores e IBC de 42 millones en Barranquilla')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] mb-0.5">
                    <Building2 size={13} /> Crear Empresa Afiliada
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "Crear cliente Distribuciones del Caribe SAS con NIT 901.888.777-1 en ARL Sura..."
                  </p>
                </button>

                <button
                  onClick={() => handleSendPrompt('Programar visita técnica de auditoría de estándares mínimos 0312 para Transportes Andinos el 22 de septiembre a las 9:00 AM')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-0.5">
                    <HardHat size={13} /> Programar Auditoría SST
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "Programar visita técnica de auditoría de estándares mínimos 0312 para Transportes Andinos..."
                  </p>
                </button>

                <button
                  onClick={() => handleSendPrompt('Registrar accidente de trabajo con FURAT para el trabajador Carlos Gómez en Constructora Bolívar por contusión en rodilla izquierda con 4 días de incapacidad')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mb-0.5">
                    <Stethoscope size={13} /> Radicar Accidente FURAT
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "Registrar accidente de trabajo con FURAT para Carlos Gómez en Constructora Bolívar..."
                  </p>
                </button>

                <button
                  onClick={() => handleSendPrompt('Liquidar planilla PILA para Logística del Norte periodo actual con nómina de 55 millones')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] mb-0.5">
                    <Calculator size={13} /> Liquidar Planilla PILA
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "Liquidar planilla PILA para Logística del Norte periodo actual con nómina de 55 millones..."
                  </p>
                </button>

                <button
                  onClick={() => handleSendPrompt('¿Cuál es el resumen de clientes, distribución por ARL y visitas programadas en la plataforma?')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-[11px] mb-0.5">
                    <Layers size={13} /> Resumen Ejecutivo Plataforma
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "¿Cuál es el resumen de clientes, distribución por ARL y visitas programadas...?"
                  </p>
                </button>

                <button
                  onClick={() => handleSendPrompt('¿Por qué las comisiones de ARL no tienen IVA según la Sentencia C-049 de 2022 y el Estatuto Tributario?')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] mb-0.5">
                    <Shield size={13} /> Exclusión Legal de IVA (C-049/2022)
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    "¿Por qué las comisiones de ARL no tienen IVA según la Sentencia C-049 de 2022...?"
                  </p>
                </button>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <RotateCcw size={13} /> Arquitectura LibreChat
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Dual-Axis
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Rotación de pool horizontal ante <strong>429 / 403</strong> (cuotas) y degradación vertical ante <strong>503</strong> (gemini-2.5-flash ➔ 2.0-flash ➔ 1.5-flash ➔ 1.5-pro).
              </p>
              <button
                onClick={openProfileKeysModal}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Key size={13} /> Administrar Claves en Perfil
              </button>
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

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
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
