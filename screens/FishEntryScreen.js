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
  TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
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

const FormField = ({ field, value, onValueChange }) => {
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
      <Text style={styles.label}>{field.label}</Text>
      <TouchableOpacity 
        ref={inputRef}
        style={styles.selectBox}
        onPress={handlePress}
      >
        <Text style={styles.selectBoxText}>
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

const SpeciesPickerModal = memo(({ visible, onClose, fishSpecies, onSelect }) => {
  const [searchText, setSearchText] = useState('');
  
  const filteredSpecies = useMemo(() => {
    if (!searchText) return fishSpecies;
    return fishSpecies.filter(item => 
      item.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, fishSpecies]);

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
              placeholder="Balık türü ara..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filteredSpecies}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="always"
            style={{ flex: 1, backgroundColor: '#1c1c1e' }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                  setSearchText('');
                }}
                style={styles.modalListItem}
              >
                <Text style={styles.modalListItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
});

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
  const [dateTime, setDateTime] = useState(new Date());
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

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
    },
    {
      id: 'waterTemp',
      label: 'Su Sıcaklığı',
      min: 0,
      max: 40,
      step: 0.5,
      unit: '°C'
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

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    const requiredFields = [
      { field: 'Balık Türü', value: selectedSpecies },
      { field: 'Lokasyon', value: location },
      { field: 'Ağırlık', value: formData.weight },
      { field: 'Boy', value: formData.length }
    ];

    const missingFields = requiredFields.filter(item => !item.value);

    if (missingFields.length > 0) {
      Alert.alert(
        "Eksik Alanlar",
        missingFields.map(item => 
          `• ${item.field}`
        ).join('\n'),
        [{ text: "Tamam", style: "default" }],
        {
          cancelable: true,
          messageStyle: Platform.select({
            android: {
              textAlign: 'left',
              fontSize: 16,
            }
          }),
          containerStyle: Platform.select({
            ios: {
              backgroundColor: 'rgba(255, 140, 0, 0.1)',
              borderRadius: 10,
            }
          })
        }
      );
      return;
    }

    try {
      const fishData = {
        species: selectedSpecies,
        speciesLabel: selectedLabel,
        length: formData.length,
        weight: formData.weight,
        location,
        timestamp: Platform.OS === 'web' ? new Date(`${webDate}T${webTime}`) : dateTime
      };

      // Opsiyonel alanları sadece değer varsa ekle
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
      
      // Form alanlarını temizle
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Balık Türü</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModalVisible(true)}>
                <Text style={styles.selectBoxText}>{selectedLabel || 'Balık türü seçin...'}</Text>
              </TouchableOpacity>
            </View>

            <SpeciesPickerModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              fishSpecies={fishSpecies}
              onSelect={(value) => {
                setSelectedSpecies(value);
                setSelectedLabel(fishSpecies.find(item => item.value === value)?.label || '');
                setModalVisible(false);
              }}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lokasyon</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => navigation.navigate('MapPickerScreen', {
                onLocationSelected: (coords) => {
                  const formatted = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
                  setLocation(formatted);
                },
              })}>
                <Text style={styles.selectBoxText}>{location || 'Konum seçin...'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tarih & Saat</Text>
              <View style={styles.selectBoxSmallDate}>
                <DateTimePicker
                  value={dateTime}
                  onChange={(event, selectedDate) => setDateTime(selectedDate || dateTime)}
                  mode="datetime"
                  textColor="#fff"
                  themeVariant="dark"
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {FORM_FIELDS.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={formData[field.id]}
                onValueChange={(value) => handleFieldChange(field.id, value)}
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
              label: 'Ayın Durumu', value: moonPhase, setter: setMoonPhase, key: 'moonPhase'
            }, {
              label: 'Akıntı Durumu', value: currentStatus, setter: setCurrentStatus, key: 'currentStatus'
            }].map(({ label, value, setter, key }, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => fetchLookupData(key, setter)}>
                  <Text style={styles.selectBoxText}>{value || 'Seçiniz...'}</Text>
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
});
