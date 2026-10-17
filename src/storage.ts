import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';
import { DEFAULT_CURRENCY_CODE } from './currency';
import { uid } from './utils';

const STORAGE_KEY = '@bilgi-takip:v1';

export const defaultState: AppState = {
  version: 2,
  transactions: [],
  courses: [
    { id: 'matematik', name: 'Matematik', color: '#8B5CF6', weeklyGoalMinutes: 300 },
    { id: 'iq', name: 'IQ', color: '#F59E0B', weeklyGoalMinutes: 180 },
  ],
  logs: [],
  exams: [],
  practiceTests: [],
  goals: [],
  wakeTimes: {},
  settings: {
    monthlyBudget: 0,
    currencyCode: DEFAULT_CURRENCY_CODE,
    customCurrencies: [],
    dailyTickMinutes: 30,
    categoryBudgets: {},
    reminderEnabled: false,
    reminderTime: '20:00',
  },
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as AppState;
    const settings = { ...defaultState.settings, ...parsed.settings };
    // v1 -> v2: varsayılan para birimi TRY'den GEL'e geçti.
    // Kullanıcı TRY'yi özellikle seçmediyse GEL'e taşı (Ayarlar'dan değiştirilebilir).
    if ((parsed.version ?? 1) < 2 && settings.currencyCode === 'TRY') {
      settings.currencyCode = DEFAULT_CURRENCY_CODE;
    }
    return {
      ...defaultState,
      ...parsed,
      version: 2,
      settings,
      courses: parsed.courses?.length ? parsed.courses : defaultState.courses,
    };
  } catch {
    return { ...defaultState };
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessizce yoksay
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessizce yoksay
  }
}

export function newId(): string {
  return uid();
}
