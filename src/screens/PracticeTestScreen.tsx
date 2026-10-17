import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { addDays, formatDayLabel, netScore, todayKey } from '../utils';
import { hapticSuccess, hapticTap } from '../haptics';
import { PrimaryButton } from '../components/PrimaryButton';

function formatNet(net: number): string {
  return net.toFixed(2).replace('.', ',');
}

function NumberStepper({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          hitSlop={6}
          onPress={() => {
            hapticTap();
            onChange(Math.max(0, value - 1));
          }}
          style={styles.stepBtn}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <TextInput
          style={[styles.stepInput, { borderColor: color }]}
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
          }}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Pressable
          hitSlop={6}
          onPress={() => {
            hapticTap();
            onChange(value + 1);
          }}
          style={styles.stepBtn}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function PracticeTestScreen({ courseId: initialCourseId }: { courseId?: string }) {
  const { state, addPracticeTest } = useStore();
  const insets = useSafeAreaInsets();

  const [courseId, setCourseId] = useState(initialCourseId ?? state.courses[0]?.id ?? '');
  const [date, setDate] = useState(todayKey());
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [note, setNote] = useState('');

  const course = state.courses.find((c) => c.id === courseId);

  const dayOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 13; i >= 0; i--) out.push(addDays(todayKey(), -i));
    return out;
  }, []);

  const net = netScore(correct, wrong);
  const answered = correct + wrong;

  const submit = () => {
    if (!course) return;
    if (answered <= 0) {
      Alert.alert('Sonuç gir', 'En az bir doğru veya yanlış sayısı gir.');
      return;
    }
    addPracticeTest({ courseId: course.id, date, correct, wrong, note });
    hapticSuccess();
    router.back();
  };

  if (state.courses.length === 0) {
    return (
      <View style={[styles.screen, { padding: 24, paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Önce ders ekle</Text>
        <Text style={styles.emptyText}>
          Deneme sonucu kaydetmek için Ayarlar’dan en az bir ders ekle.
        </Text>
        <PrimaryButton label="Geri dön" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Deneme Sonucu Ekle</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Ders</Text>
        <View style={styles.courseWrap}>
          {state.courses.map((c) => {
            const active = c.id === courseId;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  hapticTap();
                  setCourseId(c.id);
                }}
                style={[
                  styles.courseChip,
                  active && { backgroundColor: c.color, borderColor: c.color },
                ]}
              >
                <Text style={[styles.courseChipText, active && { color: '#fff' }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Tarih</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dayOptions.map((d) => {
            const active = d === date;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  hapticTap();
                  setDate(d);
                }}
                style={[
                  styles.dayChip,
                  active && {
                    backgroundColor: course?.color ?? colors.primary,
                    borderColor: course?.color ?? colors.primary,
                  },
                ]}
              >
                <Text style={[styles.dayChipText, active && { color: '#fff' }]}>
                  {formatDayLabel(d)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Sonuç</Text>
        <View style={styles.stepperRowWrap}>
          <NumberStepper label="Doğru" value={correct} color={colors.income} onChange={setCorrect} />
          <NumberStepper label="Yanlış" value={wrong} color={colors.expense} onChange={setWrong} />
        </View>

        <View style={styles.netCard}>
          <Text style={styles.netLabel}>Net</Text>
          <Text style={[styles.netValue, { color: course?.color ?? colors.primary }]}>
            {formatNet(Math.max(0, net))}
          </Text>
          <Text style={styles.netHint}>
            {answered} soru · 4 yanlış 1 doğruyu götürür
          </Text>
        </View>

        <Text style={styles.label}>Not (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Örn. TYT denemesi 3, süre yetmedi..."
          placeholderTextColor={colors.subtext}
          maxLength={80}
        />

        <PrimaryButton
          label="Denemeyi Kaydet"
          onPress={submit}
          style={{ marginTop: 24, backgroundColor: course?.color ?? colors.primary }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.subtext, lineHeight: 20 },
  content: { padding: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: 20,
    marginBottom: 8,
  },
  courseWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  dayChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  stepperRowWrap: { flexDirection: 'row', gap: 12 },
  stepper: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  stepperLabel: { fontSize: 13, fontWeight: '800' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    width: 64,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.bg,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  netCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  netLabel: { fontSize: 12, fontWeight: '700', color: colors.subtext, letterSpacing: 1 },
  netValue: { fontSize: 34, fontWeight: '800', marginTop: 2 },
  netHint: { fontSize: 11, color: colors.subtext, marginTop: 4 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: colors.text,
  },
});
