export interface EvolutionPhoto {
  id: string;
  date: string;
  dayLabel: string; // "Dia 1", "Dia 3", etc.
  imageData: string; // base64 data url
  notes: string;
  triageResult?: any;
}

export interface TriageCase {
  id: string;
  title: string;
  category: 'pele' | 'ferida' | 'odonto' | 'olhos' | 'geral';
  createdAt: string;
  status: 'em_acompanhamento' | 'resolvido' | 'encaminhado_upa';
  photos: EvolutionPhoto[];
}

export interface VitalsLog {
  id: string;
  timestamp: string;
  type: 'pressure' | 'glucose';
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucose?: number;
  glucoseCondition?: 'jejum' | 'pos_prandial' | 'casual';
  status: 'normal' | 'alerta' | 'emergencia';
  notes?: string;
  photoProof?: string;
}

export interface StoredPrescription {
  id: string;
  date: string;
  doctorNotesDeciphered: string;
  medications: any[];
  dailySchedule: any[];
  importantAlerts: string[];
}

const STORAGE_KEYS = {
  CASES: 'previnesus_cases_v2',
  VITALS: 'previnesus_vitals_v2',
  PRESCRIPTIONS: 'previnesus_prescriptions_v2',
  SETTINGS: 'previnesus_settings_v2',
};

// Safe LocalStorage helper (works in SSR without errors)
export const storage = {
  getCases: (): TriageCase[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCases: (cases: TriageCase[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
    } catch (e) {
      console.error('Failed to save cases to localStorage', e);
    }
  },

  addOrUpdateCase: (triageCase: TriageCase) => {
    const cases = storage.getCases();
    const index = cases.findIndex(c => c.id === triageCase.id);
    if (index >= 0) {
      cases[index] = triageCase;
    } else {
      cases.unshift(triageCase);
    }
    storage.saveCases(cases);
  },

  getVitals: (): VitalsLog[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VITALS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addVitalLog: (vital: VitalsLog) => {
    const logs = storage.getVitals();
    logs.unshift(vital);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VITALS, JSON.stringify(logs));
    }
  },

  getPrescriptions: (): StoredPrescription[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePrescription: (prescription: StoredPrescription) => {
    const list = storage.getPrescriptions();
    list.unshift(prescription);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(list));
    }
  },

  getApiKey: (): string => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AQ.Ab8RN6LvjacsFU8rphPFPLx_x2ziA3yDDzr1ultsL1ERS7K5eA';
    return localStorage.getItem('previnesus_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AQ.Ab8RN6LvjacsFU8rphPFPLx_x2ziA3yDDzr1ultsL1ERS7K5eA';
  },

  setApiKey: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('previnesus_api_key', key);
    }
  },

  deleteCase: (caseId: string) => {
    if (typeof window === 'undefined') return;
    const cases = storage.getCases().filter(c => c.id !== caseId);
    storage.saveCases(cases);
  },

  clearCases: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.CASES);
    } catch (e) {
      console.error('Failed to clear cases', e);
    }
  },

  clearAll: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.CASES);
      localStorage.removeItem(STORAGE_KEYS.VITALS);
      localStorage.removeItem(STORAGE_KEYS.PRESCRIPTIONS);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  }
};

