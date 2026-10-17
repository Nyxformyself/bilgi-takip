import { Currency } from './currency';

export type TxType = 'expense' | 'income';

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  note?: string;
  date: string;
  createdAt: number;
};

export type Course = {
  id: string;
  name: string;
  color: string;
  weeklyGoalMinutes: number;
};

export type StudyLog = {
  id: string;
  courseId: string;
  date: string;
  minutes: number;
  note?: string;
  createdAt: number;
};

export type Exam = {
  id: string;
  name: string;
  date: string;
  color: string;
};

export type PracticeTest = {
  id: string;
  courseId: string;
  date: string;
  correct: number;
  wrong: number;
  note?: string;
  createdAt: number;
};

export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: string;
};

export type Settings = {
  monthlyBudget: number;
  currencyCode: string;
  customCurrencies: Currency[];
  dailyTickMinutes: number;
  categoryBudgets: Record<string, number>;
  reminderEnabled: boolean;
  reminderTime: string;
};

export type AppState = {
  version: number;
  transactions: Transaction[];
  courses: Course[];
  logs: StudyLog[];
  exams: Exam[];
  practiceTests: PracticeTest[];
  goals: SavingsGoal[];
  settings: Settings;
  wakeTimes: Record<string, string>;
};
