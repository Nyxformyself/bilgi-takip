import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useStore } from '../store';
import { colors, glow } from '../theme';
import { hapticImpact, hapticSuccess, hapticTap } from '../haptics';
import { todayKey } from '../utils';
import { PrimaryButton } from '../components/PrimaryButton';

const POMODORO_PRESETS = [15, 25, 45];

function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function StudyTimerScreen({ initialCourseId }: { initialCourseId?: string }) {
  const { state, addLog } = useStore();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [pomodoroMin, setPomodoroMin] = useState(25);
  const [courseId, setCourseId] = useState(
    initialCourseId && state.courses.some((c) => c.id === initialCourseId)
      ? initialCourseId
      : state.courses[0]?.id ?? ''
  );

  const [running, setRunning] = useState(false);
  const [accumMs, setAccumMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const autoFiredRef = useRef(false);

  const elapsedMs = startedAt !== null ? accumMs + (now - startedAt) : accumMs;

  const targetMs = pomodoroMin * 60_000;
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      deactivateKeepAwake();
    };
  }, [running]);

  const course = state.courses.find((c) => c.id === courseId);

  const finish = () => {
    const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
    if (elapsedMs < 10_000) {
      Alert.alert('Çok kısa', 'Kaydetmek için en az 10 saniye çalış.');
      return;
    }
    addLog({ courseId, date: todayKey(), minutes });
    hapticSuccess();
    router.back();
  };

  useEffect(() => {
    if (mode === 'pomodoro' && running && remainingMs <= 0 && !autoFiredRef.current) {
      autoFiredRef.current = true;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, running, mode]);

  const start = () => {
    hapticImpact();
    autoFiredRef.current = false;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setRunning(true);
  };

  const pause = () => {
    hapticImpact();
    if (startedAt !== null) {
      setAccumMs(accumMs + (Date.now() - startedAt));
      setStartedAt(null);
    }
    setRunning(false);
  };

  const reset = () => {
    hapticTap();
    setRunning(false);
    setStartedAt(null);
    setAccumMs(0);
    setNow(0);
    autoFiredRef.current = false;
  };

  const RING_SIZE = 280;
  const STROKE = 10;
  const R = (RING_SIZE - STROKE) / 2 - 4;
  const CX = RING_SIZE / 2;
  const CIRC = 2 * Math.PI * R;

  const progress = useMemo(() => {
    if (mode === 'pomodoro') {
      return Math.min(1, elapsedMs / targetMs);
    }
    return Math.min(1, elapsedMs / 3_600_000);
  }, [mode, elapsedMs, targetMs]);

  const displayMs = mode === 'pomodoro' && (running || accumMs > 0) ? remainingMs : elapsedMs;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ders Sayacı</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.courseRow}>
          {state.courses.map((c) => {
            const active = c.id === courseId;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (running) return;
                  hapticTap();
                  setCourseId(c.id);
                }}
                style={[
                  styles.courseChip,
                  active && { backgroundColor: `${c.color}26`, borderColor: c.color },
                  running && !active && { opacity: 0.5 },
                ]}
              >
                <View style={[styles.courseDot, { backgroundColor: c.color }]} />
                <Text style={[styles.courseChipText, active && { color: c.color, fontWeight: '800' }]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CX}
              cy={CX}
              r={R}
              stroke={colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={CX}
              cy={CX}
              r={R}
              stroke={colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={CIRC * (1 - progress)}
              transform={`rotate(-90 ${CX} ${CX})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.timeText}>{formatClock(displayMs)}</Text>
            <Text style={styles.ringSub}>
              {mode === 'pomodoro'
                ? running
                  ? 'kaldı'
                  : accumMs > 0
                    ? 'duraklatıldı'
                    : `${pomodoroMin} dk hedef`
                : running
                  ? 'çalışıyor'
                  : accumMs > 0
                    ? 'duraklatıldı'
                    : 'hazır'}
            </Text>
          </View>
        </View>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => {
              if (running || accumMs > 0) return;
              hapticTap();
              setMode('stopwatch');
            }}
            style={[
              styles.modeChip,
              mode === 'stopwatch' && styles.modeChipActive,
              (running || accumMs > 0) && mode !== 'stopwatch' && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name="stopwatch-outline"
              size={14}
              color={mode === 'stopwatch' ? colors.bg : colors.subtext}
            />
            <Text style={[styles.modeText, mode === 'stopwatch' && styles.modeTextActive]}>
              Sayaç
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (running || accumMs > 0) return;
              hapticTap();
              setMode('pomodoro');
            }}
            style={[
              styles.modeChip,
              mode === 'pomodoro' && styles.modeChipActive,
              (running || accumMs > 0) && mode !== 'pomodoro' && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name="timer-outline"
              size={14}
              color={mode === 'pomodoro' ? colors.bg : colors.subtext}
            />
            <Text style={[styles.modeText, mode === 'pomodoro' && styles.modeTextActive]}>
              Pomodoro
            </Text>
          </Pressable>
        </View>

        {mode === 'pomodoro' && (
          <View style={styles.presetRow}>
            {POMODORO_PRESETS.map((m) => {
              const active = m === pomodoroMin;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    if (running || accumMs > 0) return;
                    hapticTap();
                    setPomodoroMin(m);
                  }}
                  style={[
                    styles.presetChip,
                    active && styles.presetChipActive,
                    (running || accumMs > 0) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {m} dk
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.actions}>
          {!running ? (
            <PrimaryButton
              label={accumMs > 0 ? 'Devam Et' : 'Başlat'}
              onPress={start}
              style={styles.mainBtn}
            />
          ) : (
            <PrimaryButton
              label="Duraklat"
              onPress={pause}
              variant="ghost"
              style={styles.mainBtn}
            />
          )}
          {(running || accumMs > 0) && (
            <>
              <PrimaryButton label="Bitir ve Kaydet" variant="income" onPress={finish} />
              {!running && (
                <PrimaryButton label="Sıfırla" variant="ghost" onPress={reset} />
              )}
            </>
          )}
        </View>

        <Text style={styles.hint}>
          {course
            ? `Kaydedince süre "${course.name}" dersine eklenir.`
            : 'Önce Ayarlar’dan bir ders ekle.'}
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16, alignItems: 'stretch' },
  courseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseDot: { width: 8, height: 8, borderRadius: 4 },
  courseChipText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  ringWrap: {
    alignSelf: 'center',
    marginTop: 22,
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  timeText: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  ringSub: { fontSize: 13, color: colors.subtext, marginTop: 6, fontWeight: '600' },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 22 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...glow },
  modeText: { fontSize: 13, fontWeight: '700', color: colors.subtext },
  modeTextActive: { color: colors.bg },
  presetRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: { backgroundColor: colors.primarySoft, borderColor: 'rgba(167,139,250,0.45)' },
  presetText: { fontSize: 13, fontWeight: '700', color: colors.subtext },
  presetTextActive: { color: colors.primary },
  actions: { marginTop: 26, gap: 10 },
  mainBtn: { height: 56 },
  hint: { textAlign: 'center', fontSize: 12, color: colors.subtext, marginTop: 18 },
});
