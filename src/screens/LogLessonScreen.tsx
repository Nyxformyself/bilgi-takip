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
import { addDays, formatDayLabel, todayKey } from '../utils';
import { hapticSuccess, hapticTap } from '../haptics';
import { PrimaryButton } from '../components/PrimaryButton';

const QUICK_MINUTES = [15, 25, 40, 60, 90, 120];

export function LogLessonScreen({ courseId: initialCourseId }: { courseId?: string }) {
  const { state, addLog } = useStore();
  const insets = useSafeAreaInsets();

  const courseId = initialCourseId ?? state.courses[0]?.id ?? '';
  const course = state.courses.find((c) => c.id === courseId);

  const [minutesText, setMinutesText] = useState('40');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayKey());

  const dayOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 13; i >= 0; i--) out.push(addDays(todayKey(), -i));
    return out;
  }, []);

  const minutes = parseInt(minutesText.replace(',', '.'), 10) || 0;

  const submit = () => {
    if (!course) return;
    if (minutes <= 0) {
      Alert.alert('Süre gir', 'Lütfen 0’dan büyük bir dakika sayısı yaz.');
      return;
    }
    addLog({ courseId: course.id, date, minutes, note });
    hapticSuccess();
    router.back();
  };

  if (!course) {
    return (
      <View style={[styles.screen, { padding: 24 }]}>
        <Text style={styles.title}>Ders bulunamadı</Text>
        <PrimaryButton label="Geri dön" onPress={() => router.back()} />
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
        <Text style={styles.headerTitle}>{course.name} · Ders Kaydı</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.banner, { backgroundColor: `${course.color}14` }]}>
          <Ionicons name="book" size={22} color={course.color} />
          <Text style={[styles.bannerText, { color: course.color }]}>
            {course.name} çalışmanı kaydet
          </Text>
        </View>

        <Text style={styles.label}>Kaç dakika çalıştın?</Text>
        <View style={styles.quickRow}>
          {QUICK_MINUTES.map((m) => {
            const active = String(m) === minutesText;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  hapticTap();
                  setMinutesText(String(m));
                }}
                style={[
                  styles.quickChip,
                  active && { backgroundColor: course.color, borderColor: course.color },
                ]}
              >
                <Text style={[styles.quickText, active && { color: '#fff' }]}>{m} dk</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          value={minutesText}
          onChangeText={setMinutesText}
          keyboardType="number-pad"
          placeholder="Dakika"
          placeholderTextColor={colors.subtext}
        />

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
                style={[styles.dayChip, active && { backgroundColor: course.color, borderColor: course.color }]}
              >
                <Text style={[styles.dayChipText, active && { color: '#fff' }]}>
                  {formatDayLabel(d)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Not (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Örn. Türev konusu, soru çözümü..."
          placeholderTextColor={colors.subtext}
          maxLength={80}
        />

        <PrimaryButton label="Dersi Kaydet" onPress={submit} style={{ marginTop: 24, backgroundColor: course.color }} />
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
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16 },
  content: { padding: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
  },
  bannerText: { fontSize: 14, fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: 20,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickText: { fontSize: 13, fontWeight: '600', color: colors.text },
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
});
