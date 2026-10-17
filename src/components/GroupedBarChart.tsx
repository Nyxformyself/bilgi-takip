import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Currency, formatMoney } from '../currency';

type Series = {
  label: string;
  color: string;
  data: number[];
};

type Props = {
  labels: string[];
  series: Series[];
  height?: number;
  currency?: Currency;
};

export function GroupedBarChart({ labels, series, height = 160, currency }: Props) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));

  return (
    <View>
      <View style={[styles.chartArea, { height }]}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <View key={g} style={[styles.gridLine, { bottom: `${g * 100}%` as `${number}%` }]} />
        ))}
        <View style={styles.barsRow}>
          {labels.map((label, i) => (
            <View key={label} style={styles.group}>
              {series.map((s) => {
                const value = s.data[i] ?? 0;
                const h = Math.max(value > 0 ? 3 : 0, (value / max) * (height - 24));
                return (
                  <View
                    key={s.label}
                    style={[styles.bar, { height: h, backgroundColor: s.color }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.labelsRow}>
        {labels.map((label) => (
          <Text key={label} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={styles.maxText} numberOfLines={1}>
          maks {formatMoney(max, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: '100%',
  },
  bar: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  axisLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.subtext },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  maxText: { fontSize: 11, color: colors.subtext },
});
