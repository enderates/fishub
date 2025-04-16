// screens/HomeScreen.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import ModernButton from '../components/ModernButton';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require('../assets/bg02.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.centeredContent}>
          <View style={styles.wrapper}>
            <Text style={styles.title}>Hoş Geldin Fishub!</Text>

            <View style={styles.buttonContainer}>
              <ModernButton
                label="Veri Giriş Ekranına Git"
                onPress={() => navigation.navigate('FishEntry')}
                style={styles.customButton}
              />
            </View>

            <View style={styles.buttonContainer}>
              <ModernButton
                label="Raporla / Sil / Değiştir"
                onPress={() => navigation.navigate('RecordList')}
                style={styles.customButton}
              />
            </View>
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
  wrapper: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 30,
    paddingBottom: 50,
    borderRadius: 20,
    marginHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#0d47a1',
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
    marginVertical: 5,
  },
  customButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 10,
    width: 'auto',
    alignSelf: 'center',
  },
});