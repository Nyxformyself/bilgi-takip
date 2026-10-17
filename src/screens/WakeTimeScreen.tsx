import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { hapticSuccess, hapticTap } from '../haptics';
import {
  addDays,
  formatDayLabel,
  hhmmToMinutes,
  minutesToHHMM,
  todayKey,
} from '../utils';
import { PrimaryButton } from '../components/PrimaryButton';

const QUICK_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00'];

export function WakeTimeScreen({ initialDate }: { initialDate?: string }) {
  const { state, setWakeTime, removeWakeTime } = useStore();
  const insets = useSafeAreaInsets();

  const dayOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 6; i >= 0; i--) out.push(addDays(todayKey(), -i));
    return out;
  }, []);

  const [date, setDate] = useState(
    initialDate && dayOptions.includes(initialDate) ? initialDate : todayKey()
  );

  const stored = state.wakeTimes[date];
  const [mins, setMins] = useState<number>(
    () => hhmmToMinutes(stored ?? '') ?? 7 * 60
  );
  const [dirty, setDirty] = useState(false);

  const selectDate = (d: string) => {
    hapticTap();
    setDate(d);
    setMins(hhmmToMinutes(state.wakeTimes[d] ?? '') ?? 7 * 60);
    setDirty(false);
  };

  const adjust = (delta: number) => {
    hapticTap();
    setMins((prev) => prev + delta);
    setDirty(true);
  };

  const stats = useMemo(() => {
    const last7 = dayOptions
      .map((d) => hhmmToMinutes(state.wakeTimes[d] ?? ''))
      .filter((v): v is number => v !== null);
    if (last7.length === 0) return null;
    const avg = Math.round(last7.reduce((a, v) => a + v, 0) / last7.length);
    const earliest = Math.min(...last7);
    return { avg, earliest, count: last7.length };
  }, [state.wakeTimes, dayOptions]);

  const save = () => {
    setWakeTime(date, minutesToHHMM(mins));
    hapticSuccess();
    router.back();
  };

  const remove = () => {
    hapticTap();
    removeWakeTime(date);
    router.back();
  };
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Kalkış Saati</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Gün seç</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {dayOptions.map((d) => {
            const active = d === date;
            const has = !!state.wakeTimes[d];
            return (
              <Pressable
                key={d}
                onPress={() => selectDate(d)}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                  {formatDayLabel(d)}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: has ? colors.income : colors.border },
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.clockWrap}>
          <Text style={styles.clock}>{minutesToHHMM(mins)}</Text>
          <Text style={styles.clockSub}>
            {stored ? `Kayıtlı: ${stored}` : 'Bu gün için kayıt yok'}
          </Text>
        </View>

        <View style={styles.adjustRow}>
          <Pressable style={styles.adjustBtn} onPress={() => adjust(-60)}>
            <Text style={styles.adjustText}>-1 sa</Text>
          </Pressable>
          <Pressable style={styles.adjustBtn} onPress={() => adjust(-15)}>
            <Text style={styles.adjustText}>-15 dk</Text>
          </Pressable>
          <Pressable style={styles.adjustBtn} onPress={() => adjust(15)}>
            <Text style={styles.adjustText}>+15 dk</Text>
          </Pressable>
          <Pressable style={styles.adjustBtn} onPress={() => adjust(60)}>
            <Text style={styles.adjustText}>+1 sa</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {QUICK_TIMES.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                hapticTap();
                setMins(hhmmToMinutes(t) ?? mins);
                setDirty(true);
              }}
              style={[styles.quickChip, minutesToHHMM(mins) === t && styles.quickChipActive]}
            >
              <Text
                style={[
                  styles.quickText,
                  minutesToHHMM(mins) === t && styles.quickTextActive,
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              hapticTap();
              const d = new Date();
              setMins(d.getHours() * 60 + d.getMinutes());
              setDirty(true);
            }}
            style={styles.nowChip}
          >
            <Ionicons name="flash" size={12} color={colors.primary} />
            <Text style={styles.nowText}>Şimdi</Text>
          </Pressable>
        </View>

        {stats && (
          <View style={styles.statsBox}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{minutesToHHMM(stats.avg)}</Text>
              <Text style={styles.statLabel}>Ortalama kalkış</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{minutesToHHMM(stats.earliest)}</Text>
              <Text style={styles.statLabel}>En erken</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Kayıtlı gün</Text>
            </View>
          </View>
        )}

        <View style={{ marginTop: 22, gap: 10 }}>
          <PrimaryButton label="Kaydet" onPress={save} disabled={!dirty && !!stored} />
          {stored && <PrimaryButton label="Kaydı Sil" variant="danger" onPress={remove} />}
        </View>

        <Text style={styles.hint}>
          Her gün kalktığında buraya yaz; ortalama kalkış saatini ana sayfada görürsün.
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
  content: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  dayScroll: { flexGrow: 0, marginBottom: 6 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayChipActive: { backgroundColor: colors.primarySoft, borderColor: 'rgba(167,139,250,0.45)' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
  dayChipTextActive: { color: colors.primary },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  clockWrap: { alignItems: 'center', marginTop: 26 },
  clock: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  clockSub: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  adjustRow: { flexDirection: 'row', gap: 8, marginTop: 22, justifyContent: 'center' },
  adjustBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustText: { fontSize: 13, fontWeight: '700', color: colors.text },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickText: { fontSize: 13, fontWeight: '700', color: colors.text },
  quickTextActive: { color: colors.bg },
  nowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  nowText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  statsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 22,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.subtext, marginTop: 3 },
  hint: { fontSize: 11, color: colors.subtext, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
