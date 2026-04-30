import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) Alert.alert('Login Failed', result.error);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.emoji}>🐄</Text>
          <Text style={s.title}>Livestock Tracker</Text>
          <Text style={s.subtitle}>Smart GPS Tracking System</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Login</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.row}>
          <Text style={s.gray}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.link}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={s.demo}>
          <Text style={s.demoTitle}>Demo Credentials:</Text>
          <Text style={s.demoText}>Email: admin@test.com</Text>
          <Text style={s.demoText}>Password: 1234</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#15803d', marginTop: 8 },
  subtitle: { color: '#6b7280', marginTop: 4 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#1f2937' },
  label: { fontSize: 13, color: '#4b5563', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 14, fontSize: 15 },
  btn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  gray: { color: '#6b7280' },
  link: { color: '#16a34a', fontWeight: '600' },
  demo: { marginTop: 24, padding: 16, backgroundColor: '#eff6ff', borderRadius: 10 },
  demoTitle: { color: '#1e40af', fontWeight: '600', marginBottom: 4 },
  demoText: { color: '#1d4ed8', fontSize: 13 },
});
