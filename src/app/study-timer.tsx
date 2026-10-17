import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StudyTimerScreen } from '../screens/StudyTimerScreen';

export default function StudyTimerRoute() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <StudyTimerScreen initialCourseId={courseId} />;
}
