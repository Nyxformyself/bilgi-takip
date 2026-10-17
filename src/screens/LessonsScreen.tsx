import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { TrendChart } from '../components/TrendChart';
import { useStore } from '../store';
import { colors, glow, shadow } from '../theme';
import {
  addDays,
  formatDayLabel,
  netScore,
  streakDays,
  todayKey,
  weekStartKey,
} from '../utils';
import { hapticImpact, hapticTap } from '../haptics';

const WEEK_LETTERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatNet(net: number): string {
  return net.toFixed(2).replace('.', ',');
}

export function LessonsScreen() {
  const { state, deleteLog, deletePracticeTest, setDayLogged } = useStore();
  const insets = useSafeAreaInsets();

  const today = todayKey();
  const weekStart = weekStartKey(today);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const logsThisWeek = useMemo(
    () => state.logs.filter((l) => l.date >= weekStart && l.date <= addDays(weekStart, 6)),
    [state.logs, weekStart]
  );

  const streak = useMemo(
    () => streakDays(new Set(state.logs.map((l) => l.date))),
    [state.logs]
  );

  const totalMinutesAllTime = state.logs.reduce((a, l) => a + l.minutes, 0);

  const recentLogs = useMemo(
    () =>
      [...state.logs]
        .sort((a, b) =>
          a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1
        )
        .slice(0, 20),
    [state.logs]
  );

  const courseById = (id: string) => state.courses.find((c) => c.id === id);

  const testsAsc = useMemo(
    () =>
      [...state.practiceTests].sort((a, b) =>
        a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)
      ),
    [state.practiceTests]
  );

  const recentTests = useMemo(
    () =>
      [...state.practiceTests]
        .sort((a, b) =>
          a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
        )
        .slice(0, 6),
    [state.practiceTests]
  );

  const netSeries = useMemo(
    () => testsAsc.slice(-20).map((t) => Math.max(0, netScore(t.correct, t.wrong))),
    [testsAsc]
  );

  const bestNet = useMemo(
    () =>
      testsAsc.length
        ? Math.max(...testsAsc.map((t) => netScore(t.correct, t.wrong)))
        : 0,
    [testsAsc]
  );

  const confirmDeleteTest = (id: string) => {
    Alert.alert('Deneme silinsin mi?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deletePracticeTest(id) },
    ]);
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Ders kaydı silinsin mi?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteLog(id) },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Dersler</Text>
        <Pressable style={styles.manageBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={16} color={colors.primary} />
          <Text style={styles.manageText}>Yönet</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Günlük seri</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {Math.floor(logsThisWeek.reduce((a, l) => a + l.minutes, 0) / 60)}s
          </Text>
          <Text style={styles.statLabel}>Bu hafta</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.floor(totalMinutesAllTime / 60)}s</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
      </View>

      <Pressable
        style={styles.timerCta}
        onPress={() => {
          hapticImpact();
          router.push('/study-timer');
        }}
      >
        <View style={styles.timerIcon}>
          <Ionicons name="timer" size={22} color={colors.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.timerTitle}>Ders Sayacı</Text>
          <Text style={styles.timerSub}>Başlat, süre bitince otomatik kaydet</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>

      {state.courses.map((course) => {
        const weekMinutes = logsThisWeek
          .filter((l) => l.courseId === course.id)
          .reduce((a, l) => a + l.minutes, 0);
        const pct =
          course.weeklyGoalMinutes > 0
            ? Math.min((weekMinutes / course.weeklyGoalMinutes) * 100, 100)
            : 0;

        const dayMinutes = (date: string) =>
          state.logs
            .filter((l) => l.courseId === course.id && l.date === date)
            .reduce((a, l) => a + l.minutes, 0);

        const tickedCount = weekDays.filter((d) => dayMinutes(d) > 0).length;

        return (
          <Card key={course.id} style={{ marginTop: 14 }}>
            <View style={styles.courseHead}>
              <View style={[styles.courseBadge, { backgroundColor: `${course.color}1A` }]}>
                <Ionicons name="book" size={20} color={course.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName} numberOfLines={1}>
                  {course.name}
                </Text>
                <Text style={styles.courseSub}>
                  {Math.floor(weekMinutes / 60)}s {weekMinutes % 60}dk /{' '}
                  {Math.floor(course.weeklyGoalMinutes / 60)}s hedef
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%` as `${number}%`, backgroundColor: course.color },
                ]}
              />
            </View>

            <View style={styles.weekHead}>
              <Text style={styles.sectionMini}>Bu hafta</Text>
              <Text style={[styles.weekCount, { color: course.color }]}>
                {tickedCount}/7 gün
              </Text>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((d, i) => {
                const mins = dayMinutes(d);
                const ticked = mins > 0;
                const isToday = d === today;
                const isFuture = d > today;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      hapticTap();
                      setDayLogged(course.id, d, state.settings.dailyTickMinutes);
                    }}
                    disabled={isFuture}
                    style={styles.dayCol}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        { borderColor: isFuture ? colors.border : course.color },
                        ticked && { backgroundColor: course.color },
                        isToday && !ticked && styles.dayCircleToday,
                        isFuture && { opacity: 0.4 },
                      ]}
                    >
                      {ticked ? (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      ) : (
                        <Text style={[styles.dayDot, { color: colors.subtext }]}>{i + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.dayLetter,
                        isToday && { color: course.color, fontWeight: '800' },
                      ]}
                    >
                      {WEEK_LETTERS[i]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.weekFooter}>
              <Text style={styles.weekHint}>
                Güne dokunarak {state.settings.dailyTickMinutes} dk tik at
              </Text>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/log-lesson', params: { courseId: course.id } })
                }
                style={styles.detailBtn}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={styles.detailText}>Dakika ekle</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}

      {state.courses.length === 0 && (
        <Card style={{ marginTop: 14 }}>
          <EmptyState
            icon="school-outline"
            title="Ders yok"
            subtitle="Ayarlar ekranından Matematik ve IQ gibi dersler ekleyebilirsin."
          />
        </Card>
      )}

      <Card
        title="Deneme Sınavları"
        subtitle="Doğru/yanlış gir, net gelişimini takip et"
        style={{ marginTop: 14 }}
      >
        <View style={styles.testHead}>
          <Text style={styles.sectionMini}>Son denemeler</Text>
          <Pressable
            style={styles.detailBtn}
            onPress={() => {
              hapticImpact();
              router.push('/practice-test');
            }}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={styles.detailText}>Deneme ekle</Text>
          </Pressable>
        </View>

        {state.practiceTests.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="Deneme yok"
            subtitle="İlk deneme sonucunu ekle; net grafiğin burada oluşsun."
          />
        ) : (
          <>
            {netSeries.length > 1 && (
              <TrendChart values={netSeries} height={140} color={colors.primary} />
            )}
            <Text style={styles.chartHint}>
              Son {netSeries.length} deneme · En iyi net: {formatNet(bestNet)}
            </Text>
            {recentTests.map((t) => {
              const course = courseById(t.courseId);
              const color = course?.color ?? colors.primary;
              return (
                <Pressable
                  key={t.id}
                  onLongPress={() => confirmDeleteTest(t.id)}
                  style={styles.logRow}
                >
                  <View style={[styles.logDot, { backgroundColor: `${color}1A` }]}>
                    <Ionicons name="stats-chart" size={16} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle} numberOfLines={1}>
                      {course?.name ?? 'Silinmiş ders'}
                    </Text>
                    <Text style={styles.logSub} numberOfLines={1}>
                      {formatDayLabel(t.date)} · {t.correct}D {t.wrong}Y
                      {t.note ? ` · ${t.note}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.logMinutes, { color }]}>
                    {formatNet(Math.max(0, netScore(t.correct, t.wrong)))} net
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.hint}>İpucu: Denemelere uzun basarak silebilirsin.</Text>
          </>
        )}
      </Card>

      <Card title="Ders Geçmişi" subtitle="Son 20 kayıt" style={{ marginTop: 14 }}>
        {recentLogs.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="Kayıt yok"
            subtitle="İlk dersini işaretle; burada geçmişi göreceksin."
          />
        ) : (
          recentLogs.map((log) => {
            const course = courseById(log.courseId);
            const color = course?.color ?? colors.primary;
            return (
              <Pressable
                key={log.id}
                onLongPress={() => confirmDelete(log.id)}
                style={styles.logRow}
              >
                <View style={[styles.logDot, { backgroundColor: `${color}1A` }]}>
                  <Ionicons name="book" size={16} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    {course?.name ?? 'Silinmiş ders'}
                  </Text>
                  <Text style={styles.logSub}>
                    {formatDayLabel(log.date)}
                    {log.note ? ` · ${log.note}` : ''}
                  </Text>
                </View>
                <Text style={[styles.logMinutes, { color }]}>{log.minutes} dk</Text>
              </Pressable>
            );
          })
        )}
        {recentLogs.length > 0 && (
          <Text style={styles.hint}>İpucu: Kayıtlara uzun basarak silebilirsin.</Text>
        )}
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  manageText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  timerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  timerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...glow,
  },
  timerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  timerSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  courseHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courseBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseName: { fontSize: 16, fontWeight: '700', color: colors.text },
  courseSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  weekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sectionMini: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  weekCount: { fontSize: 12, fontWeight: '800' },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  dayCol: { alignItems: 'center', flex: 1 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: { backgroundColor: colors.primarySoft },
  dayDot: { fontSize: 12, fontWeight: '700' },
  dayLetter: { fontSize: 10, color: colors.subtext, marginTop: 5 },
  weekFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  weekHint: { fontSize: 11, color: colors.subtext, flex: 1, marginRight: 8 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  detailText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  testHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartHint: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  logDot: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  logSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  logMinutes: { fontSize: 13, fontWeight: '800' },
  hint: { fontSize: 11, color: colors.subtext, textAlign: 'center', marginTop: 8 },
});
