import { ARLCompany, ClientCompany, PilaRecord, FieldVisit, MedicalRecord, RUIIntermediaryProfile, WhatsAppMessage, UserProfile, AgencyProfile, LeadProspect } from '../types';
import { INITIAL_ARLS, INITIAL_CLIENTS, INITIAL_PILA_RECORDS, INITIAL_FIELD_VISITS, INITIAL_MEDICAL_RECORDS, INITIAL_RUI_PROFILE, INITIAL_WHATSAPP_MESSAGES, INITIAL_AGENCY_PROFILE, INITIAL_USER_PROFILES, INITIAL_LEADS } from './data';

export const STORAGE_KEYS = {
  ARLS: 'wappy_arl_companies_v2',
  CLIENTS: 'wappy_clients_v2',
  PILA_RECORDS: 'wappy_pila_records_v2',
  FIELD_VISITS: 'wappy_field_visits_v3',
  MEDICAL_RECORDS: 'wappy_medical_records_v1',
  RUI_PROFILE: 'wappy_rui_profile_v2',
  WHATSAPP_MESSAGES: 'wappy_whatsapp_messages_v1',
  CURRENT_ROLE: 'wappy_current_role_v1',
  DOCTOR_PIN: 'wappy_doctor_pin_v1',
  AGENCY_PROFILE: 'wappy_agency_profile_v1',
  USER_PROFILES: 'wappy_user_profiles_v1',
  ACTIVE_USER_ID: 'wappy_active_user_id_v1',
  LEADS: 'wappy_leads_v1',
};

// Envía cambios a la base de datos PostgreSQL en segundo plano
async function pushToServer(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
    });
  } catch (err) {
    console.warn(`[Offline/Sync] Could not push ${key} to PostgreSQL:`, err);
  }
}

// Sincroniza desde PostgreSQL hacia el cliente
export async function syncFromServer(): Promise<{ connected: boolean; synced: boolean }> {
  if (typeof window === 'undefined') return { connected: false, synced: false };
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const json = await res.json();
    if (!json.connected) {
      return { connected: false, synced: false };
    }

    const serverData = json.data || {};
    const serverKeys = Object.keys(serverData);

    // Si la base de datos está vacía (recién creada), inicializarla con los datos actuales
    if (serverKeys.length === 0) {
      const initialBatch = {
        [STORAGE_KEYS.ARLS]: getStoredARLs(),
        [STORAGE_KEYS.CLIENTS]: getStoredClients(),
        [STORAGE_KEYS.PILA_RECORDS]: getStoredPilaRecords(),
        [STORAGE_KEYS.FIELD_VISITS]: getStoredFieldVisits(),
        [STORAGE_KEYS.MEDICAL_RECORDS]: getStoredMedicalRecords(),
        [STORAGE_KEYS.RUI_PROFILE]: getStoredRUIProfile(),
        [STORAGE_KEYS.WHATSAPP_MESSAGES]: getStoredWhatsAppMessages(),
        [STORAGE_KEYS.AGENCY_PROFILE]: getStoredAgencyProfile(),
        [STORAGE_KEYS.USER_PROFILES]: getStoredUserProfiles(),
        [STORAGE_KEYS.ACTIVE_USER_ID]: getStoredActiveUserId(),
        [STORAGE_KEYS.LEADS]: getStoredLeads(),
      };
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: initialBatch }),
      });
      return { connected: true, synced: true };
    }

    // Si la base de datos tiene datos, actualizar el almacenamiento local
    let hasChanges = false;
    for (const [key, val] of Object.entries(serverData)) {
      const existing = localStorage.getItem(key);
      const stringified = JSON.stringify(val);
      if (existing !== stringified) {
        localStorage.setItem(key, stringified);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      window.dispatchEvent(new CustomEvent('praxis_data_synced'));
      window.dispatchEvent(new CustomEvent('praxis_profile_updated'));
    }

    return { connected: true, synced: true };
  } catch (err) {
    console.warn('[Sync] Sync failed:', err);
    return { connected: false, synced: false };
  }
}

export const getStoredARLs = (): ARLCompany[] => {
  if (typeof window === 'undefined') return INITIAL_ARLS;
  localStorage.removeItem('wappy_arl_companies_v1');
  localStorage.removeItem('wappy_rui_profile_v1');
  const stored = localStorage.getItem(STORAGE_KEYS.ARLS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(INITIAL_ARLS));
    return INITIAL_ARLS;
  }
  try {
    const parsed: ARLCompany[] = JSON.parse(stored);
    const legacyExcluded = new Set(['la_equidad', 'mapfre', 'alfa', 'chubb']);
    const cleaned = parsed
      .filter((a) => !legacyExcluded.has(a.id))
      .map((a) => {
        const init = INITIAL_ARLS.find((initItem) => initItem.id === a.id);
        return {
          ...a,
          economicActivityCommissions:
            a.economicActivityCommissions && a.economicActivityCommissions.length > 0
              ? a.economicActivityCommissions
              : init?.economicActivityCommissions || [],
        };
      });
    if (cleaned.length === 0) {
      localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(INITIAL_ARLS));
      return INITIAL_ARLS;
    }
    localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(cleaned));
    return cleaned;
  } catch (e) {
    return INITIAL_ARLS;
  }
};

