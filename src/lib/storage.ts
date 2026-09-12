import { ARLCompany, ClientCompany, PilaRecord, FieldVisit, MedicalRecord, RUIIntermediaryProfile, WhatsAppMessage, UserProfile, AgencyProfile, LeadProspect, OccupationalExam } from '../types';
import { INITIAL_ARLS, INITIAL_CLIENTS, INITIAL_PILA_RECORDS, INITIAL_FIELD_VISITS, INITIAL_MEDICAL_RECORDS, INITIAL_RUI_PROFILE, INITIAL_WHATSAPP_MESSAGES, INITIAL_AGENCY_PROFILE, INITIAL_USER_PROFILES, INITIAL_LEADS, INITIAL_OCCUPATIONAL_EXAMS } from './data';

export const STORAGE_KEYS = {
  ARLS: 'wappy_arl_companies_v3',
  CLIENTS: 'wappy_clients_v3',
  PILA_RECORDS: 'wappy_pila_records_v3',
  FIELD_VISITS: 'wappy_field_visits_v4',
  MEDICAL_RECORDS: 'wappy_medical_records_v2',
  OCCUPATIONAL_EXAMS: 'praxis_occupational_exams_v1',
  RUI_PROFILE: 'wappy_rui_profile_v2',
  WHATSAPP_MESSAGES: 'wappy_whatsapp_messages_v2',
  CURRENT_ROLE: 'wappy_current_role_v1',
  DOCTOR_PIN: 'wappy_doctor_pin_v1',
  AGENCY_PROFILE: 'wappy_agency_profile_v1',
  USER_PROFILES: 'wappy_user_profiles_v1',
  ACTIVE_USER_ID: 'wappy_active_user_id_v1',
  LEADS: 'wappy_leads_v2',
  GEMINI_KEYS: 'praxis_gemini_keys_v1',
  CHAT_SESSIONS: 'praxis_ai_chat_sessions_v2',
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

// Sincroniza desde el Servidor / PostgreSQL hacia el cliente con fusión inteligente por ID
export async function syncFromServer(): Promise<{
  connected: boolean;
  synced: boolean;
  engine?: 'POSTGRESQL' | 'SERVER_FILE_STORAGE' | 'LOCAL_CACHE';
}> {
  if (typeof window === 'undefined') return { connected: false, synced: false, engine: 'LOCAL_CACHE' };
  cleanupLegacyStorage();

  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const json = await res.json();
    if (!json.connected) {
      return { connected: false, synced: false, engine: 'LOCAL_CACHE' };
    }

    const engine = (json.engine as 'POSTGRESQL' | 'SERVER_FILE_STORAGE') || 'SERVER_FILE_STORAGE';
    const serverData = json.data || {};
    const serverKeys = Object.keys(serverData);

    // Si la base de datos en servidor está vacía o le falta la clave de clientes,
    // enviamos los datos actuales locales para inicializar el servidor
    if (serverKeys.length === 0 || !serverData[STORAGE_KEYS.CLIENTS]) {
      const initialBatch = {
        [STORAGE_KEYS.ARLS]: getStoredARLs(),
        [STORAGE_KEYS.CLIENTS]: getStoredClients(),
        [STORAGE_KEYS.PILA_RECORDS]: getStoredPilaRecords(),
        [STORAGE_KEYS.FIELD_VISITS]: getStoredFieldVisits(),
        [STORAGE_KEYS.MEDICAL_RECORDS]: getStoredMedicalRecords(),
        [STORAGE_KEYS.OCCUPATIONAL_EXAMS]: getStoredOccupationalExams(),
        [STORAGE_KEYS.RUI_PROFILE]: getStoredRUIProfile(),
        [STORAGE_KEYS.WHATSAPP_MESSAGES]: getStoredWhatsAppMessages(),
        [STORAGE_KEYS.AGENCY_PROFILE]: getStoredAgencyProfile(),
        [STORAGE_KEYS.USER_PROFILES]: getStoredUserProfiles(),
        [STORAGE_KEYS.ACTIVE_USER_ID]: getStoredActiveUserId(),
        [STORAGE_KEYS.LEADS]: getStoredLeads(),
        [STORAGE_KEYS.CHAT_SESSIONS]: getStoredChatSessions(),
      };
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: initialBatch }),
      });
      return { connected: true, synced: true, engine };
    }

    // Si el servidor tiene datos, realizamos una sincronización inteligente (Smart Merge)
    // Para colecciones de array (clientes, leads, visitas, etc.), unificamos por id para NUNCA perder datos creados localmente
    const arrayKeys: string[] = [
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.LEADS,
      STORAGE_KEYS.ARLS,
      STORAGE_KEYS.PILA_RECORDS,
      STORAGE_KEYS.FIELD_VISITS,
      STORAGE_KEYS.MEDICAL_RECORDS,
      STORAGE_KEYS.OCCUPATIONAL_EXAMS,
      STORAGE_KEYS.WHATSAPP_MESSAGES,
      STORAGE_KEYS.USER_PROFILES,
      STORAGE_KEYS.CHAT_SESSIONS,
    ];

    let hasLocalChanges = false;
    const batchToPushBack: Record<string, any> = {};

    for (const [key, serverVal] of Object.entries(serverData)) {
      if (arrayKeys.includes(key) && Array.isArray(serverVal)) {
        const localRaw = localStorage.getItem(key);
        let localArray: any[] = [];
        try {
          if (localRaw) localArray = JSON.parse(localRaw);
        } catch (e) {
          localArray = [];
        }

        if (Array.isArray(localArray)) {
          // Fusionar por ID
          const map = new Map<string, any>();
          // Primero agregar los del servidor
          for (const item of serverVal) {
            if (item && item.id) {
              map.set(String(item.id), item);
            }
          }
          // Luego verificar si lo local tiene elementos creados por el usuario que no estén aún en el servidor
          let localHasNew = false;
          for (const item of localArray) {
            if (item && item.id) {
              if (!map.has(String(item.id))) {
                map.set(String(item.id), item);
                localHasNew = true;
              }
            }
          }

          const mergedArray = Array.from(map.values());
          const stringified = JSON.stringify(mergedArray);

          if (localRaw !== stringified) {
            localStorage.setItem(key, stringified);
            hasLocalChanges = true;
          }

          // Si el cliente local tenía datos que el servidor no tenía, los enviamos de vuelta al servidor
          if (localHasNew) {
            batchToPushBack[key] = mergedArray;
          }
        } else {
          // Si local estaba vacío, simplemente guardamos lo del servidor
          localStorage.setItem(key, JSON.stringify(serverVal));
          hasLocalChanges = true;
        }
      } else {
        // Para objetos de configuración única (AGENCY_PROFILE, RUI_PROFILE, etc.)
        const existing = localStorage.getItem(key);
        const stringified = JSON.stringify(serverVal);
        if (existing !== stringified) {
          localStorage.setItem(key, stringified);
          hasLocalChanges = true;
        }
      }
    }

    // Si encontramos elementos locales no guardados en el servidor, los enviamos en lote
    if (Object.keys(batchToPushBack).length > 0) {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchToPushBack }),
      }).catch((e) => console.warn('[Sync] Pushback error:', e));
    }

    if (hasLocalChanges) {
      window.dispatchEvent(new CustomEvent('praxis_data_synced'));
      window.dispatchEvent(new CustomEvent('praxis_profile_updated'));
    }

    return { connected: true, synced: true, engine };
  } catch (err) {
    console.warn('[Sync] Sync failed:', err);
    return { connected: false, synced: false, engine: 'LOCAL_CACHE' };
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
  localStorage.setItem(STORAGE_KEYS.OCCUPATIONAL_EXAMS, JSON.stringify(INITIAL_OCCUPATIONAL_EXAMS));
  localStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(INITIAL_WHATSAPP_MESSAGES));

  const initialBatch = {
    [STORAGE_KEYS.ARLS]: INITIAL_ARLS,
    [STORAGE_KEYS.CLIENTS]: INITIAL_CLIENTS,
    [STORAGE_KEYS.LEADS]: INITIAL_LEADS,
    [STORAGE_KEYS.PILA_RECORDS]: INITIAL_PILA_RECORDS,
    [STORAGE_KEYS.FIELD_VISITS]: INITIAL_FIELD_VISITS,
    [STORAGE_KEYS.MEDICAL_RECORDS]: INITIAL_MEDICAL_RECORDS,
    [STORAGE_KEYS.OCCUPATIONAL_EXAMS]: INITIAL_OCCUPATIONAL_EXAMS,
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

export const getStoredOccupationalExams = (): OccupationalExam[] => {
  if (typeof window === 'undefined') return INITIAL_OCCUPATIONAL_EXAMS;
  cleanupLegacyStorage();
  const stored = localStorage.getItem(STORAGE_KEYS.OCCUPATIONAL_EXAMS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.OCCUPATIONAL_EXAMS, JSON.stringify(INITIAL_OCCUPATIONAL_EXAMS));
    return INITIAL_OCCUPATIONAL_EXAMS;
  }
  try {
    const list: OccupationalExam[] = JSON.parse(stored);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEYS.OCCUPATIONAL_EXAMS, JSON.stringify(INITIAL_OCCUPATIONAL_EXAMS));
      return INITIAL_OCCUPATIONAL_EXAMS;
    }
    return list;
  } catch (e) {
    return INITIAL_OCCUPATIONAL_EXAMS;
  }
};

export const saveStoredOccupationalExams = (exams: OccupationalExam[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.OCCUPATIONAL_EXAMS, JSON.stringify(exams));
    pushToServer(STORAGE_KEYS.OCCUPATIONAL_EXAMS, exams);
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

export const getStoredGeminiKeys = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.GEMINI_KEYS) || '';
};

export const saveStoredGeminiKeys = (keysString: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.GEMINI_KEYS, keysString);
    window.dispatchEvent(new CustomEvent('praxis_gemini_keys_updated'));
    pushToServer(STORAGE_KEYS.GEMINI_KEYS, keysString);
  }
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
}

export const getStoredChatSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
  if (!stored) return [];
  try {
    const list = JSON.parse(stored);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
};

export const saveStoredChatSessions = (sessions: ChatSession[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));
    pushToServer(STORAGE_KEYS.CHAT_SESSIONS, sessions);
  }
};


