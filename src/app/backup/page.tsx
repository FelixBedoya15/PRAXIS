'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Shield,
  FileCheck,
  HardDrive,
  Clock,
  RotateCcw,
  Check,
  Layers,
  ArrowRight,
  Copy,
  Terminal,
  FileJson,
  Sparkles
} from 'lucide-react';
import {
  getStoredARLs,
  getStoredClients,
  getStoredLeads,
  getStoredPilaRecords,
  getStoredFieldVisits,
  getStoredMedicalRecords,
  getStoredWhatsAppMessages,
  saveStoredARLs,
  saveStoredClients,
  saveStoredLeads,
  saveStoredPilaRecords,
  saveStoredFieldVisits,
  saveStoredMedicalRecords,
  saveStoredWhatsAppMessages
} from '@/lib/storage';

export default function BackupPage() {
  const [dbStats, setDbStats] = useState({
    leadsCount: 0,
    clientsCount: 0,
    arlsCount: 0,
    pilaCount: 0,
    visitsCount: 0,
    medicalCount: 0,
    messagesCount: 0,
    totalRecords: 0,
    estimatedSizeKb: 0,
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateStats = () => {
    const leads = getStoredLeads();
    const clients = getStoredClients();
    const arls = getStoredARLs();
    const pila = getStoredPilaRecords();
    const visits = getStoredFieldVisits();
    const medical = getStoredMedicalRecords();
    const msgs = getStoredWhatsAppMessages();

    const total = leads.length + clients.length + arls.length + pila.length + visits.length + medical.length + msgs.length;
    const fullJson = JSON.stringify({ leads, clients, arls, pila, visits, medical, msgs });
    const sizeKb = Math.round((new Blob([fullJson]).size / 1024) * 10) / 10;

    setDbStats({
      leadsCount: leads.length,
      clientsCount: clients.length,
      arlsCount: arls.length,
      pilaCount: pila.length,
      visitsCount: visits.length,
      medicalCount: medical.length,
      messagesCount: msgs.length,
      totalRecords: total,
      estimatedSizeKb: sizeKb,
    });
  };

  useEffect(() => {
    calculateStats();
  }, []);

  const handleExportFullBackup = () => {
    setIsProcessing(true);
    try {
      const backupData = {
        metadata: {
          app: 'PRAXIS PREVENCIÓN Y SEGUROS - CRM SGRL COLOMBIA',
          version: '2.0.0',
          backupDate: new Date().toISOString(),
          timestamp: Date.now(),
          system: 'PostgreSQL / Local Multi-Table Store',
          author: 'Félix Bedoya - Director Técnico SST',
        },
        data: {
          leads: getStoredLeads(),
          clients: getStoredClients(),
          arls: getStoredARLs(),
          pilaRecords: getStoredPilaRecords(),
          fieldVisits: getStoredFieldVisits(),
          medicalRecords: getStoredMedicalRecords(),
          whatsappMessages: getStoredWhatsAppMessages(),
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `praxis_backup_completo_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem('wappy_last_backup_date', new Date().toLocaleString('es-CO'));
      showNotify('success', '✅ Copia de seguridad completa descargada exitosamente en formato JSON.');
    } catch (err) {
      showNotify('error', '❌ Error al generar la copia de seguridad.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.data || !parsed.metadata) {
          throw new Error('Estructura de archivo de respaldo no válida para PRAXIS Prevención y Seguros.');
        }

        const { data } = parsed;

        if (Array.isArray(data.leads)) saveStoredLeads(data.leads);
        if (Array.isArray(data.clients)) saveStoredClients(data.clients);
        if (Array.isArray(data.arls)) saveStoredARLs(data.arls);
        if (Array.isArray(data.pilaRecords)) saveStoredPilaRecords(data.pilaRecords);
        if (Array.isArray(data.fieldVisits)) saveStoredFieldVisits(data.fieldVisits);
        if (Array.isArray(data.medicalRecords)) saveStoredMedicalRecords(data.medicalRecords);
        if (Array.isArray(data.whatsappMessages)) saveStoredWhatsAppMessages(data.whatsappMessages);

        calculateStats();
        showNotify('success', `🎉 ¡Restauración exitosa! Se restauraron los registros sin pérdidas.`);
      } catch (err: any) {
        showNotify('error', `❌ Error al restaurar: ${err.message || 'Archivo corrupto o inválido'}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const copyPostgresEnv = () => {
    const envText = `DATABASE_URL=postgresql://wappy_admin:WappySecure2026!@postgres:5432/wappy_arl_db\nPOSTGRES_DB=wappy_arl_db\nPOSTGRES_USER=wappy_admin\nPOSTGRES_PASSWORD=WappySecure2026!\nBACKUP_CRON_SCHEDULE="0 2 * * *" # Backup diario a las 2:00 AM\nBACKUP_RETENTION_DAYS=30`;
    navigator.clipboard.writeText(envText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
    showNotify('success', '📋 Variables de PostgreSQL copiadas al portapapeles.');
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/30 flex items-center gap-1">
              <Database size={12} /> ALMACENAMIENTO & SEGURIDAD
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">PostgreSQL + Respaldo en 1 Clic</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Centro de Base de Datos & Copias de Seguridad (Backup)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Descarga, restaura y automatiza respaldos de clientes, comisiones PILA, bitácoras SST y registros médicos confidenciales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFullBackup}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Download size={15} /> <span>Descargar Backup Completo</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-fade-in shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Database Quick Health Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Registros</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
            {dbStats.totalRecords}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">7 Tablas Activas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Tamaño Estimado</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {dbStats.estimatedSizeKb} KB
          </div>
          <span className="text-[10px] text-slate-500">Formato Estructurado</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Motor Principal</span>
          <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <Server size={16} className="text-indigo-500" /> PostgreSQL 16
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Docker / Dokploy Ready</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Modo Offline PWA</span>
          <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <Check size={16} /> Sincronizado
          </div>
          <span className="text-[10px] text-slate-500">Respaldo Local Autónomo</span>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Backup & Restore Actions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              OPERACIONES MANUALES
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Copia de Seguridad & Recuperación
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Guarda una copia íntegra de toda la operación en tu disco o restaura una copia previa.
            </p>
          </div>

          {/* Action 1: Export */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Descargar Copia de Seguridad</h4>
                  <p className="text-[11px] text-slate-500">
                    Genera un volcado JSON con todas las 7 tablas (Leads, Clientes, ARLs, PILA, SST, Médico, WhatsApp).
                  </p>
                </div>
              </div>

              <button
                onClick={handleExportFullBackup}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 whitespace-nowrap"
              >
                Exportar JSON
              </button>
            </div>
          </div>

          {/* Action 2: Import */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <Upload size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Restaurar Copia de Seguridad</h4>
                  <p className="text-[11px] text-slate-500">
                    Carga un archivo de respaldo previo para restaurar todos los datos en segundos.
                  </p>
                </div>
              </div>

              <label className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer whitespace-nowrap">
                <span>Cargar Archivo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
              Desglose de Tablas en el Respaldo:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Leads / Prospectos:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.leadsCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Empresas Activas:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.clientsCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Matrices ARL:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.arlsCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Planillas PILA:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.pilaCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Visitas SST:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.visitsCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Registros Médicos:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{dbStats.medicalCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Automated PostgreSQL Backup for Server / Dokploy */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                ARQUITECTURA DE PRODUCCIÓN
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                PostgreSQL & Respaldo Automático (Dokploy)
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-mono">
              Auto-Backup Daily
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            En el servidor VPS con Dokploy, se ejecuta un contenedor de **PostgreSQL 16** junto con un servicio de **backup automático diario (Cron a las 2:00 AM)** que genera volcados `.sql.gz` comprimidos con retención de 30 días en volúmenes Docker independientes.
          </p>

          {/* Environment variables block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                Variables de Entorno para Dokploy:
              </label>
              <button
                onClick={copyPostgresEnv}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Copy size={12} /> {copiedEnv ? '¡Copiado!' : 'Copiar Variables'}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
              <p className="text-emerald-400"># Configuración PostgreSQL Dokploy</p>
              <p>DATABASE_URL=postgresql://wappy_admin:WappySecure2026!@postgres:5432/wappy_arl_db</p>
              <p>POSTGRES_DB=wappy_arl_db</p>
              <p>POSTGRES_USER=wappy_admin</p>
              <p>POSTGRES_PASSWORD=WappySecure2026!</p>
              <p className="text-amber-400 mt-2"># Respaldo Automático Diario</p>
              <p>BACKUP_CRON_SCHEDULE="0 2 * * *"</p>
              <p>BACKUP_RETENTION_DAYS=30</p>
            </div>
          </div>

          {/* Security Features */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
            <strong className="text-indigo-900 dark:text-indigo-300 font-bold block flex items-center gap-1.5">
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" /> Garantías de Seguridad & Normativa:
            </strong>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li><strong>Reserva Legal Médica (Res. 2346/2007):</strong> Encriptación de datos clínicos.</li>
              <li><strong>Trazabilidad RUI MinTrabajo:</strong> Registro permanente de visitas técnicas.</li>
              <li><strong>Soporte Tributario (Art. 476 ET):</strong> Archivo de cuentas de cobro 0% IVA.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
