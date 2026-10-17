import { TxType } from './types';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TxType;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'yemek', name: 'Yemek', icon: 'restaurant', color: '#F59E0B', type: 'expense' },
  { id: 'market', name: 'Market', icon: 'cart', color: '#84CC16', type: 'expense' },
  { id: 'ulasim', name: 'Ulaşım', icon: 'car', color: '#06B6D4', type: 'expense' },
  { id: 'fatura', name: 'Faturalar', icon: 'flash', color: '#EF4444', type: 'expense' },
  { id: 'egitim', name: 'Eğitim', icon: 'school', color: '#4F46E5', type: 'expense' },
  { id: 'saglik', name: 'Sağlık', icon: 'medkit', color: '#EC4899', type: 'expense' },
  { id: 'giyim', name: 'Giyim', icon: 'shirt', color: '#8B5CF6', type: 'expense' },
  { id: 'eglence', name: 'Eğlence', icon: 'game-controller', color: '#0EA5E9', type: 'expense' },
  { id: 'diger-gider', name: 'Diğer', icon: 'ellipsis-horizontal', color: '#64748B', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'maas', name: 'Maaş', icon: 'briefcase', color: '#10B981', type: 'income' },
  { id: 'burs', name: 'Burs', icon: 'school', color: '#06B6D4', type: 'income' },
  { id: 'yan-gelir', name: 'Yan Gelir', icon: 'cash', color: '#4F46E5', type: 'income' },
  { id: 'hediye', name: 'Hediye', icon: 'gift', color: '#EC4899', type: 'income' },
  { id: 'diger-gelir', name: 'Diğer', icon: 'ellipsis-horizontal', color: '#64748B', type: 'income' },
];

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoryById(id: string): Category {
  return (
    ALL_CATEGORIES.find((c) => c.id === id) ?? {
      id,
      name: 'Diğer',
      icon: 'help-circle',
      color: '#64748B',
      type: 'expense',
    }
  );
}

export function categoriesFor(type: TxType): Category[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}
