import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useStore } from '../store';
import { colors } from '../theme';
import {
  addDays,
  daysLeftLabel,
  daysUntil,
  formatDateTR,
  parseAmount,
  parseDateInput,
  todayKey,
} from '../utils';
import { CURRENCIES, Currency, formatMoney } from '../currency';
import { EXPENSE_CATEGORIES } from '../categories';
import { hapticSuccess, hapticTap, hapticWarn } from '../haptics';
import { requestReminderPermission } from '../notifications';

const COURSE_COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#22D3EE', '#F472B6', '#A78BFA'];
const EXAM_COLORS = ['#A78BFA', '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80'];
const REMINDER_TIMES = ['07:30', '18:00', '19:00', '20:00', '21:00', '22:00'];

function GoalInput({
  value,
  onCommit,
  suffix,
}: {
  value: number;
  onCommit: (mins: number) => void;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  return (
    <View style={styles.goalWrap}>
      <TextInput
        style={styles.goalInput}
        value={text}
        onChangeText={setText}
        keyboardType="number-pad"
        onEndEditing={() => {
          const mins = parseInt(text, 10);
          onCommit(Number.isFinite(mins) && mins >= 0 ? mins : value);
        }}
      />
      {!!suffix && <Text style={styles.goalUnit}>{suffix}</Text>}
    </View>
  );
}

function LimitInput({
  value,
  symbol,
  onCommit,
}: {
  value: number;
  symbol: string;
  onCommit: (amount: number) => void;
}) {
  const [text, setText] = useState(value > 0 ? String(value) : '');
  return (
    <View style={styles.goalWrap}>
      <TextInput
        style={[styles.goalInput, styles.limitInput]}
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.subtext}
        onEndEditing={() => {
          const n = parseAmount(text);
          onCommit(n > 0 ? n : 0);
          setText(n > 0 ? String(n) : '');
        }}
      />
      <Text style={styles.goalUnit}>{symbol}</Text>
    </View>
  );
}

