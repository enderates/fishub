import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_API_KEY } from '@env';

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export default function UserProfile({ navigation }) {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    photoURL: null
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.replace('Login');
      return;
    }
    loadUserProfile();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Uyarı', 'Fotoğraf seçebilmek için galeri izni gerekiyor.');
      }
    }
  };

  const loadUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
      Alert.alert('Hata', 'Profil yüklenirken bir sorun oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloudinary = async (base64Data) => {
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Data}`);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('folder', 'profile_photos');

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cloudinary error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Fotoğraf URL\'i alınamadı');
    }

    return data.secure_url;
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUpdating(true);
        const selectedAsset = result.assets[0];
        
        try {
          const base64Data = selectedAsset.base64;
          if (!base64Data) {
            throw new Error('Fotoğraf verisi alınamadı');
          }

          // FormData oluştur
          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${base64Data}`);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('api_key', CLOUDINARY_API_KEY);
          
          // Timestamp ekle
          const timestamp = Math.round((new Date()).getTime() / 1000);
          formData.append('timestamp', timestamp);

          // Cloudinary'ye yükle
          const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Requested-With': 'XMLHttpRequest',
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloudinary error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          if (!data.secure_url) {
            throw new Error('Fotoğraf URL\'i alınamadı');
          }

          // Firestore güncelleme
          const updatedProfile = { ...profile, photoURL: data.secure_url };
          await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
          
          // Auth profili güncelleme
          await updateProfile(auth.currentUser, { photoURL: data.secure_url });
          
          setProfile(updatedProfile);
          Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
        } catch (error) {
          console.error('Fotoğraf yükleme hatası:', error);
          Alert.alert('Hata', 'Fotoğraf yüklenirken bir sorun oluştu: ' + error.message);
        } finally {
          setUpdating(false);
        }
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu: ' + error.message);
      setUpdating(false);
    }
  };

  const handleSave = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      Alert.alert('Uyarı', 'Lütfen ad ve soyad alanlarını doldurun.');
      return;
    }

    setUpdating(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), profile);
      Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleImagePick} 
        style={styles.imageContainer}
        disabled={updating}
      >
        {profile.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.profileImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text>Fotoğraf Ekle</Text>
          </View>
        )}
        {updating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Ad"
        value={profile.firstName}
        onChangeText={(text) => setProfile(prev => ({ ...prev, firstName: text }))}
        editable={!updating}
      />

      <TextInput
        style={styles.input}
        placeholder="Soyad"
        value={profile.lastName}
        onChangeText={(text) => setProfile(prev => ({ ...prev, lastName: text }))}
        editable={!updating}
      />

      <TouchableOpacity 
        style={[styles.button, updating && styles.disabledButton]} 
        onPress={handleSave}
        disabled={updating}
      >
        <Text style={styles.buttonText}>
          {updating ? 'Kaydediliyor...' : 'Kaydet'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]} 
        onPress={handleLogout}
        disabled={updating}
      >
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 