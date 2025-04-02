// screens/ForgotPasswordScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleReset = () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-mail adresinizi girin.');
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        navigation.goBack();
      })
      .catch((error) => Alert.alert('Hata', error.message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Sıfırlama</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail adresiniz"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button title="Sıfırlama Maili Gönder" onPress={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 15 },
});
