import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { TxType } from '../types';

export default function AddTransactionRoute() {
  const { type, id } = useLocalSearchParams<{ type?: string; id?: string }>();
  const initialType: TxType | undefined = type === 'income' || type === 'expense' ? type : undefined;
  return <AddTransactionScreen initialType={initialType} transactionId={id} />;
}
