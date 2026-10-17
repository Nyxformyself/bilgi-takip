import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  AppState,
  Course,
  Exam,
  SavingsGoal,
  Settings,
  Transaction,
  TxType,
} from './types';
import { Currency, DEFAULT_CURRENCY_CODE, currencyByCode } from './currency';
import { defaultState, loadState, saveState } from './storage';
import { uid } from './utils';

type StoreValue = {
  state: AppState;
  ready: boolean;
  currency: Currency;
  addTransaction: (input: {
    type: TxType;
    amount: number;
    categoryId: string;
    note?: string;
    date: string;
  }) => void;
  updateTransaction: (
    id: string,
    patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>
  ) => void;
  deleteTransaction: (id: string) => void;
  addLog: (input: { courseId: string; date: string; minutes: number; note?: string }) => void;
  deleteLog: (id: string) => void;
  setDayLogged: (courseId: string, date: string, minutes: number) => void;
  setWakeTime: (date: string, time: string) => void;
  removeWakeTime: (date: string) => void;
  addExam: (input: { name: string; date: string; color: string }) => void;
  updateExam: (id: string, patch: Partial<Omit<Exam, 'id'>>) => void;
  deleteExam: (id: string) => void;
  addPracticeTest: (input: {
    courseId: string;
    date: string;
    correct: number;
    wrong: number;
    note?: string;
  }) => void;
  deletePracticeTest: (id: string) => void;
  addGoal: (input: { name: string; target: number; color: string }) => void;
  updateGoal: (id: string, patch: Partial<Omit<SavingsGoal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  addCourse: (input: { name: string; color: string; weeklyGoalMinutes: number }) => void;
  updateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void;
  deleteCourse: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addCustomCurrency: (currency: Currency) => void;
  removeCustomCurrency: (code: string) => void;
  resetAll: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  const value = useMemo<StoreValue>(() => {
    const patch = (fn: (s: AppState) => AppState) => setState((prev) => fn(prev));

    return {
      state,
      ready,
      currency: currencyByCode(state.settings.currencyCode, state.settings.customCurrencies),

      addTransaction: (input) =>
        patch((s) => ({
          ...s,
          transactions: [
            {
              id: uid(),
              type: input.type,
              amount: input.amount,
              categoryId: input.categoryId,
              note: input.note?.trim() ? input.note.trim() : undefined,
              date: input.date,
              createdAt: Date.now(),
            },
            ...s.transactions,
          ],
        })),

      updateTransaction: (id, p) =>
        patch((s) => ({
          ...s,
          transactions: s.transactions.map((t) =>
            t.id === id
              ? { ...t, ...p, note: p.note?.trim() ? p.note.trim() : undefined }
              : t
          ),
        })),

      deleteTransaction: (id) =>
        patch((s) => ({
          ...s,
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      addLog: (input) =>
        patch((s) => ({
          ...s,
          logs: [
            {
              id: uid(),
              courseId: input.courseId,
              date: input.date,
              minutes: input.minutes,
              note: input.note?.trim() ? input.note.trim() : undefined,
              createdAt: Date.now(),
            },
            ...s.logs,
          ],
        })),

      deleteLog: (id) =>
        patch((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) })),

      setDayLogged: (courseId, date, minutes) =>
        patch((s) => {
          const exists = s.logs.some((l) => l.courseId === courseId && l.date === date);
          if (exists) {
            return {
              ...s,
              logs: s.logs.filter((l) => !(l.courseId === courseId && l.date === date)),
            };
          }
          return {
            ...s,
            logs: [
              {
                id: uid(),
                courseId,
                date,
                minutes: Math.max(1, Math.round(minutes)),
                createdAt: Date.now(),
              },
              ...s.logs,
            ],
          };
        }),

      setWakeTime: (date, time) =>
        patch((s) => ({
          ...s,
          wakeTimes: { ...s.wakeTimes, [date]: time },
        })),

      removeWakeTime: (date) =>
        patch((s) => {
          const next = { ...s.wakeTimes };
          delete next[date];
          return { ...s, wakeTimes: next };
        }),

      addExam: (input) =>
        patch((s) => ({
          ...s,
          exams: [
            ...s.exams,
            {
              id: uid(),
              name: input.name.trim() || 'Sınav',
              date: input.date,
              color: input.color,
            },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      updateExam: (id, p) =>
        patch((s) => ({
          ...s,
          exams: s.exams
            .map((e) => (e.id === id ? { ...e, ...p } : e))
            .sort((a, b) => a.date.localeCompare(b.date)),
        })),

      deleteExam: (id) =>
        patch((s) => ({ ...s, exams: s.exams.filter((e) => e.id !== id) })),

      addPracticeTest: (input) =>
        patch((s) => ({
          ...s,
          practiceTests: [
            {
              id: uid(),
              courseId: input.courseId,
              date: input.date,
              correct: Math.max(0, Math.round(input.correct)),
              wrong: Math.max(0, Math.round(input.wrong)),
              note: input.note?.trim() ? input.note.trim() : undefined,
              createdAt: Date.now(),
            },
            ...s.practiceTests,
          ],
        })),

      deletePracticeTest: (id) =>
        patch((s) => ({
          ...s,
          practiceTests: s.practiceTests.filter((t) => t.id !== id),
        })),

      addGoal: (input) =>
        patch((s) => ({
          ...s,
          goals: [
            ...s.goals,
            {
              id: uid(),
              name: input.name.trim() || 'Hedef',
              target: Math.max(0, input.target),
              saved: 0,
              color: input.color,
            },
          ],
        })),

      updateGoal: (id, p) =>
        patch((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...p } : g)),
        })),

      deleteGoal: (id) =>
        patch((s) => ({
          ...s,
          goals: s.goals.filter((g) => g.id !== id),
        })),

      addCourse: (input) =>
        patch((s) => ({
          ...s,
          courses: [
            ...s.courses,
            {
              id: uid(),
              name: input.name.trim() || 'Yeni Ders',
              color: input.color,
              weeklyGoalMinutes: input.weeklyGoalMinutes,
            },
          ],
        })),

      updateCourse: (id, p) =>
        patch((s) => ({
          ...s,
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...p } : c)),
        })),

      deleteCourse: (id) =>
        patch((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          logs: s.logs.filter((l) => l.courseId !== id),
          practiceTests: s.practiceTests.filter((t) => t.courseId !== id),
        })),

      updateSettings: (p) =>
        patch((s) => ({ ...s, settings: { ...s.settings, ...p } })),

      addCustomCurrency: (currency) =>
        patch((s) => ({
          ...s,
          settings: {
            ...s.settings,
            currencyCode: currency.code,
            customCurrencies: [
              ...s.settings.customCurrencies.filter((c) => c.code !== currency.code),
              currency,
            ],
          },
        })),

      removeCustomCurrency: (code) =>
        patch((s) => ({
          ...s,
          settings: {
            ...s.settings,
            customCurrencies: s.settings.customCurrencies.filter((c) => c.code !== code),
            currencyCode:
              s.settings.currencyCode === code
                ? DEFAULT_CURRENCY_CODE
                : s.settings.currencyCode,
          },
        })),

      resetAll: () => setState({ ...defaultState, courses: [...defaultState.courses] }),
    };
  }, [state, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalıdır');
  return ctx;
}
