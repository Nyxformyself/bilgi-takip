import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WakeTimeScreen } from '../screens/WakeTimeScreen';

export default function WakeTimeRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <WakeTimeScreen initialDate={date} />;
}
