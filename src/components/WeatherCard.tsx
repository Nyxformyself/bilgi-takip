import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, shadow } from '../theme';
import {
  FALLBACK_LOCATION,
  WeatherData,
  fetchWeather,
  isFresh,
  loadCachedWeather,
  weatherInfo,
} from '../weather';

export function WeatherCard({ dateLabel }: { dateLabel: string }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (force: boolean) => {
    const cached = await loadCachedWeather();
    setFailed(false);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (!force && isFresh(cached)) return;
    } else {
      setLoading(true);
    }

    try {
      let latitude = FALLBACK_LOCATION.latitude;
      let longitude = FALLBACK_LOCATION.longitude;
      let city = FALLBACK_LOCATION.city;

      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.status === 'granted';
      if (!granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (granted) {
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          }));
        if (pos) {
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          city = 'Konumum';
          try {
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            const place = geo[0];
            city = place?.city ?? place?.subregion ?? place?.region ?? 'Konumum';
          } catch {
            // şehir adı bulunamazsa "Konumum" kalır
          }
        }
      }

      const fresh = await fetchWeather(latitude, longitude, city);
      setData(fresh);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ilk açılışta önbellek/konum verisini yükle
    load(false);
  }, [load]);

  const info = data ? weatherInfo(data.weatherCode) : null;

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.head}>
        <View>
          <Text style={styles.date}>{dateLabel}</Text>
          <View style={styles.cityRow}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text style={styles.city}>{data?.city ?? 'Yükleniyor…'}</Text>
          </View>
        </View>
        <Pressable hitSlop={10} style={styles.refreshBtn} onPress={() => load(true)}>
          <Ionicons name="refresh" size={16} color={colors.subtext} />
        </Pressable>
      </View>

      {loading && !data ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : failed && !data ? (
        <Pressable style={styles.loadingWrap} onPress={() => load(true)}>
          <Text style={styles.errorText}>Hava durumu alınamadı · Dokun ve tekrar dene</Text>
        </Pressable>
      ) : (
        data &&
        info && (
          <View style={styles.body}>
            <View style={styles.tempWrap}>
              <Text style={styles.temp}>{Math.round(data.temperature)}°</Text>
              <Ionicons
                name={info.icon as keyof typeof Ionicons.glyphMap}
                size={40}
                color={colors.warning}
              />
            </View>
            <Text style={styles.desc}>{info.label}</Text>
            <View style={styles.hlRow}>
              <Ionicons name="arrow-up" size={12} color={colors.expense} />
              <Text style={styles.hlText}>{Math.round(data.tempMax)}°</Text>
              <View style={{ width: 10 }} />
              <Ionicons name="arrow-down" size={12} color={colors.income} />
              <Text style={styles.hlText}>{Math.round(data.tempMin)}°</Text>
            </View>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    overflow: 'hidden',
    ...shadow,
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34,211,238,0.10)',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  date: { fontSize: 13, fontWeight: '700', color: colors.text },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  city: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { paddingVertical: 22, alignItems: 'center' },
  errorText: { fontSize: 12, color: colors.subtext, textAlign: 'center' },
  body: { marginTop: 8 },
  tempWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  temp: { fontSize: 46, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  desc: { fontSize: 13, color: colors.subtext, fontWeight: '600', marginTop: 2 },
  hlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  hlText: { fontSize: 12, color: colors.subtext, fontWeight: '700', marginLeft: 2 },
});