export function SettingsScreen() {
  const {
    state,
    currency,
    updateSettings,
    addCourse,
    updateCourse,
    deleteCourse,
    addCustomCurrency,
    removeCustomCurrency,
    addExam,
    deleteExam,
    resetAll,
  } = useStore();
  const insets = useSafeAreaInsets();

  const [budgetText, setBudgetText] = useState(
    state.settings.monthlyBudget > 0 ? String(state.settings.monthlyBudget) : ''
  );
  const [tickText, setTickText] = useState(String(state.settings.dailyTickMinutes));

  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('180');
  const [newColor, setNewColor] = useState(COURSE_COLORS[0]);

  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exColor, setExColor] = useState(EXAM_COLORS[0]);

  const [showCustom, setShowCustom] = useState(false);
  const [ccCode, setCcCode] = useState('');
  const [ccSymbol, setCcSymbol] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccPosition, setCcPosition] = useState<'before' | 'after'>('after');
  const [ccDecimals, setCcDecimals] = useState(2);

  const allCurrencies = useMemo(
    () => [...CURRENCIES, ...state.settings.customCurrencies],
    [state.settings.customCurrencies]
  );

  const draftCurrency: Currency = {
    code: ccCode.toUpperCase() || 'XXX',
    symbol: ccSymbol || '¤',
    name: ccName || 'Özel',
    position: ccPosition,
    decimals: ccDecimals,
  };

  const saveBudget = () => {
    updateSettings({ monthlyBudget: parseAmount(budgetText) });
    Alert.alert('Kaydedildi', 'Aylık bütçe güncellendi.');
  };

  const saveTick = () => {
    const mins = parseInt(tickText, 10);
    updateSettings({ dailyTickMinutes: Number.isFinite(mins) && mins > 0 ? mins : 30 });
  };

  const saveGoal = (courseId: string, mins: number) => {
    if (!Number.isFinite(mins) || mins < 0) return;
    updateCourse(courseId, { weeklyGoalMinutes: mins });
  };

  const submitCourse = () => {
    const goal = parseInt(newGoal, 10);
    addCourse({
      name: newName,
      color: newColor,
      weeklyGoalMinutes: Number.isFinite(goal) && goal > 0 ? goal : 180,
    });
    setNewName('');
    setNewGoal('180');
  };

  const submitCustomCurrency = () => {
    const code = ccCode.trim().toUpperCase();
    if (code.length < 2) {
      Alert.alert('Kod gerekli', 'Para birimi için en az 2 harfli bir kod gir (örn. BTC).');
      return;
    }
    if (!ccSymbol.trim()) {
      Alert.alert('Sembol gerekli', 'Para birimi için bir sembol gir (örn. ₿).');
      return;
    }
    addCustomCurrency({
      code,
      symbol: ccSymbol.trim(),
      name: ccName.trim() || code,
      position: ccPosition,
      decimals: ccDecimals,
    });
    setCcCode('');
    setCcSymbol('');
    setCcName('');
    setCcPosition('after');
    setCcDecimals(2);
    setShowCustom(false);
  };

  const submitExam = () => {
    const date = parseDateInput(exDate);
    if (!date) {
      hapticWarn();
      Alert.alert('Geçersiz tarih', 'Tarihi 2027-06-15 veya 15.06.2027 biçiminde gir.');
      return;
    }
    addExam({ name: exName, date, color: exColor });
    hapticSuccess();
    setExName('');
    setExDate('');
  };

  const confirmDeleteExam = (id: string, name: string) => {
    Alert.alert(`"${name}" silinsin mi?`, 'Sınav hedefi kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteExam(id) },
    ]);
  };

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const ok = await requestReminderPermission();
      if (!ok) {
        hapticWarn();
        Alert.alert(
          'Bildirim izni yok',
          'Telefon Ayarları > Bildirimler bölümünden uygulamaya izin vererek hatırlatıcıyı açabilirsin.'
        );
        return;
      }
    }
    hapticTap();
    updateSettings({ reminderEnabled: value });
  };

  const setReminderTime = (time: string) => {
    hapticTap();
    updateSettings({ reminderTime: time });
  };

  const confirmDeleteCourse = (id: string, name: string) => {
    Alert.alert(
      `"${name}" silinsin mi?`,
      'Bu ders ve tüm ders kayıtları silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteCourse(id) },
      ]
    );
  };

  const confirmRemoveCurrency = (code: string, name: string) => {
    Alert.alert(`"${name}" kaldırılsın mı?`, 'Özel para birimini listeden çıkarır.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => removeCustomCurrency(code) },
    ]);
  };

  const confirmReset = () => {
    Alert.alert(
      'Tüm veriler silinsin mi?',
      'İşlemler, dersler ve ayarlar sıfırlanacak. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            resetAll();
            setBudgetText('');
            setTickText('30');
          },
        },
      ]
    );
  };

  const totalExpense = state.transactions
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ayarlar</Text>

      <Card
        title="Para Birimi"
        subtitle={`Şu an seçili: ${currency.name} (${currency.code})`}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.curScroll}>
          {allCurrencies.map((c) => {
            const active = c.code === currency.code;
            const isCustom = state.settings.customCurrencies.some((x) => x.code === c.code);
            return (
              <Pressable
                key={c.code}
                onPress={() => updateSettings({ currencyCode: c.code })}
                onLongPress={
                  isCustom ? () => confirmRemoveCurrency(c.code, c.name) : undefined
                }
                style={[styles.curChip, active && styles.curChipActive]}
              >
                <Text style={[styles.curSymbol, active && { color: '#fff' }]}>{c.symbol}</Text>
                <Text style={[styles.curCode, active && { color: '#fff' }]}>{c.code}</Text>
                {isCustom && (
                  <View style={styles.curDot}>
                    <Ionicons name="pencil" size={9} color={active ? '#fff' : colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.hint}>
          Yatay kaydırarak tüm para birimlerini gör. Uzun basarak özel birimi kaldırabilirsin.
        </Text>

        <Pressable
          style={styles.customToggle}
          onPress={() => setShowCustom((v) => !v)}
        >
          <Ionicons
            name={showCustom ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.customToggleText}>Kendi para birimini ekle</Text>
        </Pressable>

        {showCustom && (
          <View style={styles.customBox}>
            <View style={styles.customRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                value={ccCode}
                onChangeText={(t) => setCcCode(t.toUpperCase())}
                placeholder="Kod (BTC)"
                placeholderTextColor={colors.subtext}
                maxLength={5}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.input, styles.flex1, { marginLeft: 8 }]}
                value={ccSymbol}
                onChangeText={setCcSymbol}
                placeholder="Sembol (₿)"
                placeholderTextColor={colors.subtext}
                maxLength={4}
              />
            </View>
            <TextInput
              style={styles.input}
              value={ccName}
              onChangeText={setCcName}
              placeholder="Ad (Bitcoin)"
              placeholderTextColor={colors.subtext}
              maxLength={24}
            />
            <View style={styles.customRow}>
              <View style={styles.posGroup}>
                <Pressable
                  onPress={() => setCcPosition('before')}
                  style={[styles.posChip, ccPosition === 'before' && styles.posChipActive]}
                >
                  <Text
                    style={[styles.posText, ccPosition === 'before' && styles.posTextActive]}
                  >
                    Sembol başta
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCcPosition('after')}
                  style={[styles.posChip, ccPosition === 'after' && styles.posChipActive]}
                >
                  <Text
                    style={[styles.posText, ccPosition === 'after' && styles.posTextActive]}
                  >
                    Sembol sonda
                  </Text>
                </Pressable>
              </View>
              <View style={styles.posGroup}>
                {[0, 2].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setCcDecimals(d)}
                    style={[styles.posChip, ccDecimals === d && styles.posChipActive]}
                  >
                    <Text style={[styles.posText, ccDecimals === d && styles.posTextActive]}>
                      {d} hane
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={styles.preview}>
              Önizleme: {formatMoney(1234.5, draftCurrency)}
            </Text>
            <PrimaryButton label="Para Birimini Ekle" onPress={submitCustomCurrency} />
          </View>
        )}
      </Card>

      <Card
        title="Günlük Tik Süresi"
        subtitle="Ders çalışmayı tikleyince eklenen varsayılan süre"
        style={{ marginTop: 14 }}
      >
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={tickText}
            onChangeText={setTickText}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.subtext}
          />
          <Text style={styles.inlineUnit}>dakika</Text>
        </View>
        <PrimaryButton
          label="Kaydet"
          variant="ghost"
          onPress={saveTick}
          style={{ marginTop: 10 }}
        />
      </Card>

      <Card
        title="Aylık Bütçe"
        subtitle="Harcama grafiğinde ilerlemeni gösterir"
        style={{ marginTop: 14 }}
      >
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={budgetText}
            onChangeText={setBudgetText}
            keyboardType="decimal-pad"
            placeholder="Örn. 3000"
            placeholderTextColor={colors.subtext}
          />
          <Text style={styles.inlineUnit}>{currency.symbol}</Text>
        </View>
        <PrimaryButton label="Kaydet" variant="ghost" onPress={saveBudget} style={{ marginTop: 10 }} />
        <Text style={styles.hint}>Toplam gider: {formatMoney(totalExpense, currency)}</Text>
      </Card>

      <Card
        title="Kategori Limitleri"
        subtitle="Aylık limit koy; Bütçe ekranında takip edilir (0 = limit yok)"
        style={{ marginTop: 14 }}
      >
        {EXPENSE_CATEGORIES.map((c) => (
          <View key={c.id} style={styles.limitRow}>
            <View style={[styles.limitIcon, { backgroundColor: `${c.color}26` }]}>
              <Ionicons
                name={c.icon as keyof typeof Ionicons.glyphMap}
                size={15}
                color={c.color}
              />
            </View>
            <Text style={styles.limitName} numberOfLines={1}>
              {c.name}
            </Text>
            <LimitInput
              value={state.settings.categoryBudgets[c.id] ?? 0}
              symbol={currency.symbol}
              onCommit={(amount) =>
                updateSettings({
                  categoryBudgets: {
                    ...state.settings.categoryBudgets,
                    [c.id]: amount,
                  },
                })
              }
            />
          </View>
        ))}
      </Card>

      <Card
        title="Sınav Hedefleri"
        subtitle="YÖS, SAT gibi sınavlar için geri sayım; ana sayfada görünür"
        style={{ marginTop: 14 }}
      >
        {state.exams.length === 0 && (
          <Text style={styles.hint}>Henüz hedef yok. Aşağıdan ekleyebilirsin.</Text>
        )}
        {state.exams.map((ex) => (
          <View key={ex.id} style={styles.examRow}>
            <View style={[styles.examDot, { backgroundColor: ex.color }]} />
            <View style={styles.examInfo}>
              <Text style={styles.examName} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={styles.examDate}>
                {formatDateTR(ex.date)} · {daysLeftLabel(daysUntil(ex.date))}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => confirmDeleteExam(ex.id, ex.name)}>
              <Ionicons name="trash-outline" size={18} color={colors.expense} />
            </Pressable>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.addCourseTitle}>Yeni sınav hedefi</Text>
        <TextInput
          style={styles.input}
          value={exName}
          onChangeText={setExName}
          placeholder="Sınav adı (örn. YÖS 2027)"
          placeholderTextColor={colors.subtext}
          maxLength={24}
        />
        <TextInput
          style={styles.input}
          value={exDate}
          onChangeText={setExDate}
          placeholder="Tarih (2027-06-15 veya 15.06.2027)"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
        />
        <View style={styles.quickRow}>
          {[30, 90, 180].map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                hapticTap();
                setExDate(addDays(todayKey(), d));
              }}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>+{d} gün</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.colorRow}>
          {EXAM_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setExColor(col)}
              style={[
                styles.colorChip,
                { backgroundColor: col },
                exColor === col && styles.colorChipActive,
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          label="Sınav Hedefi Ekle"
          onPress={submitExam}
          disabled={exName.trim().length === 0 || exDate.trim().length === 0}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card
        title="Hatırlatıcı"
        subtitle="Her gün seçtiğin saatte günlük özet bildirimi"
        style={{ marginTop: 14 }}
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Günlük hatırlatıcı</Text>
          <Switch
            value={state.settings.reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.quickRow}>
          {REMINDER_TIMES.map((t) => {
            const active = state.settings.reminderTime === t;
            return (
              <Pressable
                key={t}
                onPress={() => setReminderTime(t)}
                style={[styles.quickChip, active && styles.quickChipActive]}
              >
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          Seçili saat: {state.settings.reminderTime}
          {state.settings.reminderEnabled ? '' : ' · hatırlatıcı kapalı'}
        </Text>
      </Card>

      <Card title="Dersler" subtitle="Ad, haftalık hedef ve renk ayarla" style={{ marginTop: 14 }}>
        {state.courses.map((c) => (
          <View key={c.id} style={styles.courseRow}>
            <View style={[styles.courseDot, { backgroundColor: c.color }]} />
            <Text style={styles.courseName} numberOfLines={1}>
              {c.name}
            </Text>
            <GoalInput
              value={c.weeklyGoalMinutes}
              onCommit={(mins) => saveGoal(c.id, mins)}
              suffix="dk/hafta"
            />
            <Pressable hitSlop={8} onPress={() => confirmDeleteCourse(c.id, c.name)}>
              <Ionicons name="trash-outline" size={18} color={colors.expense} />
            </Pressable>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.addCourseTitle}>Yeni ders ekle</Text>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Ders adı (örn. Türkçe)"
          placeholderTextColor={colors.subtext}
          maxLength={24}
        />
        <TextInput
          style={styles.input}
          value={newGoal}
          onChangeText={setNewGoal}
          keyboardType="number-pad"
          placeholder="Haftalık hedef (dk)"
          placeholderTextColor={colors.subtext}
        />
        <View style={styles.colorRow}>
          {COURSE_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setNewColor(col)}
              style={[
                styles.colorChip,
                { backgroundColor: col },
                newColor === col && styles.colorChipActive,
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          label="Ders Ekle"
          onPress={submitCourse}
          disabled={newName.trim().length === 0}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card title="Veri" subtitle="Tüm veriler telefonunda saklanır" style={{ marginTop: 14 }}>
        <PrimaryButton label="Tüm Verileri Sıfırla" variant="danger" onPress={confirmReset} />
      </Card>

      <Text style={styles.footer}>Bilgi Takip · v1.1</Text>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
    color: colors.text,
    marginTop: 8,
  },
  inlineUnit: { marginLeft: 10, fontSize: 14, fontWeight: '700', color: colors.subtext },
  hint: { fontSize: 11, color: colors.subtext, marginTop: 8, lineHeight: 16 },
  curScroll: { marginBottom: 4, flexGrow: 0 },
  curChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  curChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  curSymbol: { fontSize: 18, fontWeight: '800', color: colors.text },
  curCode: { fontSize: 11, fontWeight: '700', color: colors.subtext, marginTop: 2 },
  curDot: { position: 'absolute', top: 6, right: 6 },
  customToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  customToggleText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  customBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  customRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  posGroup: { flexDirection: 'row', gap: 8, marginRight: 8 },
  posChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  posText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
  posTextActive: { color: '#fff' },
  preview: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 12, marginBottom: 10 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  courseDot: { width: 14, height: 14, borderRadius: 7 },
  courseName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  goalWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: {
    width: 56,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    height: 36,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text,
  },
  goalUnit: { fontSize: 11, color: colors.subtext },
  limitInput: { width: 76 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  limitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  addCourseTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  colorRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  colorChip: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'transparent' },
  colorChipActive: { borderColor: colors.text },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  examDot: { width: 12, height: 12, borderRadius: 6 },
  examInfo: { flex: 1 },
  examName: { fontSize: 14, fontWeight: '700', color: colors.text },
  examDate: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  quickChipTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  footer: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginTop: 20 },
});
