// screens/EditFishScreen.js

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  ImageBackground,
  SafeAreaView,
  Pressable,
  TextInput,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';
import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_API_KEY } from '@env';
import { getWeatherData } from '../services/weatherService';
import * as Localization from 'expo-localization';

// Cloudinary ayarları
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

let DateTimePicker;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.log('DateTimePicker yüklenemedi:', error);
  }
}

// Tarih ve saat seçici komponenti
const DateTimePickerComponent = ({ value, onChange }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webDateContainer}>
        <TextInput
          style={styles.webDateInput}
          placeholder="YYYY-MM-DD"
          value={value ? value.toISOString().split('T')[0] : ''}
          onChangeText={(text) => {
            const [year, month, day] = text.split('-').map(Number);
            if (year && month && day) {
              const newDate = new Date(value);
              newDate.setFullYear(year, month - 1, day);
              onChange(newDate);
            }
          }}
        />
        <TextInput
          style={styles.webDateInput}
          placeholder="HH:MM"
          value={value ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : ''}
          onChangeText={(text) => {
            const [hours, minutes] = text.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const newDate = new Date(value);
              newDate.setHours(hours, minutes);
              onChange(newDate);
            }
          }}
        />
      </View>
    );
  }

  return DateTimePicker ? (
    <DateTimePicker
      value={value || new Date()}
      onChange={(event, selectedDate) => onChange(selectedDate || value)}
      mode="datetime"
      textColor="#fff"
      themeVariant="dark"
      style={{ flex: 1 }}
    />
  ) : (
    <Text style={styles.errorText}>DateTimePicker yüklenemedi</Text>
  );
};

