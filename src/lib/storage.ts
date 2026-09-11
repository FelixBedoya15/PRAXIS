import { ARLCompany, ClientCompany, PilaRecord, FieldVisit, MedicalRecord, RUIIntermediaryProfile, WhatsAppMessage, UserProfile, AgencyProfile, LeadProspect } from '../types';
import { INITIAL_ARLS, INITIAL_CLIENTS, INITIAL_PILA_RECORDS, INITIAL_FIELD_VISITS, INITIAL_MEDICAL_RECORDS, INITIAL_RUI_PROFILE, INITIAL_WHATSAPP_MESSAGES, INITIAL_AGENCY_PROFILE, INITIAL_USER_PROFILES, INITIAL_LEADS } from './data';

export const STORAGE_KEYS = {
  ARLS: 'wappy_arl_companies_v3',
  CLIENTS: 'wappy_clients_v3',
  PILA_RECORDS: 'wappy_pila_records_v3',
  FIELD_VISITS: 'wappy_field_visits_v4',
  MEDICAL_RECORDS: 'wappy_medical_records_v2',
  RUI_PROFILE: 'wappy_rui_profile_v2',
  WHATSAPP_MESSAGES: 'wappy_whatsapp_messages_v2',
  CURRENT_ROLE: 'wappy_current_role_v1',
  DOCTOR_PIN: 'wappy_doctor_pin_v1',
  AGENCY_PROFILE: 'wappy_agency_profile_v1',
  USER_PROFILES: 'wappy_user_profiles_v1',
  ACTIVE_USER_ID: 'wappy_active_user_id_v1',
  LEADS: 'wappy_leads_v2',
};

// Limpia llaves de datos obsoletas de versiones previas
function cleanupLegacyStorage() {
  if (typeof window === 'undefined') return;
  const legacyKeys = [
    'wappy_clients_v1', 'wappy_clients_v2',
    'wappy_leads_v1',
    'wappy_pila_records_v1', 'wappy_pila_records_v2',
    'wappy_field_visits_v1', 'wappy_field_visits_v2', 'wappy_field_visits_v3',
    'wappy_medical_records_v1',
    'wappy_whatsapp_messages_v1',
    'wappy_arl_companies_v1', 'wappy_arl_companies_v2'
  ];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
}

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
  cleanupLegacyStorage();

  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const json = await res.json();
    if (!json.connected) {
      return { connected: false, synced: false };
    }

    const serverData = json.data || {};
    const serverKeys = Object.keys(serverData);

    // Si la base de datos está vacía o tiene llaves viejas sin los nuevos clientes
    if (serverKeys.length === 0 || !serverData[STORAGE_KEYS.CLIENTS]) {
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

    // Si la base de datos tiene datos válidos, actualizar el almacenamiento local
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

// Función para reiniciar a los 5 datos de prueba oficiales
export async function resetToDefaultSeedData() {
  if (typeof window === 'undefined') return;
  cleanupLegacyStorage();
  localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(INITIAL_ARLS));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
  localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
  localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(INITIAL_PILA_RECORDS));
  localStorage.setItem(STORAGE_KEYS.FIELD_VISITS, JSON.stringify(INITIAL_FIELD_VISITS));
  localStorage.setItem(STORAGE_KEYS.MEDICAL_RECORDS, JSON.stringify(INITIAL_MEDICAL_RECORDS));
  localStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(INITIAL_WHATSAPP_MESSAGES));

  const initialBatch = {
    [STORAGE_KEYS.ARLS]: INITIAL_ARLS,
    [STORAGE_KEYS.CLIENTS]: INITIAL_CLIENTS,
    [STORAGE_KEYS.LEADS]: INITIAL_LEADS,
    [STORAGE_KEYS.PILA_RECORDS]: INITIAL_PILA_RECORDS,
    [STORAGE_KEYS.FIELD_VISITS]: INITIAL_FIELD_VISITS,
    [STORAGE_KEYS.MEDICAL_RECORDS]: INITIAL_MEDICAL_RECORDS,
    [STORAGE_KEYS.WHATSAPP_MESSAGES]: INITIAL_WHATSAPP_MESSAGES,
  };
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: initialBatch }),
  }).catch(() => {});

  window.dispatchEvent(new CustomEvent('praxis_data_synced'));
  window.dispatchEvent(new CustomEvent('praxis_profile_updated'));
}

export const getStoredARLs = (): ARLCompany[] => {
  if (typeof window === 'undefined') return INITIAL_ARLS;
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.ARLS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(INITIAL_ARLS));
    return INITIAL_ARLS;
  }
  try {
    const parsed: ARLCompany[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.ARLS, JSON.stringify(INITIAL_ARLS));
      return INITIAL_ARLS;
    }
    return parsed;
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
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    return INITIAL_CLIENTS;
  }
  try {
    const list: ClientCompany[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    return list;
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
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.PILA_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(INITIAL_PILA_RECORDS));
    return INITIAL_PILA_RECORDS;
  }
  try {
    const list: PilaRecord[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.PILA_RECORDS, JSON.stringify(INITIAL_PILA_RECORDS));
      return INITIAL_PILA_RECORDS;
    }
    return list;
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
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.FIELD_VISITS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.FIELD_VISITS, JSON.stringify(INITIAL_FIELD_VISITS));
    return INITIAL_FIELD_VISITS;
  }
  try {
    const list: FieldVisit[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.FIELD_VISITS, JSON.stringify(INITIAL_FIELD_VISITS));
      return INITIAL_FIELD_VISITS;
    }
    return list;
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
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.MEDICAL_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.MEDICAL_RECORDS, JSON.stringify(INITIAL_MEDICAL_RECORDS));
    return INITIAL_MEDICAL_RECORDS;
  }
  try {
    const list: MedicalRecord[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.MEDICAL_RECORDS, JSON.stringify(INITIAL_MEDICAL_RECORDS));
      return INITIAL_MEDICAL_RECORDS;
    }
    return list;
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
  cleanupLegacyStorage();
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
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    return INITIAL_LEADS;
  }
  try {
    const list: LeadProspect[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    return list;
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
