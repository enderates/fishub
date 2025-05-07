// screens/HomeScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import ModernButton from '../components/ModernButton';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Profil fotoğrafı listener'ı
  useEffect(() => {
    let unsubscribe;
    
    if (auth.currentUser) {
      unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        if (doc.exists()) {
          setProfilePhoto(doc.data().photoURL);
        }
      }, (error) => {
        console.log('Listener error:', error);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);  // profilePhoto dependency'si kaldırıldı

  // Header options'ı ayrı bir useEffect'te yönetiyoruz
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={styles.profilePhoto}
            />
          ) : (
            <Ionicons
              name="person-circle-outline"
              size={24}
              color="#007AFF"
              style={{ marginRight: 15 }}
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, profilePhoto]);

  return (
    <ImageBackground
      source={require('../assets/bg02.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
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
                label="FishAnaliz"
                onPress={() => navigation.navigate('FishAnaliz')}
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
  profileButton: {
    marginRight: 15,
  },
  profilePhoto: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});