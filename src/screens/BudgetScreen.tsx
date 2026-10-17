import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { GroupedBarChart } from '../components/GroupedBarChart';
import { CategoryDonut, CategoryLegend } from '../components/CategoryDonut';
import { EXPENSE_CATEGORIES, categoryById } from '../categories';
import { useStore } from '../store';
import { colors, shadow } from '../theme';
import { SavingsGoal, TxType } from '../types';
import { formatMoney } from '../currency';
import { hapticSuccess, hapticTap } from '../haptics';
import { formatDayLabel, monthOptions, parseAmount } from '../utils';

export function BudgetScreen() {
  const { state, deleteTransaction, updateGoal, deleteGoal, currency } = useStore();
  const insets = useSafeAreaInsets();
  const money = (v: number) => formatMoney(v, currency);

  const months = useMemo(() => monthOptions(6), []);
  const [month, setMonth] = useState(months[0]);
  const [filter, setFilter] = useState<'all' | TxType>('all');
  const [query, setQuery] = useState('');

  const monthTx = useMemo(
    () =>
      state.transactions
        .filter((t) => t.date.startsWith(month))
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.transactions, month]
  );

  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0);
  const net = income - expense;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthTx.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!q) return true;
      const cat = categoryById(t.categoryId);
      return (
        cat.name.toLowerCase().includes(q) ||
        (t.note?.toLowerCase().includes(q) ?? false) ||
        t.amount.toFixed(2).includes(q)
      );
    });
  }, [monthTx, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const t of visible) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  const donutData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== 'expense') continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, value]) => ({ name: categoryById(id).name, value, color: categoryById(id).color }));
  }, [monthTx]);

  const barLabels = useMemo(() => [...months].reverse().map((m) => m.slice(5)), [months]);
  const barSeries = useMemo(() => {
    const rev = [...months].reverse();
    return [
      {
        label: 'Gider',
        color: colors.expense,
        data: rev.map((m) =>
          state.transactions
            .filter((t) => t.date.startsWith(m) && t.type === 'expense')
            .reduce((a, t) => a + t.amount, 0)
        ),
      },
      {
        label: 'Gelir',
        color: colors.income,
        data: rev.map((m) =>
          state.transactions
            .filter((t) => t.date.startsWith(m) && t.type === 'income')
            .reduce((a, t) => a + t.amount, 0)
        ),
      },
    ];
  }, [state.transactions, months]);

  const hasBarData = barSeries.some((s) => s.data.some((v) => v > 0));

  const prevExpense = useMemo(
    () =>
      state.transactions
        .filter((t) => t.date.startsWith(months[1]) && t.type === 'expense')
        .reduce((a, t) => a + t.amount, 0),
    [state.transactions, months]
  );
  const expenseDiffPct =
    prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null;

  const limits = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((cat) => ({
        cat,
        limit: state.settings.categoryBudgets[cat.id] ?? 0,
        spent: monthTx
          .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
          .reduce((a, t) => a + t.amount, 0),
      })).filter((x) => x.limit > 0),
    [state.settings.categoryBudgets, monthTx]
  );

  const confirmDelete = (id: string) => {
    Alert.alert('İşlem silinsin mi?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);
  };

  const quickAddToGoal = (goal: SavingsGoal) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Bilgi', 'Hızlı birikim ekleme şimdilik iPhone’da kullanılabilir.');
      return;
    }
    Alert.prompt(
      `${goal.name} · Birikim ekle`,
      `Kalan: ${money(Math.max(0, goal.target - goal.saved))}`,
      (text) => {
        const amount = parseAmount(text ?? '');
        if (amount > 0) {
          updateGoal(goal.id, { saved: goal.saved + amount });
          hapticSuccess();
        }
      },
      'plain-text',
      '',
      'decimal-pad'
    );
  };

  const confirmDeleteGoal = (id: string, name: string) => {
    Alert.alert(`"${name}" silinsin mi?`, 'Birikim hedefi kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Bütçe</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
        {months.map((m) => {
          const active = m === month;
          return (
            <Pressable
              key={m}
              onPress={() => setMonth(m)}
              style={[styles.monthChip, active && styles.monthChipActive]}
            >
              <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>
                {m.slice(5)}/{m.slice(2, 4)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: colors.incomeSoft }]}>
          <Text style={styles.summaryLabel}>Gelir</Text>
          <Text
            style={[styles.summaryValue, { color: colors.income }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {money(income)}
          </Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: colors.expenseSoft }]}>
          <Text style={styles.summaryLabel}>Gider</Text>
          <Text
            style={[styles.summaryValue, { color: colors.expense }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {money(expense)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryBox,
            { backgroundColor: net >= 0 ? colors.primarySoft : colors.warningSoft },
          ]}
        >
          <Text style={styles.summaryLabel}>Net</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: net >= 0 ? colors.primary : colors.warning },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {money(net)}
          </Text>
        </View>
      </View>

      {expenseDiffPct !== null && (
        <View style={styles.compareRow}>
          <Ionicons
            name={expenseDiffPct <= 0 ? 'trending-down' : 'trending-up'}
            size={14}
            color={expenseDiffPct <= 0 ? colors.income : colors.expense}
          />
          <Text style={styles.compareText}>
            Geçen aya göre harcama{' '}
            <Text
              style={{
                color: expenseDiffPct <= 0 ? colors.income : colors.expense,
                fontWeight: '800',
              }}
            >
              %{Math.abs(expenseDiffPct).toFixed(0)}
            </Text>{' '}
            {expenseDiffPct <= 0 ? 'azaldı' : 'arttı'}
          </Text>
        </View>
      )}

      <Card
        title="Kategori Limitleri"
        subtitle="Aylık harcama limitleri"
        style={{ marginTop: 14 }}
        right={
          <Pressable onPress={() => router.push('/settings')}>
            <Text style={styles.link}>Ayarla</Text>
          </Pressable>
        }
      >
        {limits.length === 0 ? (
          <Text style={styles.limitEmpty}>
            Henüz limit yok. Ayarlar → Kategori Limitleri’nden belirleyebilirsin.
          </Text>
        ) : (
          limits.map(({ cat, limit, spent }) => {
            const pct = Math.min((spent / limit) * 100, 100);
            const over = spent > limit;
            const near = !over && pct >= 80;
            const barColor = over ? colors.expense : near ? colors.warning : colors.income;
            return (
              <View key={cat.id} style={styles.limitRow}>
                <View style={styles.limitHead}>
                  <View style={[styles.limitIcon, { backgroundColor: `${cat.color}26` }]}>
                    <Ionicons
                      name={cat.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={cat.color}
                    />
                  </View>
                  <Text style={styles.limitName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.limitVal, { color: barColor }]}>
                    {money(spent)} / {money(limit)}
                  </Text>
                </View>
                <View style={styles.limitTrack}>
                  <View
                    style={[
                      styles.limitFill,
                      { width: `${pct}%` as `${number}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card
        title="Birikim Hedefleri"
        subtitle="Hedefe ne kadar kaldığını takip et"
        style={{ marginTop: 14 }}
        right={
          <Pressable
            onPress={() => {
              hapticTap();
              router.push('/goal');
            }}
          >
            <Text style={styles.link}>Yeni</Text>
          </Pressable>
        }
      >
        {state.goals.length === 0 ? (
          <Text style={styles.limitEmpty}>
            Henüz hedef yok. “Yeni” ile birikim hedefi oluşturabilir, buradan para
            ekleyebilirsin.
          </Text>
        ) : (
          state.goals.map((g) => {
            const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
            const done = g.target > 0 && g.saved >= g.target;
            return (
              <View key={g.id} style={styles.goalRow}>
                <View style={styles.goalHead}>
                  <View style={[styles.goalBadge, { backgroundColor: `${g.color}26` }]}>
                    <Ionicons name="flag" size={14} color={g.color} />
                  </View>
                  <Text style={styles.goalName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={[styles.goalVal, done && { color: colors.income }]} numberOfLines={1}>
                    {money(g.saved)} / {money(g.target)}
                  </Text>
                </View>
                <View style={styles.limitTrack}>
                  <View
                    style={[
                      styles.limitFill,
                      {
                        width: `${pct}%` as `${number}%`,
                        backgroundColor: done ? colors.income : g.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.goalFoot}>
                  <Text style={styles.goalSub}>
                    {done ? 'Hedefe ulaşıldı' : `Kalan: ${money(g.target - g.saved)}`}
                  </Text>
                  <View style={styles.goalActions}>
                    <Pressable onPress={() => quickAddToGoal(g)} style={styles.goalAddBtn}>
                      <Ionicons name="add" size={13} color={colors.primary} />
                      <Text style={styles.goalAddText}>Ekle</Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDeleteGoal(g.id, g.name)}>
                      <Ionicons name="trash-outline" size={16} color={colors.subtext} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {hasBarData && (
        <Card title="Son 6 Ay" subtitle="Gelir / Gider karşılaştırması" style={{ marginTop: 14 }}>
          <GroupedBarChart labels={barLabels} series={barSeries} currency={currency} />
        </Card>
      )}

      {donutData.length > 0 && (
        <Card title="Kategori Dağılımı" subtitle="Bu ayın harcamaları" style={{ marginTop: 14 }}>
          <View style={styles.donutWrap}>
            <CategoryDonut data={donutData} size={164} centerLabel="Gider" currency={currency} />
          </View>
          <View style={{ marginTop: 16 }}>
            <CategoryLegend data={donutData} currency={currency} />
          </View>
        </Card>
      )}

      <Card title="İşlemler" style={{ marginTop: 14 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.subtext} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Ara: not, kategori veya tutar"
            placeholderTextColor={colors.subtext}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.subtext} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'Tümü' },
              { key: 'expense', label: 'Gider' },
              { key: 'income', label: 'Gelir' },
            ] as const
          ).map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Pressable style={styles.addBtn} onPress={() => router.push('/add-transaction')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Ekle</Text>
          </Pressable>
        </View>

        {grouped.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="Bu ayda işlem yok"
            subtitle="İlk giderini veya gelirini ekleyerek başla."
          />
        ) : (
          grouped.map(([date, items]) => (
            <View key={date} style={{ marginTop: 8 }}>
              <Text style={styles.dayHeader}>{formatDayLabel(date)}</Text>
              {items.map((t) => {
                const cat = categoryById(t.categoryId);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      hapticTap();
                      router.push({ pathname: '/add-transaction', params: { id: t.id } });
                    }}
                    onLongPress={() => confirmDelete(t.id)}
                    style={styles.txRow}
                  >
                    <View style={[styles.txIcon, { backgroundColor: `${cat.color}1A` }]}>
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={cat.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {!!t.note && (
                        <Text style={styles.txSub} numberOfLines={1}>
                          {t.note}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: t.type === 'income' ? colors.income : colors.expense },
                      ]}
                      numberOfLines={1}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {money(t.amount)}
                    </Text>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(t.id)} style={styles.trash}>
                      <Ionicons name="trash-outline" size={16} color={colors.subtext} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </Card>

      <Text style={styles.hint}>İpucu: İşlemlere uzun basarak silebilirsin.</Text>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  monthScroll: { marginBottom: 12, flexGrow: 0 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  monthChipTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryBox: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { fontSize: 12, color: colors.subtext, marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '800' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 2 },
  compareText: { fontSize: 12, color: colors.subtext },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  limitEmpty: { fontSize: 12, color: colors.subtext, lineHeight: 18 },
  limitRow: { marginBottom: 12 },
  limitHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  limitVal: { fontSize: 12, fontWeight: '700' },
  limitTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  limitFill: { height: '100%', borderRadius: 3 },
  goalRow: { marginBottom: 14 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  goalVal: { fontSize: 12, fontWeight: '700', color: colors.subtext, flexShrink: 1 },
  goalFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalSub: { fontSize: 11, color: colors.subtext },
  goalActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goalAddText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  donutWrap: { alignItems: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primarySoft, borderColor: 'rgba(167,139,250,0.4)' },
  filterText: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  filterTextActive: { color: colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    ...shadow,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dayHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  txSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '700', flexShrink: 1, maxWidth: '48%', textAlign: 'right' },
  trash: { paddingLeft: 6 },
  hint: { fontSize: 11, color: colors.subtext, textAlign: 'center', marginTop: 10 },
});
