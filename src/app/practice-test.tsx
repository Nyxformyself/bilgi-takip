import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PracticeTestScreen } from '../screens/PracticeTestScreen';

export default function PracticeTestRoute() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <PracticeTestScreen courseId={courseId} />;
}
