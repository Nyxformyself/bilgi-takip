import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressRing } from '../components/ProgressRing';
import { TrendChart } from '../components/TrendChart';
import { WeatherCard } from '../components/WeatherCard';
import { categoryById } from '../categories';
import { useStore } from '../store';
import { colors, shadow } from '../theme';
import { formatMoney } from '../currency';
import { hapticTap } from '../haptics';
import {
  currentMonthKey,
  daysLeftLabel,
  daysUntil,
  formatClock,
  formatDateTR,
  formatDayLabel,
  formatLongDay,
  formatMonthLabel,
  greetingFor,
  hhmmToMinutes,
  lastNDays,
  minutesToHHMM,
  streakDays,
  todayKey,
  weekStartKey,
  weekdayIndex,
} from '../utils';

const RANGES = [
  { days: 7, label: '7G' },
  { days: 30, label: '30G' },
  { days: 90, label: '90G' },
];

const WEEK_LETTERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatDuration(mins: number): string {
  if (mins <= 0) return '0 dk';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

type Shortcut = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

export function DashboardScreen() {
  const { state, currency } = useStore();
  const insets = useSafeAreaInsets();
  const money = (v: number) => formatMoney(v, currency);

  const [hour, setHour] = useState<number | null>(null);
  const [clockText, setClockText] = useState('');
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setHour(d.getHours());
      setClockText(formatClock(d));
      setDateLabel(formatLongDay(d));
    };
    update();
    const id = setInterval(update, 20_000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const month = currentMonthKey();

  const monthTx = useMemo(
    () => state.transactions.filter((t) => t.date.startsWith(month)),
    [state.transactions, month]
  );
  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  const budget = state.settings.monthlyBudget;
  const budgetPct = budget > 0 ? Math.min((expense / budget) * 100, 999) : 0;
  const overBudget = budget > 0 && expense > budget;

  const [rangeDays, setRangeDays] = useState(7);

  const weekStart = weekStartKey(today);
  const weekMinutesByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of state.logs) {
      if (log.date >= weekStart) {
        map.set(log.courseId, (map.get(log.courseId) ?? 0) + log.minutes);
      }
    }
    return map;
  }, [state.logs, weekStart]);

  const streak = useMemo(
    () => streakDays(new Set(state.logs.map((l) => l.date))),
    [state.logs]
  );

  const dailyMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of state.logs) {
      map.set(log.date, (map.get(log.date) ?? 0) + log.minutes);
    }
    return map;
  }, [state.logs]);

  const todayMinutes = dailyMinutes.get(today) ?? 0;
  const dailyGoal = Math.max(
    30,
    Math.round(state.courses.reduce((a, c) => a + c.weeklyGoalMinutes, 0) / 7)
  );
  const dayProgress = dailyGoal > 0 ? Math.min(1, todayMinutes / dailyGoal) : 0;

  const weekDates = useMemo(() => lastNDays(7), []);
  const weekTotal = useMemo(
    () => weekDates.reduce((a, d) => a + (dailyMinutes.get(d) ?? 0), 0),
    [weekDates, dailyMinutes]
  );
  const maxWeek = Math.max(1, ...weekDates.map((d) => dailyMinutes.get(d) ?? 0));

  const rangeDates = useMemo(() => lastNDays(rangeDays), [rangeDays]);
  const rangeValues = useMemo(
    () => rangeDates.map((d) => dailyMinutes.get(d) ?? 0),
    [rangeDates, dailyMinutes]
  );
  const rangeTotal = rangeValues.reduce((a, v) => a + v, 0);

  const todayWake = state.wakeTimes[today];
  const wakeAvg = useMemo(() => {
    const values = lastNDays(7)
      .map((d) => hhmmToMinutes(state.wakeTimes[d] ?? ''))
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, v) => a + v, 0) / values.length);
  }, [state.wakeTimes]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== 'expense') continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    const sum = [...map.values()].reduce((a, v) => a + v, 0);
    return [...map.entries()]
      .map(([id, total]) => ({
        cat: categoryById(id),
        total,
        pct: sum > 0 ? (total / sum) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [monthTx]);

  const recent = useMemo(
    () =>
      [...state.transactions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    [state.transactions]
  );

  const monthTxCount = monthTx.length;

  const exams = useMemo(
    () => [...state.exams].sort((a, b) => a.date.localeCompare(b.date)),
    [state.exams]
  );
  const nextExam = exams.find((e) => daysUntil(e.date) >= 0) ?? exams[0];

  const shortcuts: Shortcut[] = [
    {
      icon: 'arrow-down-circle',
      label: 'Gider Ekle',
      color: colors.expense,
      onPress: () =>
        router.push({ pathname: '/add-transaction', params: { type: 'expense' } }),
    },
    {
      icon: 'arrow-up-circle',
      label: 'Gelir Ekle',
      color: colors.income,
      onPress: () =>
        router.push({ pathname: '/add-transaction', params: { type: 'income' } }),
    },
    {
      icon: 'book',
      label: 'Ders Kaydı',
      color: colors.primary,
      onPress: () => router.push('/log-lesson'),
    },
    {
      icon: 'timer',
      label: 'Sayaç',
      color: colors.warning,
      onPress: () => router.push('/study-timer'),
    },
    {
      icon: 'alarm',
      label: 'Kalkış',
      color: '#22D3EE',
      onPress: () => router.push({ pathname: '/wake-time', params: { date: today } }),
    },
    {
      icon: 'wallet',
      label: 'Bütçe',
      color: '#818CF8',
      onPress: () => router.push('/budget'),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{hour === null ? 'Merhaba' : greetingFor(hour)} 👋</Text>
          <Text style={styles.headerTitle}>Genel Bakış</Text>
        </View>
        <View style={styles.clockChip}>
          <Ionicons name="time-outline" size={13} color={colors.primary} />
          <Text style={styles.clockText}>{clockText}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <WeatherCard dateLabel={dateLabel} />

      <View style={styles.totalCard}>
        <View pointerEvents="none" style={styles.glowCircle} />
        <View pointerEvents="none" style={styles.glowCircleSmall} />

        <View style={styles.totalHead}>
          <Text style={styles.totalLabel}>Toplam Baki</Text>
          <View style={styles.monthChip}>
            <Text style={styles.monthChipText}>{formatMonthLabel(month)}</Text>
          </View>
        </View>

        <Text
          style={[styles.totalValue, balance < 0 && { color: colors.expense }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {money(balance)}
        </Text>

        <View style={styles.miniStatsRow}>
          <View style={styles.miniStat}>
            <View style={styles.miniStatHead}>
              <Ionicons name="arrow-down" size={12} color={colors.income} />
              <Text style={styles.miniStatLabel}>Gelir</Text>
            </View>
            <Text
              style={[styles.miniStatValue, { color: colors.income }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(income)}
            </Text>
          </View>
          <View style={styles.miniStat}>
            <View style={styles.miniStatHead}>
              <Ionicons name="arrow-up" size={12} color={colors.expense} />
              <Text style={styles.miniStatLabel}>Gider</Text>
            </View>
            <Text
              style={[styles.miniStatValue, { color: colors.expense }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(expense)}
            </Text>
          </View>
        </View>

        {budget > 0 ? (
          <View style={styles.budgetWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(budgetPct, 100)}%` as `${number}%`,
                    backgroundColor: overBudget ? colors.expense : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetHint}>
              {overBudget
                ? `Bütçeyi aştın! ${money(expense - budget)} fazla`
                : `Bütçe: ${money(expense)} / ${money(budget)} · %${budgetPct.toFixed(0)}`}
            </Text>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/settings')} style={styles.budgetCta}>
            <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.budgetCtaText}>Aylık bütçe belirle</Text>
          </Pressable>
        )}
      </View>

      <Card
        title="Hedefler"
        subtitle="Sınav geri sayımı"
        style={{ marginTop: 14 }}
        right={
          <Pressable
            onPress={() => {
              hapticTap();
              router.push('/settings');
            }}
          >
            <Text style={styles.link}>Ekle</Text>
          </Pressable>
        }
      >
        {exams.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="Hedef yok"
            subtitle="Sınav hedefleri ekle; geri sayımı burada gör."
          />
        ) : (
          <>
            {nextExam && (
              <View style={[styles.nextExam, { borderColor: `${nextExam.color}55` }]}>
                <View style={[styles.nextExamIcon, { backgroundColor: `${nextExam.color}26` }]}>
                  <Ionicons name="flag" size={18} color={nextExam.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextExamName} numberOfLines={1}>
                    {nextExam.name}
                  </Text>
                  <Text style={styles.nextExamDate}>{formatDateTR(nextExam.date)}</Text>
                </View>
                <View style={[styles.nextExamBadge, { backgroundColor: `${nextExam.color}26` }]}>
                  <Text style={[styles.nextExamDays, { color: nextExam.color }]}>
                    {Math.max(0, daysUntil(nextExam.date))}
                  </Text>
                  <Text style={[styles.nextExamDaysSub, { color: nextExam.color }]}>gün</Text>
                </View>
              </View>
            )}
            {exams
              .filter((e) => e.id !== nextExam?.id)
              .map((e) => (
                <View key={e.id} style={styles.examMiniRow}>
                  <View style={[styles.examMiniDot, { backgroundColor: e.color }]} />
                  <Text style={styles.examMiniName} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={styles.examMiniDate}>{formatDateTR(e.date)}</Text>
                  <Text style={styles.examMiniDays}>{daysLeftLabel(daysUntil(e.date))}</Text>
                </View>
              ))}
          </>
        )}
      </Card>

      <Card
        title="Verimlilik"
        subtitle="Bugünkü ders durumu"
        right={
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>🔥 {streak} gün</Text>
          </View>
        }
        style={{ marginTop: 14 }}
      >
        <View style={styles.prodRow}>
          <ProgressRing size={132} strokeWidth={12} progress={dayProgress}>
            <Text style={styles.prodPct}>%{Math.round(dayProgress * 100)}</Text>
            <Text style={styles.prodPctSub}>bugün</Text>
          </ProgressRing>
          <View style={styles.prodStats}>
            <View style={styles.prodStatItem}>
              <Text style={styles.prodStatLabel}>Bugün</Text>
              <Text style={styles.prodStatValue}>{formatDuration(todayMinutes)}</Text>
            </View>
            <View style={styles.prodStatItem}>
              <Text style={styles.prodStatLabel}>Günlük hedef</Text>
              <Text style={styles.prodStatValue}>{formatDuration(dailyGoal)}</Text>
            </View>
            <View style={styles.prodStatItem}>
              <Text style={styles.prodStatLabel}>Bu hafta</Text>
              <Text style={styles.prodStatValue}>{formatDuration(weekTotal)}</Text>
            </View>
          </View>
        </View>
      </Card>

      <Pressable
        style={styles.wakeCard}
        onPress={() => {
          hapticTap();
          router.push({ pathname: '/wake-time', params: { date: today } });
        }}
      >
        <View style={styles.wakeIcon}>
          <Ionicons name="alarm" size={20} color="#22D3EE" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.wakeLabel}>Kalkış Saati</Text>
          <Text style={styles.wakeSub}>
            {wakeAvg !== null
              ? `Son 7 gün ortalaması ${minutesToHHMM(wakeAvg)}`
              : 'Bugün kaçta kalktın? Yaz ve ortalamanı gör'}
          </Text>
        </View>
        <Text style={styles.wakeValue}>{todayWake ?? '—'}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
      </Pressable>

      <Card
        title="Dersler"
        subtitle="Bu haftanın hedef durumu"
        right={
          <Pressable onPress={() => router.push('/lessons')}>
            <Text style={styles.link}>Tümü</Text>
          </Pressable>
        }
        style={{ marginTop: 14 }}
      >
        {state.courses.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="Ders yok"
            subtitle="Ayarlar ekranından ders ekleyebilirsin."
          />
        ) : (
          state.courses.map((c) => {
            const done = weekMinutesByCourse.get(c.id) ?? 0;
            const pct =
              c.weeklyGoalMinutes > 0
                ? Math.min((done / c.weeklyGoalMinutes) * 100, 100)
                : 0;
            return (
              <Pressable
                key={c.id}
                style={styles.courseRow}
                onPress={() => {
                  hapticTap();
                  router.push({ pathname: '/log-lesson', params: { courseId: c.id } });
                }}
              >
                <View style={[styles.courseIcon, { backgroundColor: `${c.color}26` }]}>
                  <Ionicons name="book" size={17} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.courseSub}>
                    Haftalık hedef {formatDuration(c.weeklyGoalMinutes)}
                  </Text>
                </View>
                <View style={styles.courseRight}>
                  <Text style={styles.courseVal}>{formatDuration(done)}</Text>
                  <Text style={styles.coursePct}>%{pct.toFixed(0)} tamam</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </Card>

      <Card
        title="Haftalık Aktivite"
        subtitle="Son 7 gün ders dakikaları"
        right={<Text style={styles.weekTotal}>Bu hafta {formatDuration(weekTotal)}</Text>}
        style={{ marginTop: 14 }}
      >
        <View style={styles.weekBars}>
          {weekDates.map((d) => {
            const mins = dailyMinutes.get(d) ?? 0;
            const h = Math.max(6, Math.round((mins / maxWeek) * 56));
            const isToday = d === today;
            return (
              <View key={d} style={styles.barCol}>
                <Text style={styles.barValue}>{mins > 0 ? mins : ''}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor:
                        mins > 0
                          ? isToday
                            ? colors.primary
                            : 'rgba(167,139,250,0.55)'
                          : colors.border,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                  {WEEK_LETTERS[weekdayIndex(d)]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card
        title="Ders Performansı"
        subtitle={`Son ${rangeDays} günde ${formatDuration(rangeTotal)}`}
        right={
          <View style={styles.rangeRow}>
            {RANGES.map((r) => {
              const active = r.days === rangeDays;
              return (
                <Pressable
                  key={r.days}
                  onPress={() => {
                    hapticTap();
                    setRangeDays(r.days);
                  }}
                  style={[styles.rangeChip, active && styles.rangeChipActive]}
                >
                  <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        style={{ marginTop: 14 }}
      >
        <TrendChart values={rangeValues} height={140} />
        <View style={styles.chartFooter}>
          <Text style={styles.chartAxis}>{rangeDays} gün önce</Text>
          <Text style={styles.chartAxis}>Bugün</Text>
        </View>
      </Card>

      <Card
        title="Kategorilerim"
        subtitle="Bu ayın harcama dağılımı"
        style={{ marginTop: 14 }}
      >
        {topCategories.length === 0 ? (
          <EmptyState
            icon="pie-chart-outline"
            title="Harcama yok"
            subtitle="Bu ay henüz gider eklemedin."
          />
        ) : (
          <View style={styles.catGrid}>
            {topCategories.map(({ cat, total, pct }) => (
              <View key={cat.id} style={styles.catCard}>
                <View style={[styles.catIcon, { backgroundColor: `${cat.color}26` }]}>
                  <Ionicons
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={cat.color}
                  />
                </View>
                <Text style={styles.catName} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={styles.catAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {money(total)}
                </Text>
                <Text style={styles.catPct}>%{pct.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="Kısayollar" style={{ marginTop: 14 }}>
        <View style={styles.shortcutGrid}>
          {shortcuts.map((s) => (
            <Pressable
              key={s.label}
              style={styles.shortcutTile}
              onPress={() => {
                hapticTap();
                s.onPress();
              }}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: `${s.color}26` }]}>
                <Ionicons name={s.icon} size={19} color={s.color} />
              </View>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card
        title="Son İşlemler"
        subtitle={`${formatMonthLabel(month)} · ${monthTxCount} işlem`}
        style={{ marginTop: 14 }}
        right={
          <Pressable onPress={() => router.push('/budget')}>
            <Text style={styles.link}>Tümü</Text>
          </Pressable>
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Henüz işlem yok"
            subtitle="Kısayollardan ilk gelirini veya giderini ekle."
          />
        ) : (
          recent.map((t) => {
            const cat = categoryById(t.categoryId);
            return (
              <Pressable
                key={t.id}
                style={styles.txRow}
                onPress={() => {
                  hapticTap();
                  router.push({ pathname: '/add-transaction', params: { id: t.id } });
                }}
              >
                <View style={[styles.txIcon, { backgroundColor: `${cat.color}26` }]}>
                  <Ionicons
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={cat.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{cat.name}</Text>
                  <Text style={styles.txSub}>
                    {formatDayLabel(t.date)}
                    {t.note ? ` · ${t.note}` : ''}
                  </Text>
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
              </Pressable>
            );
          })
        )}
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  hello: { fontSize: 13, color: colors.subtext },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  clockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  clockText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    overflow: 'hidden',
    marginTop: 14,
    ...shadow,
  },
  glowCircle: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(167,139,250,0.16)',
  },
  glowCircleSmall: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(244,114,182,0.08)',
  },
  totalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 13, color: colors.subtext, fontWeight: '600' },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthChipText: { fontSize: 11, fontWeight: '600', color: colors.subtext },
  totalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  miniStatsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  miniStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  miniStatHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatLabel: { fontSize: 11, color: colors.subtext, fontWeight: '600' },
  miniStatValue: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  budgetWrap: { marginTop: 16 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetHint: { marginTop: 8, fontSize: 12, color: colors.subtext },
  budgetCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  budgetCtaText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  nextExam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.cardAlt,
    padding: 12,
    marginBottom: 10,
  },
  nextExamIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextExamName: { fontSize: 15, fontWeight: '800', color: colors.text },
  nextExamDate: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  nextExamBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 58,
  },
  nextExamDays: { fontSize: 20, fontWeight: '800' },
  nextExamDaysSub: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  examMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  examMiniDot: { width: 8, height: 8, borderRadius: 4 },
  examMiniName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  examMiniDate: { fontSize: 11, color: colors.subtext },
  examMiniDays: { fontSize: 11, fontWeight: '700', color: colors.primary, minWidth: 76, textAlign: 'right' },

  streakChip: {
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakText: { fontSize: 11, fontWeight: '700', color: colors.warning },

  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 4,
  },
  prodPct: { fontSize: 24, fontWeight: '800', color: colors.text },
  prodPctSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  prodStats: { flex: 1, gap: 10 },
  prodStatItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prodStatLabel: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  prodStatValue: { fontSize: 13, fontWeight: '800', color: colors.text },

  wakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
    padding: 14,
    marginTop: 14,
  },
  wakeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(34,211,238,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  wakeSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  wakeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseName: { fontSize: 14, fontWeight: '700', color: colors.text },
  courseSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  courseRight: { alignItems: 'flex-end' },
  courseVal: { fontSize: 13, fontWeight: '800', color: colors.text },
  coursePct: { fontSize: 11, fontWeight: '700', color: colors.income, marginTop: 2 },

  weekTotal: { fontSize: 12, fontWeight: '700', color: colors.primary },
  weekBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 9, color: colors.subtext, marginBottom: 3, height: 12 },
  bar: { width: 16, borderRadius: 8 },
  barLabel: { fontSize: 9, color: colors.subtext, marginTop: 6 },
  barLabelActive: { color: colors.primary, fontWeight: '800' },

  rangeRow: { flexDirection: 'row', gap: 6 },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontSize: 11, fontWeight: '700', color: colors.subtext },
  rangeTextActive: { color: colors.bg },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartAxis: { fontSize: 10, color: colors.subtext },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 12, fontWeight: '600', color: colors.subtext, marginTop: 8 },
  catAmount: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },
  catPct: { fontSize: 11, fontWeight: '700', color: colors.income, marginTop: 4 },

  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcutTile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    gap: 8,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: colors.text },

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
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    maxWidth: '52%',
    textAlign: 'right',
  },
});
