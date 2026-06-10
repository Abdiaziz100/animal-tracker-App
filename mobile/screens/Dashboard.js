import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, StyleSheet, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const SPECIES_EMOJI = {
  Cattle: '🐄', Sheep: '🐑', Goat: '🐐',
  Camel: '🐪', Donkey: '🫏', Horse: '🐴',
};

export default function Dashboard() {
  const [animals, setAnimals]   = useState([]);
  const [stats, setStats]       = useState({ total_animals: 0, inside_farm: 0, outside_farm: 0, healthy: 0, sick: 0, by_species: {} });
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { getAuthHeader, user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [animalsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/animals`, getAuthHeader()),
        axios.get(`${API_URL}/dashboard`, getAuthHeader()),
      ]);
      setAnimals(animalsRes.data);
      setStats(statsRes.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation, fetchData]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={s.loadingText}>Loading farm data...</Text>
      </View>
    );
  }

  const bySpecies = stats.by_species || {};
  const speciesEntries = Object.entries(bySpecies);
  const maxCount = Math.max(...speciesEntries.map(([, v]) => v), 1);

  return (
    <FlatList
      data={animals}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>🏡 Farm Dashboard</Text>
              <Text style={s.headerSub}>Welcome, {user?.email?.split('@')[0]}</Text>
            </View>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{stats.alerts > 0 ? `⚠️ ${stats.alerts} Alert${stats.alerts > 1 ? 's' : ''}` : '✅ All Safe'}</Text>
            </View>
          </View>

          {/* Main Stats */}
          <View style={s.statsGrid}>
            <StatCard label="Total" value={stats.total_animals} color="#2563eb" bg="#eff6ff" emoji="🐄" />
            <StatCard label="Inside" value={stats.inside_farm} color="#16a34a" bg="#f0fdf4" emoji="✅" />
            <StatCard label="Outside" value={stats.outside_farm} color="#dc2626" bg="#fef2f2" emoji="⚠️" />
            <StatCard label="Healthy" value={stats.healthy} color="#16a34a" bg="#f0fdf4" emoji="💚" />
            <StatCard label="Sick" value={stats.sick} color="#f59e0b" bg="#fffbeb" emoji="🤒" />
            <StatCard label="Species" value={speciesEntries.length} color="#7c3aed" bg="#f5f3ff" emoji="📊" />
          </View>

          {/* Species Breakdown Chart */}
          {speciesEntries.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>📊 Species Breakdown</Text>
              {speciesEntries.map(([species, count]) => {
                const pct = (count / maxCount) * 100;
                return (
                  <View key={species} style={s.barRow}>
                    <Text style={s.barLabel}>
                      {SPECIES_EMOJI[species] || '🐾'} {species}
                    </Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Health Overview */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🏥 Health Overview</Text>
            <View style={s.healthRow}>
              <HealthDot color="#16a34a" label="Healthy" count={stats.healthy} />
              <HealthDot color="#dc2626" label="Sick" count={stats.sick} />
              <HealthDot color="#f59e0b" label="Quarantine" count={stats.total_animals - stats.healthy - stats.sick} />
            </View>
            {/* Health bar */}
            {stats.total_animals > 0 && (
              <View style={s.healthBar}>
                <View style={[s.healthSegment, { flex: stats.healthy || 0, backgroundColor: '#16a34a' }]} />
                <View style={[s.healthSegment, { flex: stats.sick || 0, backgroundColor: '#dc2626' }]} />
                <View style={[s.healthSegment, { flex: Math.max(stats.total_animals - stats.healthy - stats.sick, 0), backgroundColor: '#f59e0b' }]} />
              </View>
            )}
          </View>

          {/* Animals List Title */}
          <View style={s.listHeader}>
            <Text style={s.sectionTitle}>🐄 Your Animals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Add Animal')}>
              <Text style={s.addLink}>+ Add New</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={
        <View style={s.emptyBox}>
          <Text style={{ fontSize: 56 }}>🐄</Text>
          <Text style={s.emptyTitle}>No Animals Yet</Text>
          <Text style={s.emptySub}>Tap "+ Add New" to register your first animal</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Add Animal')}>
            <Text style={s.emptyBtnText}>+ Register Animal</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={s.animalCard}
          onPress={() => navigation.navigate('AnimalDetail', { animal: item })}
        >
          <View style={[s.animalIcon, { backgroundColor: item.status === 'IN' ? '#f0fdf4' : '#fef2f2' }]}>
            <Text style={{ fontSize: 26 }}>{SPECIES_EMOJI[item.species] || '🐾'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={s.animalRow}>
              <Text style={s.animalName}>{item.name}</Text>
              <View style={[s.statusBadge, { backgroundColor: item.status === 'IN' ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={{ color: item.status === 'IN' ? '#16a34a' : '#dc2626', fontSize: 11, fontWeight: '700' }}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={s.animalSub}>{item.species} {item.breed ? `• ${item.breed}` : ''}</Text>
            <View style={s.animalRow}>
              {item.tag_id ? <Text style={s.animalTag}>🏷️ {item.tag_id}</Text> : null}
              <View style={[s.healthDot, { backgroundColor: item.health_status === 'Healthy' ? '#16a34a' : item.health_status === 'Sick' ? '#dc2626' : '#f59e0b' }]} />
              <Text style={s.animalHealth}>{item.health_status || 'Healthy'}</Text>
            </View>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function StatCard({ label, value, color, bg, emoji }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={[s.statNum, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function HealthDot({ color, label, count }) {
  return (
    <View style={s.healthDotRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.healthDotLabel}>{label}: {count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6b7280', marginTop: 12 },
  header: { backgroundColor: '#16a34a', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { color: '#d1fae5', fontSize: 13, marginTop: 2 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  headerBadgeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '30%', padding: 12, borderRadius: 14, alignItems: 'center', flexGrow: 1 },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  section: { backgroundColor: 'white', marginHorizontal: 12, marginBottom: 12, padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 90, fontSize: 13, color: '#374151' },
  barTrack: { flex: 1, height: 14, backgroundColor: '#f3f4f6', borderRadius: 7, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 7 },
  barCount: { width: 24, fontSize: 13, fontWeight: '700', color: '#1f2937', textAlign: 'right' },
  healthRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  healthDotRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  healthDotLabel: { fontSize: 12, color: '#374151' },
  healthBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  healthSegment: { height: '100%' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  addLink: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  animalCard: { backgroundColor: 'white', marginHorizontal: 12, marginBottom: 10, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  animalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  animalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  animalName: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1 },
  animalSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  animalTag: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  animalHealth: { fontSize: 11, color: '#6b7280', marginTop: 4, marginLeft: 4 },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  chevron: { fontSize: 22, color: '#9ca3af', marginLeft: 8 },
  emptyBox: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { color: '#6b7280', textAlign: 'center', marginTop: 6 },
  emptyBtn: { backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
