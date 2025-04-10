// screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import ModernButton from '../components/ModernButton';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => navigation.replace('Home'))
      .catch(error => alert(error.message));
  };

  return (
    <ImageBackground
      source={require('../assets/bg01.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.inner}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#444"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#444"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <ModernButton label="Giriş Yap" onPress={handleLogin} />

          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Hesabın yok mu? Kayıt Ol
          </Text>
          <Text style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
            Şifreni mi unuttun?
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    margin: 20,
    padding: 25,
    borderRadius: 15,
    marginTop: 80,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  link: {
    color: '#1e88e5',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  backButtonContainer: {
    marginTop: Platform.OS === 'android' ? 50 : 60,
    marginLeft: 20,
    position: 'absolute',
    zIndex: 999,
  },
  backText: {
    color: '#fff',
    fontSize: 18,
  },
});