export const saveStoredARLs = (arls: ARLCompany[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(arls));
    pushToServer(STORAGE_KEYS.ARLS, arls);
  }
};

export const getStoredClients = (): ClientCompany[] => {
  if (typeof window === 'undefined') return INITIAL_CLIENTS;
  localStorage.removeItem('wappy_clients_v1');
  const stored = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    return INITIAL_CLIENTS;
  }
  try {
    const list: ClientCompany[] = JSON.parse(stored);
    return list.map((c) => {
      const init = INITIAL_CLIENTS.find((i) => i.id === c.id);
      return {
        ...c,
        returnPercentage: c.returnPercentage ?? 25,
        standardsCount:
          c.standardsCount ||
          init?.standardsCount ||
          (c.employeeCount > 50 || c.riskClass === 'CLASE_IV' || c.riskClass === 'CLASE_V'
            ? 60
            : c.employeeCount >= 11
            ? 21
            : 7),
        standardsScore: c.standardsScore ?? init?.standardsScore,
        standardsRating: c.standardsRating || init?.standardsRating,
        lastStandardsAuditDate: c.lastStandardsAuditDate || init?.lastStandardsAuditDate,
        standardsEvaluations: c.standardsEvaluations || init?.standardsEvaluations,
      };
    });
  } catch (e) {
    return INITIAL_CLIENTS;
  }
};

export const saveStoredClients = (clients: ClientCompany[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    pushToServer(STORAGE_KEYS.CLIENTS, clients);
  }
};

export const getStoredPilaRecords = (): PilaRecord[] => {
  if (typeof window === 'undefined') return INITIAL_PILA_RECORDS;
  localStorage.removeItem('wappy_pila_records_v1');
  const stored = localStorage.getItem(STORAGE_KEYS.PILA_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(INITIAL_PILA_RECORDS));
    return INITIAL_PILA_RECORDS;
  }
  try {
    const list: PilaRecord[] = JSON.parse(stored);
    if (list.length <= 5) {
      localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(INITIAL_PILA_RECORDS));
      return INITIAL_PILA_RECORDS;
    }
    return list.map((r) => {
      const gross = r.realPaidCommission || r.expectedCommission;
      const rete = r.retefuenteAmount ?? gross * 0.1;
      const net = r.netCommissionReceived ?? gross - rete;
      const retPct = r.clientReturnPercentage ?? 25;
      const retAmount = r.clientReturnAmount ?? gross * (retPct / 100);
      return {
        ...r,
        retefuenteRate: r.retefuenteRate ?? 0.1,
        retefuenteAmount: rete,
        netCommissionReceived: net,
        clientReturnPercentage: retPct,
        clientReturnAmount: retAmount,
        agencyNetMargin: r.agencyNetMargin ?? net - retAmount,
      };
    });
  } catch (e) {
    return INITIAL_PILA_RECORDS;
  }
};

export const saveStoredPilaRecords = (records: PilaRecord[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(records));
    pushToServer(STORAGE_KEYS.PILA_RECORDS, records);
  }
};

export const getStoredFieldVisits = (): FieldVisit[] => {
  if (typeof window === 'undefined') return INITIAL_FIELD_VISITS;
  localStorage.removeItem('wappy_field_visits_v1');
  localStorage.removeItem('wappy_field_visits_v2');
  const stored = localStorage.getItem(STORAGE_KEYS.FIELD_VISITS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.FIELD_VISITS, JSON.stringify(INITIAL_FIELD_VISITS));
    return INITIAL_FIELD_VISITS;
  }
  try {
    const list: FieldVisit[] = JSON.parse(stored);
    return list.map((v) => ({
      ...v,
      hasCost: v.hasCost ?? false,
      visitCost: v.visitCost ?? 0,
      costNotes:
        v.costNotes ??
        (v.hasCost ? `Valorizado en $${v.visitCost} COP` : 'Cubierto 100% por retorno / intermediación ARL'),
    }));
  } catch (e) {
    return INITIAL_FIELD_VISITS;
  }
};

export const saveStoredFieldVisits = (visits: FieldVisit[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.FIELD_VISITS, JSON.stringify(visits));
    pushToServer(STORAGE_KEYS.FIELD_VISITS, visits);
  }
};

