import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LogLessonScreen } from '../screens/LogLessonScreen';

export default function LogLessonRoute() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <LogLessonScreen courseId={courseId} />;
}
