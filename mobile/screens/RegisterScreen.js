import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [farmName, setFarmName]           = useState('');
  const [farmLocation, setFarmLocation]   = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]             = useState(false);
  const [waking, setWaking]               = useState(true);
  const [emailError, setEmailError]       = useState('');
  const { register } = useAuth();

  useEffect(() => { wakeUpBackend(); }, []);

  const wakeUpBackend = async () => {
    try {
      await axios.get(`${API_URL.replace('/api', '')}/ping`, { timeout: 60000 });
    } catch (e) {}
    setWaking(false);
  };

  const handleRegister = async () => {
    setEmailError('');
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Full name, email and password are required');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(email, password, fullName, phone, farmName, farmLocation);
    setLoading(false);

    if (!result.success) {
      // Show email error inline like Facebook
      if (result.error?.toLowerCase().includes('already') ||
          result.error?.toLowerCase().includes('registered') ||
          result.error?.toLowerCase().includes('exists')) {
        setEmailError('This email is already registered. Please login instead.');
      } else {
        Alert.alert('Registration Failed', result.error);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={s.header}>
          <Text style={s.emoji}>🐄</Text>
          <Text style={s.title}>Livestock Tracker</Text>
          <Text style={s.subtitle}>Official Farmer Registration</Text>
        </View>

        {waking && (
          <View style={s.wakingBox}>
            <ActivityIndicator color="#16a34a" size="small" />
            <Text style={s.wakingText}>  Connecting to server...</Text>
          </View>
        )}

        <View style={s.inner}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>👤 Personal Details</Text>
            <Text style={s.label}>Full Name *</Text>
            <TextInput style={s.input} placeholder="Your full name" value={fullName} onChangeText={setFullName} />

            <Text style={s.label}>Email Address *</Text>
            <TextInput
              style={[s.input, emailError ? s.inputError : null]}
              placeholder="your@email.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️ {emailError}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={s.errorLink}>Login here →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={s.label}>Phone Number</Text>
            <TextInput style={s.input} placeholder="+254 700 000 000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>🏡 Farm Details</Text>
            <Text style={s.label}>Farm Name</Text>
            <TextInput style={s.input} placeholder="e.g., Green Valley Farm" value={farmName} onChangeText={setFarmName} />
            <Text style={s.label}>Farm Location / County</Text>
            <TextInput style={s.input} placeholder="e.g., Nakuru County, Kenya" value={farmLocation} onChangeText={setFarmLocation} />
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>🔒 Security</Text>
            <Text style={s.label}>Password *</Text>
            <TextInput style={s.input} placeholder="Min 6 characters" value={password} onChangeText={setPassword} secureTextEntry />
            <Text style={s.label}>Confirm Password *</Text>
            <TextInput style={s.input} placeholder="Repeat password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </View>

          <TouchableOpacity
            style={[s.btn, (loading || waking) && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading || waking}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={s.btnText}>{waking ? 'Please wait...' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={s.gray}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#16a34a', padding: 32, alignItems: 'center' },
  emoji: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: 'bold', color: 'white', marginTop: 8 },
  subtitle: { color: '#d1fae5', marginTop: 4 },
  wakingBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#f0fdf4' },
  wakingText: { color: '#16a34a', fontSize: 13 },
  inner: { padding: 16 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  errorBox: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#dc2626', fontSize: 13 },
  errorLink: { color: '#16a34a', fontWeight: '700', marginTop: 4, fontSize: 13 },
  btn: { backgroundColor: '#16a34a', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
  gray: { color: '#6b7280' },
  link: { color: '#16a34a', fontWeight: '600' },
});