export default function EditFishScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const recordId = route.params?.id;

  // State tanımlamaları
  const [baitType, setBaitType] = useState('');
  const [baitColor, setBaitColor] = useState('');
  const [baitWeight, setBaitWeight] = useState('');
  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [rodType, setRodType] = useState('');
  const [reelType, setReelType] = useState('');
  const [lineThickness, setLineThickness] = useState('');
  const [seaColor, setSeaColor] = useState('');
  const [moonPhase, setMoonPhase] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [location, setLocation] = useState('');
  const [locationLatitude, setLocationLatitude] = useState(null);
  const [locationLongitude, setLocationLongitude] = useState(null);
  const [dateTime, setDateTime] = useState(new Date());
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoURL, setPhotoURL] = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const [lookupOptions, setLookupOptions] = useState([]);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const [lengthModalVisible, setLengthModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [waterTempModalVisible, setWaterTempModalVisible] = useState(false);

  const [weatherData, setWeatherData] = useState(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Lookup keys
  const lookupKeys = {
    baitType: 'baitTypes',
    baitColor: 'baitColors',
    baitWeight: 'baitWeights',
    rodType: 'rodTypes',
    reelType: 'reelTypes',
    lineThickness: 'lineThicknessOptions',
    seaColor: 'seaColors',
    moonPhase: 'moonPhases',
    currentStatus: 'currentStatuses'
  };

  // Form alanları tanımı
  const FORM_FIELDS = useMemo(() => [
    {
      id: 'length',
      label: 'Boy',
      min: 0,
      max: 300,
      step: 1,
      unit: 'cm'
    },
    {
      id: 'weight',
      label: 'Ağırlık',
      min: 0,
      max: 50000,
      step: 10,
      unit: 'gr'
    }
  ], []);

  // Yaygın Türkçe balık isimleri ve eşleştirmeleri
  const commonTurkishFishNames = {
    'levrek': { eng: 'European seabass', sci: 'Dicentrarchus labrax' },
    'hamsi': { eng: 'European anchovy', sci: 'Engraulis encrasicolus' },
    'lüfer': { eng: 'Bluefish', sci: 'Pomatomus saltatrix' },
    'çipura': { eng: 'Gilt-head bream', sci: 'Sparus aurata' },
    'palamut': { eng: 'Atlantic bonito', sci: 'Sarda sarda' },
    'istavrit': { eng: 'Atlantic horse mackerel', sci: 'Trachurus trachurus' },
    'kefal': { eng: 'Flathead grey mullet', sci: 'Mugil cephalus' },
    'mezgit': { eng: 'Whiting', sci: 'Merlangius merlangus' },
    'sardalya': { eng: 'European pilchard', sci: 'Sardina pilchardus' },
    'uskumru': { eng: 'Atlantic mackerel', sci: 'Scomber scombrus' },
    'kalkan': { eng: 'Turbot', sci: 'Scophthalmus maximus' },
    'dil balığı': { eng: 'Common sole', sci: 'Solea solea' },
    'tekir': { eng: 'Striped red mullet', sci: 'Mullus surmuletus' },
    'barbunya': { eng: 'Red mullet', sci: 'Mullus barbatus' },
    'fangri': { eng: 'Red porgy', sci: 'Pagrus pagrus' },
    'sinarit': { eng: 'Common dentex', sci: 'Dentex dentex' },
    'orfoz': { eng: 'Dusky grouper', sci: 'Epinephelus marginatus' },
    'lahos': { eng: 'White grouper', sci: 'Epinephelus aeneus' },
    'karagöz': { eng: 'Common two-banded seabream', sci: 'Diplodus vulgaris' },
    'sargoz': { eng: 'White seabream', sci: 'Diplodus sargus' }
  };

  // Mevcut kaydı yükle
  useEffect(() => {
    if (recordId) {
      const fetchData = async () => {
        try {
          const docRef = doc(db, 'fish_entries', recordId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBaitType(data.baitType || '');
            setBaitColor(data.baitColor || '');
            setBaitWeight(data.baitWeight || '');
            setLength(data.length || '');
            setWeight(data.weight || '');
            setRodType(data.rodType || '');
            setReelType(data.reelType || '');
            setLineThickness(data.lineThickness || '');
            setSeaColor(data.seaColor || '');
            setMoonPhase(data.moonPhase || '');
            setWaterTemp(data.waterTemp || '');
            setCurrentStatus(data.currentStatus || '');
            setLocation(data.location || '');
            setLocationLatitude(data.locationLatitude || null);
            setLocationLongitude(data.locationLongitude || null);
            setDateTime(data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date());
            setSelectedSpecies(data.species || '');
            setSelectedLabel(data.speciesLabel || '');
            setPhotoURL(data.photoURL || null);
          }
        } catch (error) {
          console.error('Kayıt getirilemedi:', error);
          Alert.alert('Hata', 'Kayıt getirilemedi.');
        }
      };
      fetchData();
    }

    // Kullanıcının sistem dilini al
    const systemLanguage = Localization.locale.split('-')[0]; // Örnek: 'tr', 'en', 'de' vb.
    
    // GBIF API'den balık türlerini kullanıcının dilinde getir
    fetchFishSpecies(0);

    if (location) {
      fetchWeatherData();
    }
  }, [recordId, location]);

  const fetchWeatherData = async () => {
    try {
      let latitude = locationLatitude;
      let longitude = locationLongitude;
      // Fallback: eski location stringini parse et
      if ((latitude == null || longitude == null) && location) {
        const parts = location.split(',');
        if (parts.length === 2) {
          latitude = parseFloat(parts[0].trim());
          longitude = parseFloat(parts[1].trim());
        }
      }
      // Sadece geçerli ise API'ye gönder
      if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
        const data = await getWeatherData(latitude, longitude, dateTime);
        setWeatherData(data);
      } else {
        setWeatherData(null);
      }
    } catch (error) {
      console.error('Hava durumu verisi alınamadı:', error);
    }
  };

  // Değer değiştirme işleyicisi
  const handleValueChange = useCallback((id, value) => {
    switch(id) {
      case 'length':
        setLength(value);
        break;
      case 'weight':
        setWeight(value);
        break;
      case 'waterTemp':
        setWaterTemp(value);
        break;
    }
  }, []);

  // Modal görünürlük işleyicisi
  const handleModalVisibility = useCallback((id, visible) => {
    switch(id) {
      case 'length':
        setLengthModalVisible(visible);
        break;
      case 'weight':
        setWeightModalVisible(visible);
        break;
      case 'waterTemp':
        setWaterTempModalVisible(visible);
        break;
    }
  }, []);

  // Lookup verilerini getir
  const fetchLookupData = async (key, setter) => {
    const actualKey = lookupKeys[key];
    setActiveLookupKey(key);
    setActiveSetter(() => setter);
    setLoadingLookup(true);
    setLookupModalVisible(true);
    try {
      const docRef = doc(db, 'lookup_tables', actualKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && Array.isArray(docSnap.data().values)) {
        setLookupOptions(docSnap.data().values);
      } else {
        setLookupOptions([]);
      }
    } catch (error) {
      console.error(`${key} verisi alınamadı:`, error);
      setLookupOptions([]);
    }
    setLoadingLookup(false);
  };

  const handleCameraSelect = async () => {
    try {
      console.log('Kamera başlatılıyor...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true
      });
      console.log('Kamera sonucu:', result.canceled ? 'İptal edildi' : 'Fotoğraf çekildi');

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        console.log('Seçilen dosya bilgileri:', {
          uri: selectedAsset.uri,
          hasBase64: !!selectedAsset.base64,
          width: selectedAsset.width,
          height: selectedAsset.height
        });
        
        setPhotoURL(selectedAsset.uri);

        try {
          console.log('Cloudinary yükleme hazırlığı başlıyor...');
          const base64Data = selectedAsset.base64;
          if (!base64Data) {
            console.error('Base64 veri bulunamadı!');
            throw new Error('Base64 veri alınamadı');
          }

          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${base64Data}`);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('api_key', CLOUDINARY_API_KEY);
          console.log('FormData oluşturuldu, Cloudinary bilgileri:', {
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            apiKey: CLOUDINARY_API_KEY ? 'Mevcut' : 'Eksik',
            url: CLOUDINARY_URL
          });

          const timestamp = Math.round((new Date()).getTime() / 1000);
          formData.append('timestamp', timestamp);

          console.log('Cloudinary\'ye yükleme başlıyor...');
          const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Requested-With': 'XMLHttpRequest',
            }
          });

          console.log('Cloudinary yanıt durumu:', response.status, response.statusText);
          const responseText = await response.text();
          console.log('Cloudinary ham yanıt:', responseText);

          let data;
          try {
            data = JSON.parse(responseText);
            console.log('Cloudinary işlenmiş yanıt:', data);
          } catch (jsonError) {
            console.error('JSON ayrıştırma hatası:', jsonError);
            throw new Error('Sunucu yanıtı işlenemedi');
          }

          if (data.secure_url) {
            console.log('Yükleme başarılı! URL:', data.secure_url);
            setPhotoURL(data.secure_url);
          } else {
            console.error('Cloudinary yanıt hatası - URL yok:', data);
            throw new Error(data.error?.message || 'Cloudinary yanıtında URL bulunamadı');
          }
        } catch (uploadError) {
          console.error('Fotoğraf yükleme detaylı hata:', {
            message: uploadError.message,
            stack: uploadError.stack,
            name: uploadError.name
          });
          Alert.alert('Hata', `Fotoğraf yüklenirken bir hata oluştu: ${uploadError.message}`);
        }
      }
    } catch (error) {
      console.error('Kamera genel hata:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Hata', 'Kamera açılırken bir hata oluştu.');
    }
  };

  const handleGallerySelect = async () => {
    try {
      console.log('Galeri başlatılıyor...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true
      });
      console.log('Galeri sonucu:', result.canceled ? 'İptal edildi' : 'Fotoğraf seçildi');

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        console.log('Seçilen dosya bilgileri:', {
          uri: selectedAsset.uri,
          hasBase64: !!selectedAsset.base64,
          width: selectedAsset.width,
          height: selectedAsset.height
        });
        
        setPhotoURL(selectedAsset.uri);

        try {
          console.log('Cloudinary yükleme hazırlığı başlıyor...');
          const base64Data = selectedAsset.base64;
          if (!base64Data) {
            console.error('Base64 veri bulunamadı!');
            throw new Error('Base64 veri alınamadı');
          }

          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${base64Data}`);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('api_key', CLOUDINARY_API_KEY);
          console.log('FormData oluşturuldu, Cloudinary bilgileri:', {
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            apiKey: CLOUDINARY_API_KEY ? 'Mevcut' : 'Eksik',
            url: CLOUDINARY_URL
          });

          const timestamp = Math.round((new Date()).getTime() / 1000);
          formData.append('timestamp', timestamp);

          console.log('Cloudinary\'ye yükleme başlıyor...');
          const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Requested-With': 'XMLHttpRequest',
            }
          });

          console.log('Cloudinary yanıt durumu:', response.status, response.statusText);
          const responseText = await response.text();
          console.log('Cloudinary ham yanıt:', responseText);

          let data;
          try {
            data = JSON.parse(responseText);
            console.log('Cloudinary işlenmiş yanıt:', data);
          } catch (jsonError) {
            console.error('JSON ayrıştırma hatası:', jsonError);
            throw new Error('Sunucu yanıtı işlenemedi');
          }

          if (data.secure_url) {
            console.log('Yükleme başarılı! URL:', data.secure_url);
            setPhotoURL(data.secure_url);
          } else {
            console.error('Cloudinary yanıt hatası - URL yok:', data);
            throw new Error(data.error?.message || 'Cloudinary yanıtında URL bulunamadı');
          }
        } catch (uploadError) {
          console.error('Fotoğraf yükleme detaylı hata:', {
            message: uploadError.message,
            stack: uploadError.stack,
            name: uploadError.name
          });
          Alert.alert('Hata', `Fotoğraf yüklenirken bir hata oluştu: ${uploadError.message}`);
        }
      }
    } catch (error) {
      console.error('Galeri genel hata:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  // Güncelleme işlemi
  const handleUpdate = async () => {
    try {
      const docRef = doc(db, 'fish_entries', recordId);
      const recordData = {
        species: selectedSpecies,
        speciesLabel: selectedLabel,
        baitType: baitType || '',
        baitColor: baitColor || '',
        baitWeight: baitWeight || '',
        length: length || '',
        weight: weight || '',
        rodType: rodType || '',
        reelType: reelType || '',
        lineThickness: lineThickness || '',
        seaColor: seaColor || '',
        moonPhase: moonPhase || '',
        waterTemp: waterTemp || '',
        currentStatus: currentStatus || '',
        location: location || '',
        locationLatitude: locationLatitude || null,
        locationLongitude: locationLongitude || null,
        timestamp: dateTime,
        photoURL: photoURL || null,
        weather: weatherData?.weather || '',
        temperature: weatherData?.temperature || '',
        wind: weatherData?.wind || '',
        pressure: weatherData?.pressure || '',
        waves: weatherData?.waves || ''
      };
      await updateDoc(docRef, recordData);

      Alert.alert("Başarılı", "Kayıt başarıyla güncellendi.");
      navigation.goBack();
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      Alert.alert("Hata", "Güncelleme sırasında bir hata oluştu.");
    }
  };

  // Balık türlerini yükle
  const fetchFishSpecies = async (searchText = '') => {
    try {
      const systemLanguage = Localization.locale.split('-')[0];
      let url;

      if (searchText) {
        url = `https://api.gbif.org/v1/species/search?taxon_key=204&limit=100&q=${encodeURIComponent(searchText)}&language=${systemLanguage}`;
      } else {
        url = `https://api.gbif.org/v1/species/search?taxon_key=204&limit=100&language=${systemLanguage}`;
      }

      console.log('API URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('API Response:', data);

      if (!data.results || data.results.length === 0) {
        console.log('API boş sonuç döndü');
        return [];
      }

      const speciesList = data.results.map(item => {
        // Önce kullanıcının dilinde isim ara
        const vernacularName = item.vernacularNames?.find(name => name.language === systemLanguage)?.vernacularName;
        
        // Eğer bulunamazsa, herhangi bir dildeki ismi kullan
        const anyVernacularName = item.vernacularNames?.[0]?.vernacularName;
        
        // Son çare olarak bilimsel ismi kullan
        const displayName = vernacularName || anyVernacularName || item.canonicalName;
        
        return {
          label: displayName,
          value: item.key.toString(),
        };
      });

      // Alfabetik sıralama
      speciesList.sort((a, b) => a.label.localeCompare(b.label, systemLanguage));

      return speciesList;
    } catch (error) {
      console.error('Balık türleri alınamadı:', error);
      return [];
    }
  };

  // Arama işlemi
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setIsSearching(true);
      const results = await fetchFishSpecies(text);
      console.log('Search results:', results);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  // SpeciesPickerModal bileşenini güncelle
  const SpeciesPickerModal = memo(({ visible, onClose, onSelect }) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchFish = async (query) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Kullanıcının sistem dilini al
        const systemLanguage = Localization.locale.split('-')[0];
        
        // API'den arama yap (İngilizce olarak)
        const url = `https://api.gbif.org/v1/species/search?taxon_key=204&limit=100&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const speciesList = data.results
            .map(item => {
              try {
                // Önce İngilizce ismi al
                const engName = item.vernacularNames?.find(name => name.language === 'eng')?.vernacularName;
                // Sonra kullanıcının dilindeki ismi ara
                const localName = item.vernacularNames?.find(name => name.language === systemLanguage)?.vernacularName;
                
                // Eğer İngilizce isim yoksa, bilimsel ismi kullan
                const displayName = engName || item.canonicalName || 'Unknown Species';
                
                return {
                  label: displayName,
                  localName: localName || null,
                  value: item.key.toString(),
                  scientificName: item.canonicalName || 'Unknown Species',
                  rank: item.rank,
                  status: item.status
                };
              } catch (error) {
                console.warn('Invalid species data:', item);
                return null;
              }
            })
            .filter(Boolean) // null değerleri filtrele
            // Başlangıç kontrolü yap
            .filter(item => {
              try {
                const searchWords = query.toLowerCase().split(' ');
                const nameWords = (item.label || '').toLowerCase().split(' ');
                
                // Her arama kelimesi için, balık ismindeki herhangi bir kelimenin başlangıcıyla eşleşmeli
                return searchWords.every(searchWord => 
                  nameWords.some(nameWord => nameWord.startsWith(searchWord))
                );
              } catch (error) {
                return false;
              }
            });

          // Alfabetik sıralama
          speciesList.sort((a, b) => {
            try {
              return (a.label || '').localeCompare(b.label || '', 'en');
            } catch (error) {
              return 0;
            }
          });
          
          setResults(speciesList);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Arama hatası:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={false}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1c1e' }}>
          <View style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalHeaderButtonText}>İptal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Balık Türü Seç</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalHeaderButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search fish species..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  searchFish(text);
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="always"
                style={{ flex: 1, backgroundColor: '#1c1c1e' }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchText.length > 0 ? 'No results found' : 'Start typing to search...'}
                    </Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => {
                      onSelect(item.value, item.label);
                      onClose();
                    }}
                    style={styles.modalListItem}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.modalListItemText}>{item.label}</Text>
                      <View style={styles.nameContainer}>
                        {item.localName && (
                          <Text style={styles.localName}>{item.localName}</Text>
                        )}
                        <Text style={styles.scientificName}>{item.scientificName}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  });

  // PickerModal komponenti
  const PickerModal = memo(({ 
    label, 
    value, 
    modalVisible, 
    onClose, 
    onValueChange, 
    max 
  }) => {
    const [localValue, setLocalValue] = useState(value);

    const handleConfirm = () => {
      onValueChange(localValue);
      onClose();
    };

    useEffect(() => {
      if (modalVisible) {
        setLocalValue(value);
      }
    }, [modalVisible, value]);

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalHeaderButton} 
                onPress={onClose}
              >
                <Text style={styles.modalHeaderButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>{label}</Text>
              
              <TouchableOpacity 
                style={styles.modalHeaderButton} 
                onPress={handleConfirm}
              >
                <Text style={[styles.modalHeaderButtonText, styles.modalHeaderButtonTextConfirm]}>
                  Tamam
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={localValue}
                onValueChange={setLocalValue}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {[...Array(max + 1)].map((_, i) => (
                  <Picker.Item 
                    key={i} 
                    label={i.toString()} 
                    value={i.toString()}
                    color="#fff"
                  />
                ))}
              </Picker>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  });

  // NumberPicker komponenti
  const NumberPicker = memo(({ 
    value,
    modalVisible,
    onClose,
    onValueChange,
    min = 0,
    max,
    step = 1,
    position 
  }) => {
    const [tempValue, setTempValue] = useState(value || min);

    const handlePickerContainerPress = (e) => {
      e.stopPropagation();
    };

    const handleBackdropPress = () => {
      onValueChange(tempValue);
      onClose();
    };

    if (!modalVisible || !position) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={handleBackdropPress}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1} 
          onPress={handleBackdropPress}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={[
              styles.pickerContainer,
              {
                position: 'absolute',
                top: position.y,
                left: position.x,
              }
            ]}
            onPress={handlePickerContainerPress}
          >
            <Picker
              selectedValue={tempValue.toString()}
              onValueChange={(val) => {
                setTempValue(Number(val));
              }}
              style={styles.picker}
            >
              {Array.from(
                { length: Math.floor((max - min) / step) + 1 },
                (_, i) => {
                  const val = min + (i * step);
                  return (
                    <Picker.Item
                      key={val.toString()}
                      label={val.toString()}
                      value={val.toString()}
                      color="#fff"
                    />
                  );
                }
              )}
            </Picker>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  });

  // Form Field komponenti
  const FormField = memo(({ field, value, onPress, modalVisible, onModalClose, onValueChange }) => {
    const [pickerPosition, setPickerPosition] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
      if (modalVisible && inputRef.current) {
        inputRef.current.measureInWindow((x, y, width, height) => {
          // Picker'ın boyutları
          const PICKER_WIDTH = 150;
          const PICKER_HEIGHT = 160;

          // Tıklanan nesnenin merkez noktasını bul
          const elementCenterX = x + (width / 2);
          const elementCenterY = y + (height / 2);

          // Picker'ı tam merkeze konumlandırmak için offset hesapla
          const pickerX = elementCenterX - (PICKER_WIDTH / 2);
          const pickerY = elementCenterY - (PICKER_HEIGHT / 2);

          console.log('Positions:', {
            elementCenter: { x: elementCenterX, y: elementCenterY },
            pickerPosition: { x: pickerX, y: pickerY }
          });

          setPickerPosition({
            x: pickerX,
            y: pickerY
          });
        });
      }
    }, [modalVisible]);

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{field.label}</Text>
        <TouchableOpacity 
          ref={inputRef}
          style={[
            styles.selectBox,
            value ? { borderColor: '#FFA500' } : { borderColor: '#fff' }
          ]}
          onPress={onPress}
        >
          <Text style={[styles.selectBoxText, value ? { color: '#FFA500' } : { color: '#fff' }]}>
            {value ? value : 'Seçiniz...'}
          </Text>
        </TouchableOpacity>

        <NumberPicker
          value={value ? Number(value) : field.min}
          modalVisible={modalVisible}
          onClose={onModalClose}
          onValueChange={onValueChange}
          min={field.min}
          max={field.max}
          step={field.step}
          position={pickerPosition}
        />
      </View>
    );
  });

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Kayıt Düzenle</Text>
            
            {/* Fotoğraf Bölümü */}
            <View style={styles.photoSection}>
              <Text style={styles.label}>Fotoğraf</Text>
              {photoURL ? (
                <View style={styles.photoPreview}>
                  <TouchableOpacity
                    onPress={() => setPhotoModalVisible(true)}
                  >
                    <Image source={{ uri: photoURL }} style={styles.photo} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoURL(null)}
                  >
                    <Text style={styles.removePhotoText}>Fotoğrafı Kaldır</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleCameraSelect}
                  >
                    <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleGallerySelect}
                  >
                    <Text style={styles.photoButtonText}>Galeriden Seç</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Balık Türü</Text>
              <TouchableOpacity
                style={[
                  styles.selectBox,
                  selectedLabel ? { borderColor: '#FFA500' } : { borderColor: '#fff' }
                ]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[styles.selectBoxText, selectedLabel ? { color: '#FFA500' } : { color: '#fff' }]}>
                  {selectedLabel || 'Balık türü seçin...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Konum</Text>
              <TouchableOpacity
                style={[
                  styles.selectBox,
                  location ? { borderColor: '#FFA500' } : { borderColor: '#fff' }
                ]}
                onPress={() => {
                  try {
                    navigation.navigate('MapPicker', {
                      onLocationSelected: (coords) => {
                        const formatted = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
                        setLocation(formatted);
                        setLocationLatitude(coords.latitude);
                        setLocationLongitude(coords.longitude);
                      },
                    });
                  } catch (error) {
                    console.error('MapPicker navigasyon hatası:', error);
                    Alert.alert('Hata', 'Harita açılırken bir sorun oluştu. Lütfen tekrar deneyin.');
                  }
                }}
              >
                <Text style={[styles.selectBoxText, location ? { color: '#FFA500' } : { color: '#fff' }]}>
                  {location || 'Konum seçin...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tarih & Saat</Text>
              <View style={[styles.selectBoxSmallDate, dateTime ? { borderColor: '#FFA500' } : { borderColor: '#fff' }]}>
                <DateTimePickerComponent 
                  value={dateTime}
                  onChange={(selectedDate) => setDateTime(selectedDate || dateTime)}
                />
              </View>
            </View>

            {FORM_FIELDS.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={
                  field.id === 'length' ? length :
                  field.id === 'weight' ? weight :
                  waterTemp
                }
                onPress={() => handleModalVisibility(field.id, true)}
                modalVisible={
                  field.id === 'length' ? lengthModalVisible :
                  field.id === 'weight' ? weightModalVisible :
                  waterTempModalVisible
                }
                onModalClose={() => handleModalVisibility(field.id, false)}
                onValueChange={(value) => handleValueChange(field.id, value)}
              />
            ))}

            {[{
              label: 'Yem Tipi', value: baitType, setter: setBaitType, key: 'baitType'
            }, {
              label: 'Yem Rengi', value: baitColor, setter: setBaitColor, key: 'baitColor'
            }, {
              label: 'Yem Ağırlığı', value: baitWeight, setter: setBaitWeight, key: 'baitWeight'
            }, {
              label: 'Kamış Tipi', value: rodType, setter: setRodType, key: 'rodType'
            }, {
              label: 'Makine Tipi', value: reelType, setter: setReelType, key: 'reelType'
            }, {
              label: 'Misina Kalınlığı', value: lineThickness, setter: setLineThickness, key: 'lineThickness'
            }, {
              label: 'Denizin Rengi', value: seaColor, setter: setSeaColor, key: 'seaColor'
            }, {
              label: 'Akıntı Durumu', value: currentStatus, setter: setCurrentStatus, key: 'currentStatus'
            }].map(({ label, value, setter, key }, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    value ? { borderColor: '#FFA500' } : { borderColor: '#fff' }
                  ]}
                  onPress={() => fetchLookupData(key, setter)}
                >
                  <Text style={[styles.selectBoxText, value ? { color: '#FFA500' } : { color: '#fff' }]}>
                    {value || 'Seçiniz...'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.buttonContainer}>
              <ModernButton 
                label="Güncelle" 
                onPress={handleUpdate}
                style={styles.customButton}
              />
            </View>

            <SpeciesPickerModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              onSelect={(value, label) => {
                setSelectedSpecies(value);
                setSelectedLabel(label);
                setModalVisible(false);
              }}
            />

            <Modal
              visible={lookupModalVisible}
              animationType="slide"
              transparent={false}
              presentationStyle="pageSheet"
              onRequestClose={() => setLookupModalVisible(false)}
            >
              <View style={{ flex: 1, padding: 20 }}>
                <Text style={styles.title}>{activeLookupKey} Seçimi</Text>
                {loadingLookup ? <ActivityIndicator size="large" /> : (
                  <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    data={lookupOptions}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          activeSetter(item);
                          setLookupModalVisible(false);
                        }}
                        style={styles.listItem}
                      >
                        <Text>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
                <ModernButton label="Kapat" onPress={() => setLookupModalVisible(false)} />
              </View>
            </Modal>

            {/* Tam ekran fotoğraf modali */}
            <Modal
              visible={photoModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setPhotoModalVisible(false)}
            >
              <View style={styles.fullScreenModalBackdrop}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setPhotoModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Image 
                  source={{ uri: photoURL }} 
                  style={styles.fullScreenImage} 
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center', 
    color: '#fff' 
  },
  inputGroup: { 
    marginBottom: 15 
  },
  label: { 
    marginBottom: 5, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  selectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectBoxText: { 
    color: '#fff', 
    fontSize: 16 
  },
  selectBoxSmallDate: {
    borderWidth: 1,
    borderRadius: 5,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center'
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  pickerContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 8,
    width: 150,
    height: 160,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  pickerItem: {
    fontSize: 24,
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  
  customButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 0,
    width: 'auto',
    alignSelf: 'center',
  },
  pickerWrapper: {
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  modalHeaderButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  modalListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalListItemText: {
    color: '#fff',
    fontSize: 16,
  },
  photoSection: {
    marginBottom: 15,
    alignItems: 'center',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  removePhotoButton: {
    marginLeft: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '100%',
  },
  photoButton: {
    flex: 1,
    marginHorizontal: 8,
    height: 45,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fullScreenModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
  },
  localBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  listItemContent: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  localName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  scientificName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: '#fff',
  },
  webDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  webDateInput: {
    flex: 1,
    height: 40,
    color: '#fff',
    borderWidth: 0,
    marginHorizontal: 5,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 5,
  },
});
