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

        <View style={styles.centeredContent}>
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

            <View style={styles.buttonContainer}>
              <ModernButton 
                label="Giriş Yap" 
                onPress={handleLogin} 
                style={styles.loginButton}
              />
            </View>

            <Text style={styles.link} numberOfLines={1} onPress={() => navigation.navigate('Register')}>
              Hesabın yok mu? Kayıt Ol
            </Text>
            <Text style={styles.link} numberOfLines={1} onPress={() => navigation.navigate('ForgotPassword')}>
              Şifreni mi unuttun?
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 30,
    paddingBottom: 50,
    borderRadius: 20,
    marginHorizontal: 30,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    width: 250,
  },
  link: {
    color: '#1e88e5',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
    width: 250,
    fontSize: 15,
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
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  loginButton: {
    width: 'auto',
    paddingHorizontal: 30,
    alignSelf: 'center',
  },
});
