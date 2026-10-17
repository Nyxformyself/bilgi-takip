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
import { categoriesFor } from '../categories';
import { useStore } from '../store';
import { colors } from '../theme';
import { TxType } from '../types';
import { addDays, formatDayLabel, parseAmount, todayKey } from '../utils';
import { hapticSuccess, hapticTap, hapticWarn } from '../haptics';
import { PrimaryButton } from '../components/PrimaryButton';

export function AddTransactionScreen({
  initialType,
  transactionId,
}: {
  initialType?: TxType;
  transactionId?: string;
}) {
  const { state, addTransaction, updateTransaction, currency } = useStore();
  const insets = useSafeAreaInsets();

  const editing = useMemo(
    () => state.transactions.find((t) => t.id === transactionId),
    [state.transactions, transactionId]
  );

  const [type, setType] = useState<TxType>(editing?.type ?? initialType ?? 'expense');
  const [amountText, setAmountText] = useState(
    editing ? editing.amount.toFixed(2).replace('.', ',') : ''
  );
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? 'yemek');
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? todayKey());

  const cats = useMemo(() => categoriesFor(type), [type]);
  const amount = parseAmount(amountText);

  const dayOptions = useMemo(() => {
    const base = lastNDaysLocal(14);
    if (editing && !base.includes(editing.date)) return [editing.date, ...base];
    return base;
  }, [editing]);

  const switchType = (t: TxType) => {
    hapticTap();
    setType(t);
    const list = categoriesFor(t);
    if (!list.some((c) => c.id === categoryId)) setCategoryId(list[0].id);
  };

  const submit = () => {
    if (amount <= 0) {
      hapticWarn();
      Alert.alert('Tutar gir', 'Lütfen 0’dan büyük bir tutar yaz.');
      return;
    }
    if (editing) {
      updateTransaction(editing.id, { type, amount, categoryId, note, date });
    } else {
      addTransaction({ type, amount, categoryId, note, date });
    }
    hapticSuccess();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? 'İşlemi Düzenle' : 'Yeni İşlem'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          {(
            [
              { key: 'expense', label: 'Gider', icon: 'arrow-down' },
              { key: 'income', label: 'Gelir', icon: 'arrow-up' },
            ] as const
          ).map((o) => {
            const active = type === o.key;
            const tint = o.key === 'expense' ? colors.expense : colors.income;
            return (
              <Pressable
                key={o.key}
                onPress={() => switchType(o.key)}
                style={[
                  styles.typeBtn,
                  active && {
                    backgroundColor: o.key === 'expense' ? colors.expenseSoft : colors.incomeSoft,
                    borderColor: tint,
                  },
                ]}
              >
                <Ionicons
                  name={o.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={active ? tint : colors.subtext}
                />
                <Text style={[styles.typeText, active && { color: tint }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Tutar</Text>
        <View style={styles.amountBox}>
          <Text style={styles.currency}>{currency.symbol}</Text>
          <TextInput
            style={styles.amountInput}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={colors.subtext}
            autoFocus
          />
        </View>

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chipsWrap}>
          {cats.map((c) => {
            const active = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  hapticTap();
                  setCategoryId(c.id);
                }}
                style={[
                  styles.catChip,
                  active && { backgroundColor: `${c.color}1A`, borderColor: c.color },
                ]}
              >
                <Ionicons
                  name={c.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={active ? c.color : colors.subtext}
                />
                <Text style={[styles.catText, active && { color: c.color, fontWeight: '700' }]}>
                  {c.name}
                </Text>
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
                style={[styles.dayChip, active && styles.dayChipActive]}
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
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Örn. Kahvaltı, kurs ücreti..."
          placeholderTextColor={colors.subtext}
          maxLength={80}
        />

        <PrimaryButton
          label={editing ? 'Güncelle' : 'Kaydet'}
          onPress={submit}
          variant={type === 'income' ? 'income' : 'primary'}
          style={{ marginTop: 24 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function lastNDaysLocal(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(addDays(todayKey(), -i));
  }
  return out;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  typeText: { fontSize: 15, fontWeight: '600', color: colors.subtext },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: 18,
    marginBottom: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 64,
  },
  currency: { fontSize: 24, fontWeight: '800', color: colors.subtext, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.text, padding: 0 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catText: { fontSize: 13, color: colors.subtext, fontWeight: '600' },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  noteInput: {
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
