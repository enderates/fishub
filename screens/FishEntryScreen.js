// screens/BilibiliScreen.js

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
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_API_KEY } from '@env';
import * as Localization from 'expo-localization';

let DateTimePicker;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.log('DateTimePicker yüklenemedi:', error);
  }
}

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

  const handlePickerPress = (e) => {
    e.stopPropagation();
  };

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
    >
      <TouchableOpacity 
        style={styles.modalBackdrop}
        activeOpacity={1} 
        onPress={() => {
          onValueChange(tempValue);
          onClose();
        }}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={handlePickerPress}
          style={[
            styles.pickerContainer,
            position && {
              position: 'absolute',
              top: position.y,
              left: position.x,
            }
          ]}
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

const FormField = ({ field, value, onValueChange, isRequired }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerPosition, setPickerPosition] = useState(null);
  const inputRef = useRef(null);

  const handlePress = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        const PICKER_WIDTH = 150;
        const PICKER_HEIGHT = 160;

        const elementCenterX = x + (width / 2);
        const elementCenterY = y + (height / 2);

        const pickerX = elementCenterX - (PICKER_WIDTH / 2);
        const pickerY = elementCenterY - (PICKER_HEIGHT / 2);

        setPickerPosition({
          x: pickerX,
          y: pickerY
        });
        setModalVisible(true);
      });
    }
  };

  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{field.label}</Text>
        {isRequired && <Text style={styles.requiredIndicator}>*</Text>}
      </View>
      <TouchableOpacity 
        ref={inputRef}
        style={[
          styles.selectBox,
          value ? { borderColor: '#FFA500' } : { borderColor: '#fff' },
          isRequired && !value && styles.requiredField
        ]}
        onPress={handlePress}
      >
        <Text style={[styles.selectBoxText, value ? { color: '#FFA500' } : { color: '#fff' }]}>
          {value ? `${value} ${field.unit}` : `${field.label} seçin...`}
        </Text>
      </TouchableOpacity>

      <NumberPicker
        value={value}
        modalVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onValueChange={onValueChange}
        min={field.min}
        max={field.max}
        step={field.step}
        position={pickerPosition}
      />
    </View>
  );
};

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
      // Önce yerel eşleştirmeleri kontrol et
      const localMatches = Object.entries(commonTurkishFishNames)
        .filter(([turkishName]) => 
          turkishName.toLowerCase().startsWith(query.toLowerCase())
        )
        .map(([turkishName, data]) => ({
          label: data.eng,
          localName: turkishName,
          value: `local_${turkishName}`,
          scientificName: data.sci,
          isLocal: true
        }));

      // Kullanıcının sistem dilini al
      const systemLanguage = Localization.locale.split('-')[0];
      
      // API'den arama yap (İngilizce olarak)
      const url = `https://api.gbif.org/v1/species/search?taxon_key=204&limit=100&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();

      let apiResults = [];
      if (data.results && data.results.length > 0) {
        apiResults = data.results
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
                status: item.status,
                isLocal: false
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
      }

      // Yerel ve API sonuçlarını birleştir
      const allResults = [...localMatches, ...apiResults];

      // Alfabetik sıralama
      allResults.sort((a, b) => {
        try {
          return (a.label || '').localeCompare(b.label || '', 'en');
        } catch (error) {
          return 0;
        }
      });
      
      setResults(allResults);
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
                    <View style={styles.nameRow}>
                      <Text style={styles.modalListItemText}>{item.label}</Text>
                      {item.isLocal && (
                        <Text style={styles.sourceBadge}>Common</Text>
                      )}
                    </View>
                    <Text style={styles.scientificName}>{item.scientificName}</Text>
                    {item.localName && (
                      <Text style={styles.localName}>{item.localName}</Text>
                    )}
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

// Cloudinary ayarları
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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

export default function BilibiliScreen() {
  const navigation = useNavigation();

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
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const [lookupOptions, setLookupOptions] = useState([]);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const [lengthModalVisible, setLengthModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [waterTempModalVisible, setWaterTempModalVisible] = useState(false);

  const [activeField, setActiveField] = useState(null);
  const [formData, setFormData] = useState({});

  console.log('Active Field:', activeField);

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

  const handleFieldChange = (fieldId, value) => {
    console.log('Field değeri değişti:', { fieldId, value });
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

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

  useEffect(() => {
    fetch('https://api.gbif.org/v1/species/search?taxon_key=204&limit=50')
      .then(response => response.json())
      .then(data => {
        const speciesList = data.results.map(item => ({
          label: item.canonicalName,
          value: item.key.toString(),
        }));
        setFishSpecies(speciesList);
        setLoadingSpecies(false);
      })
      .catch(error => {
        console.error('Balık türleri alınamadı:', error);
        setLoadingSpecies(false);
      });
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      }
    })();
  }, []);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handlePhotoSelect = async (type) => {
    try {
      let result;
      if (type === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (result.canceled) {
        console.log('Kullanıcı işlemi iptal etti');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.error('Fotoğraf seçilmedi');
        Alert.alert('Hata', 'Fotoğraf seçilmedi');
        return;
      }

      setPhoto(result.assets[0]);
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu. Lütfen izinleri kontrol edin.');
    }
  };

  const uploadPhotoToCloudinary = async () => {
    if (!photo) return null;
  
    try {
      setUploading(true);
      console.log('Cloudinary bilgileri:', CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_API_KEY);
      
      // Platform-specific URI handling
      let photoUri = photo.uri;
      let fileName = photo.fileName || `photo_${Date.now()}.jpg`;
      let fileType = photo.type || 'image/jpeg';
      
      // Create FormData
      const formData = new FormData();
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('api_key', CLOUDINARY_API_KEY);
      
      // Handle file based on platform
      if (Platform.OS === 'web') {
        // Web platform - fetch and convert to blob
        try {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formData.append('file', blob);
          console.log('Web blob created successfully');
        } catch (error) {
          console.error('Web blob creation failed:', error);
          throw new Error('Web photo preparation failed');
        }
      } else {
        // Native platforms (iOS/Android)
        const fileInfo = {
          uri: photoUri,
          type: fileType,
          name: fileName,
        };
        
        console.log('Native file info:', fileInfo);
        formData.append('file', fileInfo);
      }
      
      // Log request details for debugging
      console.log(`Sending request to: ${CLOUDINARY_URL}`);
      console.log('Upload preset:', CLOUDINARY_UPLOAD_PRESET);
      console.log('API key:', CLOUDINARY_API_KEY);
      
      // Send the request with proper headers
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: Platform.OS === 'web' ? undefined : {
          'Accept': 'application/json',
        }
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error:', response.status, errorText);
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Parse response
      const responseData = await response.json();
      
      // Verify response contains expected data
      if (!responseData || !responseData.secure_url) {
        console.error('Invalid response from Cloudinary:', responseData);
        throw new Error('Invalid response from Cloudinary');
      }
      
      console.log('Photo upload successful:', responseData.secure_url);
      return responseData.secure_url;
      
    } catch (error) {
      console.error('Photo upload error:', error.message);
      showAlert('Uyarı', `Fotoğraf yüklenirken hata oluştu: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      let photoURL = null;
      if (photo) {
        photoURL = await uploadPhotoToCloudinary();
      }
      const fishData = {
        timestamp: Platform.OS === 'web' ? new Date(`${webDate}T${webTime}`) : dateTime,
      };
      if (photoURL) fishData.photoURL = photoURL;
      if (selectedSpecies) fishData.species = selectedSpecies;
      if (selectedLabel) fishData.speciesLabel = selectedLabel;
      if (formData.length) fishData.length = formData.length;
      if (formData.weight) fishData.weight = formData.weight;
      if (location) fishData.location = location;
      if (locationLatitude) fishData.locationLatitude = locationLatitude;
      if (locationLongitude) fishData.locationLongitude = locationLongitude;
      if (baitType) fishData.baitType = baitType;
      if (baitColor) fishData.baitColor = baitColor;
      if (baitWeight) fishData.baitWeight = baitWeight;
      if (rodType) fishData.rodType = rodType;
      if (reelType) fishData.reelType = reelType;
      if (lineThickness) fishData.lineThickness = lineThickness;
      if (seaColor) fishData.seaColor = seaColor;
      if (moonPhase) fishData.moonPhase = moonPhase;
      if (formData.waterTemp) fishData.waterTemp = formData.waterTemp;
      if (currentStatus) fishData.currentStatus = currentStatus;

      await addDoc(collection(db, "fish_entries"), fishData);

      showAlert("Başarılı", "Kayıt başarıyla eklendi.");
      
      // Reset form including photo
      setPhoto(null);
      setSelectedSpecies('');
      setSelectedLabel('');
      setBaitType('');
      setBaitColor('');
      setBaitWeight('');
      setFormData({});
      setRodType('');
      setReelType('');
      setLineThickness('');
      setSeaColor('');
      setMoonPhase('');
      setCurrentStatus('');
      setLocation('');
      setLocationLatitude(null);
      setLocationLongitude(null);
      setDateTime(new Date());
      setWebDate('');
      setWebTime('');
    } catch (error) {
      console.error("Kayıt hatası:", error);
      showAlert("Hata", "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyiniz.");
    }
  };

  const filteredSpecies = useMemo(() => {
    if (!searchText) return fishSpecies;
    return fishSpecies.filter(item => 
      item.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, fishSpecies]);

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Balık Girişi</Text>

            {/* Photo Section */}
            <View style={styles.photoSection}>
              <Text style={styles.label}>Fotoğraf</Text>
              {photo ? (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhoto(null)}
                  >
                    <Text style={styles.removePhotoText}>Fotoğrafı Kaldır</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handlePhotoSelect('camera')}
                  >
                    <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handlePhotoSelect('gallery')}
                  >
                    <Text style={styles.photoButtonText}>Galeriden Seç</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Balık Türü</Text>
              </View>
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

            <SpeciesPickerModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              onSelect={(value, label) => {
                setSelectedSpecies(value);
                setSelectedLabel(label);
                setModalVisible(false);
              }}
            />

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Konum</Text>
              </View>
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
                value={formData[field.id]}
                onValueChange={(value) => handleFieldChange(field.id, value)}
                isRequired={false}
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
                label="Kaydet" 
                onPress={handleSave} 
                style={styles.customButton}
              />
            </View>

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
                        onPress={() => { activeSetter(item); setLookupModalVisible(false); }}
                        style={styles.listItem}
                      >
                        <Text>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
                <View style={styles.buttonContainer}>
                  <ModernButton 
                    label="Kapat" 
                    onPress={() => setLookupModalVisible(false)} 
                    style={styles.customButton}
                  />
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#000' },
  container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#fff' },
  inputGroup: { marginBottom: 15 },
  label: { marginBottom: 5, fontWeight: 'bold', color: '#fff' },
  input: { borderWidth: 1, padding: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' },
  selectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectBoxSmall: {
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    padding: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#3c3c3c',
  },
  selectBoxSmallDate: { borderWidth: 1, borderRadius: 5, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  selectBoxText: { color: '#fff', fontSize: 16 },
  picker: { width: '100%', backgroundColor: 'transparent' },
  pickerItem: { color: '#fff', fontSize: 24, ...Platform.select({
    ios: {
      height: 120,
    },
  }) },
  listItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButtonContainer: { marginTop: Platform.OS === 'android' ? 50 : 60, marginLeft: 20, position: 'absolute', zIndex: 999 },
  backText: { color: '#fff', fontSize: 18 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    borderRadius: 14,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
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
  modalListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalListItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  
  customButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 0,
    width: 'auto', // İçeriğe göre genişlik
    alignSelf: 'center',
  },
  photoSection: {
    marginBottom: 20,
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
  photoPreview: {
    alignItems: 'center',
    marginTop: 10,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  removePhotoButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 10,
    borderRadius: 5,
  },
  removePhotoText: {
    color: '#fff',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  requiredIndicator: {
    color: 'red',
    marginLeft: 4,
  },
  requiredField: {
    borderColor: 'red',
    borderWidth: 1,
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
  listItemContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scientificName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  localName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
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
