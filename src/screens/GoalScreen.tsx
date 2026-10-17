import React, { useState } from 'react';
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
import { parseAmount } from '../utils';
import { hapticSuccess, hapticTap } from '../haptics';
import { PrimaryButton } from '../components/PrimaryButton';

const GOAL_COLORS = ['#A78BFA', '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#F97316'];

export function GoalScreen() {
  const { currency, addGoal } = useStore();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);

  const submit = () => {
    const target = parseAmount(targetText);
    if (target <= 0) {
      Alert.alert('Hedef tutar gir', 'Sıfırdan büyük bir hedef tutar yaz.');
      return;
    }
    addGoal({ name, target, color });
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
        <Text style={styles.headerTitle}>Yeni Birikim Hedefi</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Ionicons name="flag" size={20} color={colors.primary} />
          <Text style={styles.bannerText}>
            Bir hedef belirle, birikimlerini takip et. Bütçe ekranından hedefe para ekleyebilirsin.
          </Text>
        </View>

        <Text style={styles.label}>Hedef adı</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Örn. Yeni telefon, Tatil..."
          placeholderTextColor={colors.subtext}
          maxLength={32}
        />

        <Text style={styles.label}>Hedef tutar</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={targetText}
            onChangeText={setTargetText}
            keyboardType="decimal-pad"
            placeholder="Örn. 1500"
            placeholderTextColor={colors.subtext}
          />
          <Text style={styles.unit}>{currency.symbol}</Text>
        </View>

        <Text style={styles.label}>Renk</Text>
        <View style={styles.colorRow}>
          {GOAL_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => {
                hapticTap();
                setColor(col);
              }}
              style={[
                styles.colorChip,
                { backgroundColor: col },
                color === col && styles.colorChipActive,
              ]}
            />
          ))}
        </View>

        <PrimaryButton
          label="Hedefi Oluştur"
          onPress={submit}
          disabled={name.trim().length === 0 || targetText.trim().length === 0}
          style={{ marginTop: 24 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.primarySoft,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: 20,
    marginBottom: 8,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  unit: { marginLeft: 10, fontSize: 18, fontWeight: '800', color: colors.primary },
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
  colorRow: { flexDirection: 'row', gap: 10 },
  colorChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorChipActive: { borderColor: colors.text },
});
