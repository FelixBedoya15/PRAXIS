'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Shield,
  Award,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  Users,
  HardHat,
  Stethoscope,
  Scale,
  Building2,
  Clock,
  Sparkles,
  ExternalLink,
  UserCheck,
  FileText,
  Edit3,
  X,
  Save,
  Check
} from 'lucide-react';
import { getStoredRUIProfile, saveStoredRUIProfile, getStoredFieldVisits, getStoredClients, getStoredAgencyProfile } from '@/lib/storage';
import { RUIIntermediaryProfile, FieldVisit, ClientCompany, AgencyProfile } from '@/types';
import { printDocumentById } from '@/lib/printUtils';

export default function RUIMinTrabajoPage() {
  const [profile, setProfile] = useState<RUIIntermediaryProfile | null>(null);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form State
  const [agencyName, setAgencyName] = useState('');
  const [nit, setNit] = useState('');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insurancePolicyCompany, setInsurancePolicyCompany] = useState('');
  const [policyExpiryDate, setPolicyExpiryDate] = useState('');
  
  const [technicalEngineerName, setTechnicalEngineerName] = useState('');
  const [technicalEngineerLicense, setTechnicalEngineerLicense] = useState('');
  
  const [technicalDoctorName, setTechnicalDoctorName] = useState('');
  const [technicalDoctorLicense, setTechnicalDoctorLicense] = useState('');
  
  const [legalAdvisorName, setLegalAdvisorName] = useState('');
  const [legalAdvisorCard, setLegalAdvisorCard] = useState('');

  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    const loadedProfile = getStoredRUIProfile();
    setProfile(loadedProfile);
    setFieldVisits(getStoredFieldVisits());
    setClients(getStoredClients());
    setAgencyProfile(getStoredAgencyProfile());

    const handleProfileUpdated = () => {
      setAgencyProfile(getStoredAgencyProfile());
    };
    window.addEventListener('praxis_profile_updated', handleProfileUpdated);

    if (loadedProfile) {
      populateForm(loadedProfile);
    }

    return () => {
      window.removeEventListener('praxis_profile_updated', handleProfileUpdated);
    };
  }, []);

  // Intercept Cmd+P / Ctrl+P to cleanly print the RUI certificate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        printDocumentById('certificado-rui-sheet', 'Certificado RUI MinTrabajo - PRAXIS');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const populateForm = (p: RUIIntermediaryProfile) => {
    setAgencyName(p.agencyName || '');
    setNit(p.nit || '');
    setLegalRepresentative(p.legalRepresentative || '');
    setRegistrationNumber(p.registrationNumber || '');
    setInsurancePolicyNumber(p.insurancePolicyNumber || '');
    setInsurancePolicyCompany(p.insurancePolicyCompany || '');
    setPolicyExpiryDate(p.policyExpiryDate || '');
    setTechnicalEngineerName(p.technicalEngineerName || '');
    setTechnicalEngineerLicense(p.technicalEngineerLicense || '');
    setTechnicalDoctorName(p.technicalDoctorName || '');
    setTechnicalDoctorLicense(p.technicalDoctorLicense || '');
    setLegalAdvisorName(p.legalAdvisorName || '');
    setLegalAdvisorCard(p.legalAdvisorCard || '');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: RUIIntermediaryProfile = {
      agencyName,
      nit,
      legalRepresentative,
      registrationNumber,
      insurancePolicyNumber,
      insurancePolicyCompany,
      policyExpiryDate,
      technicalEngineerName,
      technicalEngineerLicense,
      technicalDoctorName,
      technicalDoctorLicense,
      legalAdvisorName,
      legalAdvisorCard,
      totalCertifiedHours: profile?.totalCertifiedHours || 420.5,
    };

    saveStoredRUIProfile(updatedProfile);
    setProfile(updatedProfile);
    setShowEditModal(false);
    showToast('✅ Información del RUI y Equipo Técnico actualizada correctamente.');
  };

  const showToast = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const totalHours = fieldVisits.reduce((s, v) => s + (v.hoursSpent || 0), 0);

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
              MINISTERIO DEL TRABAJO
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> Acreditación Vigente
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Registro Único de Intermediarios (RUI)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Acreditación de idoneidad profesional, infraestructura humana especializada y bitácora trazable de horas técnicas en prevención para {clients.length} empresas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto no-print">
          <button
            onClick={() => {
              if (profile) populateForm(profile);
              setShowEditModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Edit3 size={14} className="text-blue-600 dark:text-blue-400" /> <span>Editar Información RUI</span>
          </button>

          <button
            onClick={() => printDocumentById('certificado-rui-sheet', 'Certificado RUI MinTrabajo - PRAXIS')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Printer size={15} /> Imprimir Certificado RUI / PDF
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm no-print">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{successBanner}</span>
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
          {/* Left 2 Cols: Official Accreditation Sheet */}
          <div className="lg:col-span-2 space-y-6 print:w-full print:max-w-none">
            <div
              id="certificado-rui-sheet"
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm print:p-0 print:border-none print:shadow-none print:bg-white official-document-sheet"
            >
              {/* Certificate Ribbon */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 print:border-slate-900 pb-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-md shrink-0 print:border-slate-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={agencyProfile?.logoUrl || '/praxis-logo.png'}
                      alt={agencyProfile?.shortName || profile.agencyName || 'PRAXIS'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 print:text-slate-700 uppercase">
                      REPÚBLICA DE COLOMBIA • MINISTERIO DEL TRABAJO
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-slate-900">{profile.agencyName}</h3>
                    <p className="text-xs text-slate-500 print:text-slate-700">
                      NIT: <strong className="font-mono text-slate-700 dark:text-slate-300 print:text-slate-900">{profile.nit}</strong> • Representante: <strong className="text-slate-700 dark:text-slate-300 print:text-slate-900">{profile.legalRepresentative}</strong>
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 print:bg-emerald-50 text-emerald-700 dark:text-emerald-400 print:text-emerald-800 border border-emerald-200 dark:border-emerald-500/20 print:border-emerald-300 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={13} /> Activo & Vigente
                </span>
              </div>

              {/* RUI Registration Specifics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 block">Número de Registro RUI</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 print:text-blue-800 mt-0.5 block truncate">
                    {profile.registrationNumber}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 block">Póliza R.C. Profesional</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 print:text-slate-900 mt-0.5 block truncate">
                    {profile.insurancePolicyCompany}
                  </span>
                  <span className="text-[10px] text-slate-500 print:text-slate-600 font-mono">Póliza: {profile.insurancePolicyNumber} • Vence: {profile.policyExpiryDate}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 block">Horas Técnicas Ejecutadas</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-800 mt-0.5 block">
                    {totalHours} Horas SST
                  </span>
                  <span className="text-[10px] text-slate-500 print:text-slate-600">Trazabilidad en Campo</span>
                </div>
              </div>

              {/* Registered Professional Technical Staff */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-700 flex items-center gap-2">
                    <Users size={14} className="text-blue-500" /> Infraestructura Humana Idónea Registrada
                  </h4>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 no-print cursor-pointer"
                  >
                    <Edit3 size={11} /> Editar Equipo
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Director / Ingeniero SST */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                        <HardHat size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white print:text-slate-900 font-bold">{profile.technicalEngineerName}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 print:bg-emerald-100 text-emerald-700 dark:text-emerald-300 print:text-emerald-800 font-medium">
                            Ingeniería & Higiene SST
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 print:text-slate-600 block mt-0.5">
                          {profile.technicalEngineerLicense}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 print:text-slate-700 self-start sm:self-auto">
                      Director Técnico
                    </span>
                  </div>

                  {/* Médico Especialista */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                        <Stethoscope size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white print:text-slate-900 font-bold">{profile.technicalDoctorName}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 print:bg-rose-100 text-rose-700 dark:text-rose-300 print:text-rose-800 font-medium">
                            Medicina Laboral
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 print:text-slate-600 block mt-0.5">
                          {profile.technicalDoctorLicense}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 print:text-slate-700 self-start sm:self-auto">
                      Especialista Ocupacional
                    </span>
                  </div>

                  {/* Asesor Jurídico */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 print:border-slate-300 print:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <Scale size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white print:text-slate-900 font-bold">{profile.legalAdvisorName}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 print:bg-indigo-100 text-indigo-700 dark:text-indigo-300 print:text-indigo-800 font-medium">
                            Derecho Laboral & Seguridad Social
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 print:text-slate-600 block mt-0.5">
                          {profile.legalAdvisorCard}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 print:text-slate-700 self-start sm:self-auto">
                      Asesor Jurídico
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Framework Reference */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 print:border-slate-300 print:bg-white text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-700 space-y-1 leading-relaxed">
                <strong className="text-blue-600 dark:text-blue-300 print:text-slate-900 block">Sustento Normativo de Idoneidad:</strong>
                En conformidad con el Decreto 1072 de 2015 (Libro 2, Parte 2, Título 4, Capítulo 2) y la Resolución 3544 del MinSalud, la intermediación de seguros en el ramo de riesgos laborales requiere acreditación formal de infraestructura técnica y reporte obligatorio de actividades de promoción y prevención.
              </div>

              {/* Dual Signature Block for Official RUI Certification */}
              <div className="pt-6 grid grid-cols-2 gap-8 page-break-inside-avoid">
                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    {profile.legalRepresentative}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Representante Legal
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
                    {profile.agencyName}
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">NIT: {profile.nit}</p>
                </div>

                <div className="border-t-2 border-slate-800 dark:border-slate-400 print:border-slate-900 pt-2 space-y-1">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-slate-900 text-xs">
                    {profile.technicalEngineerName}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                    Director Técnico de Operaciones SST
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
                    {profile.technicalEngineerLicense}
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-500 font-mono">Registro Profesional Validado</p>
                </div>
              </div>

              {/* Pie de Página Oficial RUI */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800 print:border-slate-300 font-sans text-[9px] text-slate-500 flex justify-between items-center">
                <span>Certificado oficial de acreditación de intermediación en Riesgos Laborales expedido bajo Decreto 1072/2015.</span>
                <span>Registro Único de Intermediarios (RUI) Ministerio del Trabajo</span>
              </div>
            </div>
          </div>

          {/* Right Col: Technical Log & Fast Stats */}
          <div className="space-y-6 no-print">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Registro de Actividades RUI
              </h3>

              <div className="space-y-3">
                {fieldVisits.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <strong className="text-slate-900 dark:text-white">{v.clientName}</strong>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{v.hoursSpent} hrs</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">{v.engineerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{v.visitDate} • {v.visitType.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR INFORMACIÓN RUI */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                MINISTERIO DEL TRABAJO • IDONEIDAD TÉCNICA
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Editar Datos de la Agencia & Equipo RUI
              </h3>
              <p className="text-xs text-slate-500">
                Modifica los datos de la agencia intermediaria, registro RUI, póliza de responsabilidad civil y profesionales asignados.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Sección 1: Datos de la Agencia */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Building2 size={14} className="text-blue-500" /> 1. Datos de la Agencia & Registro
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Razón Social de la Agencia</label>
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">NIT de la Agencia</label>
                    <input
                      type="text"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Representante Legal</label>
                    <input
                      type="text"
                      value={legalRepresentative}
                      onChange={(e) => setLegalRepresentative(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Número de Registro RUI MinTrabajo</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Aseguradora Póliza R.C.</label>
                    <input
                      type="text"
                      value={insurancePolicyCompany}
                      onChange={(e) => setInsurancePolicyCompany(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">N° de Póliza R.C.</label>
                    <input
                      type="text"
                      value={insurancePolicyNumber}
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Fecha Vencimiento Póliza</label>
                    <input
                      type="date"
                      value={policyExpiryDate}
                      onChange={(e) => setPolicyExpiryDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Equipo Profesional */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Users size={14} className="text-emerald-500" /> 2. Infraestructura Humana Idónea Registrada
                </h4>

                {/* Ingeniero */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40">
                  <div>
                    <label className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">Director / Ingeniero SST</label>
                    <input
                      type="text"
                      value={technicalEngineerName}
                      onChange={(e) => setTechnicalEngineerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Licencia SST / Matrícula Profesional</label>
                    <input
                      type="text"
                      value={technicalEngineerLicense}
                      onChange={(e) => setTechnicalEngineerLicense(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Médico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40">
                  <div>
                    <label className="text-rose-600 dark:text-rose-400 font-bold block mb-1">Médico Especialista en SST</label>
                    <input
                      type="text"
                      value={technicalDoctorName}
                      onChange={(e) => setTechnicalDoctorName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Licencia SST / Registro Médico</label>
                    <input
                      type="text"
                      value={technicalDoctorLicense}
                      onChange={(e) => setTechnicalDoctorLicense(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Asesor Jurídico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40">
                  <div>
                    <label className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Asesor Jurídico Laboral</label>
                    <input
                      type="text"
                      value={legalAdvisorName}
                      onChange={(e) => setLegalAdvisorName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Tarjeta Profesional C.S.J.</label>
                    <input
                      type="text"
                      value={legalAdvisorCard}
                      onChange={(e) => setLegalAdvisorCard(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Save size={14} /> Guardar Cambios RUI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