export const getStoredMedicalRecords = (): MedicalRecord[] => {
  if (typeof window === 'undefined') return INITIAL_MEDICAL_RECORDS;
  const stored = localStorage.getItem(STORAGE_KEYS.MEDICAL_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.MEDICAL_RECORDS, JSON.stringify(INITIAL_MEDICAL_RECORDS));
    return INITIAL_MEDICAL_RECORDS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_MEDICAL_RECORDS;
  }
};

export const saveStoredMedicalRecords = (records: MedicalRecord[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.MEDICAL_RECORDS, JSON.stringify(records));
    pushToServer(STORAGE_KEYS.MEDICAL_RECORDS, records);
  }
};

export const getStoredRUIProfile = (): RUIIntermediaryProfile => {
  if (typeof window === 'undefined') return INITIAL_RUI_PROFILE;
  const stored = localStorage.getItem(STORAGE_KEYS.RUI_PROFILE);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.RUI_PROFILE, JSON.stringify(INITIAL_RUI_PROFILE));
    return INITIAL_RUI_PROFILE;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_RUI_PROFILE;
  }
};

export const saveStoredRUIProfile = (profile: RUIIntermediaryProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.RUI_PROFILE, JSON.stringify(profile));
    pushToServer(STORAGE_KEYS.RUI_PROFILE, profile);
  }
};

export const getStoredWhatsAppMessages = (): WhatsAppMessage[] => {
  if (typeof window === 'undefined') return INITIAL_WHATSAPP_MESSAGES;
  const stored = localStorage.getItem(STORAGE_KEYS.WHATSAPP_MESSAGES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(INITIAL_WHATSAPP_MESSAGES));
    return INITIAL_WHATSAPP_MESSAGES;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_WHATSAPP_MESSAGES;
  }
};

export const saveStoredWhatsAppMessages = (messages: WhatsAppMessage[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(messages));
    pushToServer(STORAGE_KEYS.WHATSAPP_MESSAGES, messages);
  }
};

export const getStoredLeads = (): LeadProspect[] => {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    return INITIAL_LEADS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_LEADS;
  }
};

export const saveStoredLeads = (leads: LeadProspect[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    pushToServer(STORAGE_KEYS.LEADS, leads);
  }
};

export const notifyProfileUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('praxis_profile_updated'));
  }
};

export const getStoredAgencyProfile = (): AgencyProfile => {
  if (typeof window === 'undefined') return INITIAL_AGENCY_PROFILE;
  const stored = localStorage.getItem(STORAGE_KEYS.AGENCY_PROFILE);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.AGENCY_PROFILE, JSON.stringify(INITIAL_AGENCY_PROFILE));
    return INITIAL_AGENCY_PROFILE;
  }
  try {
    const parsed = JSON.parse(stored);
    return { ...INITIAL_AGENCY_PROFILE, ...parsed };
  } catch (e) {
    return INITIAL_AGENCY_PROFILE;
  }
};

export const saveStoredAgencyProfile = (profile: AgencyProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AGENCY_PROFILE, JSON.stringify(profile));
    notifyProfileUpdated();
    pushToServer(STORAGE_KEYS.AGENCY_PROFILE, profile);
  }
};

export const getStoredUserProfiles = (): UserProfile[] => {
  if (typeof window === 'undefined') return INITIAL_USER_PROFILES;
  const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(INITIAL_USER_PROFILES));
    return INITIAL_USER_PROFILES;
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_USER_PROFILES;
  } catch (e) {
    return INITIAL_USER_PROFILES;
  }
};

export const saveStoredUserProfiles = (profiles: UserProfile[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
    notifyProfileUpdated();
    pushToServer(STORAGE_KEYS.USER_PROFILES, profiles);
  }
};

export const getStoredActiveUserId = (): string => {
  if (typeof window === 'undefined') return INITIAL_USER_PROFILES[0].id;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || INITIAL_USER_PROFILES[0].id;
};

export const saveStoredActiveUserId = (id: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
    notifyProfileUpdated();
    pushToServer(STORAGE_KEYS.ACTIVE_USER_ID, id);
  }
};

export const getStoredActiveUserProfile = (): UserProfile => {
  const users = getStoredUserProfiles();
  const activeId = getStoredActiveUserId();
  const found = users.find((u) => u.id === activeId);
  return found || users[0] || INITIAL_USER_PROFILES[0];
};

export const saveStoredActiveUserProfile = (updatedUser: UserProfile) => {
  const users = getStoredUserProfiles();
  const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
  saveStoredUserProfiles(updated);
  saveStoredActiveUserId(updatedUser.id);
};
