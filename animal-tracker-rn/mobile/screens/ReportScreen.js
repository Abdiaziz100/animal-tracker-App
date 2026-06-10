import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const SPECIES_EMOJI = {
  Cattle: '🐄', Sheep: '🐑', Goat: '🐐',
  Camel: '🐪', Donkey: '🫏', Horse: '🐴',
};

export default function ReportScreen() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const { getAuthHeader }     = useAuth();
  const navigation            = useNavigation();

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/report`, getAuthHeader());
      setReport(res.data);
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.status || e.message || 'Unknown error';
      Alert.alert('Error', `Failed to generate report\n\nReason: ${msg}\n\nTry logging out and logging in again.`);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  const handleShare = () => {
    Alert.alert(
      '📤 Export Report',
      'In production this would export as PDF or send to government portal.\n\nFor now the report is displayed on screen.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerEmoji}>🏛️</Text>
        <Text style={s.headerTitle}>Government Compliance Report</Text>
        <Text style={s.headerSub}>Official Livestock Registration Summary</Text>
      </View>

      <View style={s.inner}>
        {!report ? (
          <View style={s.generateBox}>
            <Text style={s.generateEmoji}>📋</Text>
            <Text style={s.generateTitle}>Generate Official Report</Text>
            <Text style={s.generateSub}>
              This report includes all registered animals, health records,
              geofence status and farmer details for government submission.
            </Text>
            <TouchableOpacity style={s.generateBtn} onPress={generateReport} disabled={loading}>
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={s.generateBtnText}>📊 Generate Report</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Report Header */}
            <View style={s.reportHeader}>
              <View style={s.reportBadge}>
                <Text style={s.reportBadgeText}>OFFICIAL DOCUMENT</Text>
              </View>
              <Text style={s.reportTitle}>LIVESTOCK TRACKING REPORT</Text>
              <Text style={s.reportDate}>
                Generated: {new Date(report.report_date).toLocaleString()}
              </Text>
            </View>

            {/* Farmer Details */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>👤 Farmer Details</Text>
              <Row label="Full Name"      value={report.farmer.name} />
              <Row label="Email"          value={report.farmer.email} />
              <Row label="Phone"          value={report.farmer.phone || 'N/A'} />
              <Row label="Farm Name"      value={report.farmer.farm_name || 'N/A'} />
              <Row label="Farm Location"  value={report.farmer.farm_location || 'N/A'} />
            </View>

            {/* Summary */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📊 Summary Statistics</Text>
              <Row label="Total Animals"  value={report.summary.total_animals} bold />
              <Row label="Inside Farm"    value={report.summary.geofence_status.inside} color="#16a34a" />
              <Row label="Outside Farm"   value={report.summary.geofence_status.outside} color="#dc2626" />
              <Row label="Healthy"        value={report.summary.health_summary.healthy} color="#16a34a" />
              <Row label="Sick"           value={report.summary.health_summary.sick} color="#dc2626" />
              <Row label="Quarantine"     value={report.summary.health_summary.quarantine} color="#f59e0b" />
            </View>

            {/* Species Breakdown */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🐾 Species Breakdown</Text>
              {Object.entries(report.summary.by_species).map(([sp, count]) => (
                <Row
                  key={sp}
                  label={`${SPECIES_EMOJI[sp] || '🐾'} ${sp}`}
                  value={count}
                />
              ))}
              {Object.keys(report.summary.by_species).length === 0 && (
                <Text style={s.noData}>No animals registered</Text>
              )}
            </View>

            {/* Animal Register */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📋 Animal Register ({report.animals.length})</Text>
              {report.animals.length === 0 ? (
                <Text style={s.noData}>No animals registered</Text>
              ) : (
                report.animals.map((a, i) => (
                  <View key={a.id} style={s.animalRow}>
                    <View style={s.animalNum}>
                      <Text style={s.animalNumText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.animalName}>{a.name}</Text>
                      <Text style={s.animalDetail}>
                        {SPECIES_EMOJI[a.species] || '🐾'} {a.species}
                        {a.breed ? ` • ${a.breed}` : ''}
                        {a.tag_id ? ` • 🏷️ ${a.tag_id}` : ''}
                      </Text>
                      <Text style={s.animalDetail}>
                        {a.gender} • {a.age_years ? `${a.age_years} yrs` : 'Age N/A'}
                        {a.weight_kg ? ` • ${a.weight_kg} kg` : ''}
                      </Text>
                    </View>
                    <View style={s.animalBadges}>
                      <View style={[s.badge, { backgroundColor: a.status === 'IN' ? '#dcfce7' : '#fee2e2' }]}>
                        <Text style={{ color: a.status === 'IN' ? '#16a34a' : '#dc2626', fontSize: 10, fontWeight: '700' }}>
                          {a.status}
                        </Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: a.health_status === 'Healthy' ? '#dcfce7' : '#fee2e2', marginTop: 4 }]}>
                        <Text style={{ color: a.health_status === 'Healthy' ? '#16a34a' : '#dc2626', fontSize: 10, fontWeight: '700' }}>
                          {a.health_status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Compliance Statement */}
            <View style={s.complianceBox}>
              <Text style={s.complianceTitle}>📜 Compliance Statement</Text>
              <Text style={s.complianceText}>
                I hereby certify that the information provided in this report is accurate
                and complete to the best of my knowledge. All animals are registered
                under the national livestock tracking system and are subject to
                government inspection at any time.
              </Text>
              <View style={s.signatureLine}>
                <Text style={s.signatureLabel}>Farmer Signature: ___________________</Text>
                <Text style={s.signatureLabel}>Date: {new Date().toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2563eb' }]} onPress={handleShare}>
                <Text style={s.actionBtnText}>📤 Export / Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#16a34a' }]} onPress={generateReport}>
                <Text style={s.actionBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && { fontWeight: '700' }, color && { color }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1e3a5f', padding: 28, alignItems: 'center' },
  headerEmoji: { fontSize: 40 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  headerSub: { color: '#93c5fd', fontSize: 13, marginTop: 4, textAlign: 'center' },
  inner: { padding: 16 },
  generateBox: { alignItems: 'center', paddingVertical: 40 },
  generateEmoji: { fontSize: 64 },
  generateTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginTop: 16 },
  generateSub: { color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 16 },
  generateBtn: { backgroundColor: '#1e3a5f', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  generateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  reportHeader: { backgroundColor: '#1e3a5f', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  reportBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  reportBadgeText: { color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  reportTitle: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  reportDate: { color: '#93c5fd', fontSize: 12, marginTop: 6 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  rowLabel: { color: '#6b7280', fontSize: 13 },
  rowValue: { color: '#1f2937', fontSize: 13, fontWeight: '500' },
  noData: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: 12 },
  animalRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  animalNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  animalNumText: { color: 'white', fontSize: 12, fontWeight: '700' },
  animalName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  animalDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  animalBadges: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  complianceBox: { backgroundColor: '#fefce8', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' },
  complianceTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  complianceText: { color: '#78350f', fontSize: 12, lineHeight: 18 },
  signatureLine: { marginTop: 16, gap: 8 },
  signatureLabel: { color: '#92400e', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
