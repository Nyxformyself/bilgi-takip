import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { colors } from '../theme';
import { Currency, formatMoney } from '../currency';

export type DonutItem = {
  name: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
) {
  const so = polar(cx, cy, rOuter, endAngle);
  const eo = polar(cx, cy, rOuter, startAngle);
  const si = polar(cx, cy, rInner, startAngle);
  const ei = polar(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
}

type Segment = DonutItem & { start: number; end: number };

function buildSegments(data: DonutItem[], total: number): Segment[] {
  const out: Segment[] = [];
  let angle = 0;
  for (const d of data) {
    const sweep = total > 0 ? (d.value / total) * 360 : 0;
    out.push({ ...d, start: angle, end: angle + sweep });
    angle += sweep;
  }
  return out;
}

export function CategoryDonut({
  data,
  size = 180,
  centerLabel,
  currency,
}: {
  data: DonutItem[];
  size?: number;
  centerLabel?: string;
  currency?: Currency;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter * 0.62;

  const segments = buildSegments(data, total);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          {segments.map((s) => {
            const path =
              s.end - s.start >= 359.99
                ? arcPath(cx, cy, rOuter, rInner, s.start, s.start + 359.99)
                : arcPath(cx, cy, rOuter, rInner, s.start, s.end);
            return <Path key={s.name} d={path} fill={s.color} />;
          })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerTop}>{centerLabel ?? 'Toplam'}</Text>
        <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(total, currency)}
        </Text>
      </View>
    </View>
  );
}

export function CategoryLegend({ data, currency }: { data: DonutItem[]; currency?: Currency }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <View style={{ gap: 10, flex: 1 }}>
      {data.map((d) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <View key={d.name} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: d.color }]} />
            <Text style={styles.name} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.pct}>{pct.toFixed(0)}%</Text>
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(d.value, currency)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTop: { fontSize: 11, color: colors.subtext, fontWeight: '600' },
  centerValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 },
  pct: { fontSize: 12, color: colors.subtext, width: 38, textAlign: 'right' },
  value: { fontSize: 12, color: colors.text, fontWeight: '700', width: 88, textAlign: 'right' },
});
