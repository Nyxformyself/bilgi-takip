import React, { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  values: number[];
  height?: number;
  color?: string;
};

export function TrendChart({ values, height = 150, color = colors.primary }: Props) {
  const { width: winWidth } = useWindowDimensions();
  const width = Math.max(200, winWidth - 64);
  const padTop = 14;
  const padBottom = 10;
  const innerH = height - padTop - padBottom;
  const max = Math.max(1, ...values);
  const n = values.length;

  const points = useMemo(
    () =>
      values.map((v, i) => ({
        x: n <= 1 ? width / 2 : (i / (n - 1)) * width,
        y: padTop + innerH - (v / max) * innerH,
      })),
    [values, n, width, innerH, max]
  );

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' '),
    [points]
  );

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const base = padTop + innerH;
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L${last.x.toFixed(1)},${base} L${first.x.toFixed(1)},${base} Z`;
  }, [linePath, points, innerH]);

  if (n === 0) return null;

  const last = points[points.length - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <Line
            key={g}
            x1={0}
            x2={width}
            y1={padTop + innerH * g}
            y2={padTop + innerH * g}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        <Path d={areaPath} fill="url(#trendArea)" />
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={last.x} cy={last.y} r={10} fill={color} opacity={0.25} />
        <Circle cx={last.x} cy={last.y} r={4.5} fill={color} />
      </Svg>
    </View>
  );
}
