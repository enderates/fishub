// screens/HomeScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [profilePhoto, setProfilePhoto] = useState(null);

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
  }, []);

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
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={24}
              color="#007AFF"
              style={{ marginRight: 15 }}
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, profilePhoto]);

  const MenuButton = ({ title, icon, onPress, colors }) => (
    <Animatable.View
      animation="fadeInUp"
      duration={1000}
      useNativeDriver
    >
      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors}
          style={styles.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name={icon} size={40} color="white" />
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <ImageBackground
      source={require('../assets/bg02.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Animatable.Text
          animation="fadeInDown"
          duration={1000}
          style={styles.title}
        >
          FisHub
        </Animatable.Text>
        
        <View style={styles.buttonGrid}>
          <MenuButton
            title="Veri Giriş"
            icon="fish"
            onPress={() => navigation.navigate('FishEntry')}
            colors={['#4a90e2', '#357abd']}
          />
          
          <MenuButton
            title="Veri Düzenleme"
            icon="database-edit"
            onPress={() => navigation.navigate('RecordList')}
            colors={['#50c878', '#3da066']}
          />
          
          <MenuButton
            title="Analiz"
            icon="chart-line"
            onPress={() => navigation.navigate('FishAnaliz')}
            colors={['#ff6b6b', '#e74c3c']}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  buttonGrid: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  buttonContainer: {
    marginVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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