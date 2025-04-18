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
  TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

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
  const [dateTime, setDateTime] = useState(new Date());
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [lookupOptions, setLookupOptions] = useState([]);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const [lengthModalVisible, setLengthModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [waterTempModalVisible, setWaterTempModalVisible] = useState(false);

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
            setDateTime(data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date());
            setSelectedSpecies(data.species || '');
            setSelectedLabel(data.speciesLabel || '');
          }
        } catch (error) {
          console.error('Kayıt getirilemedi:', error);
          Alert.alert('Hata', 'Kayıt getirilemedi.');
        }
      };
      fetchData();
    }

    // Balık türlerini yükle
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
  }, [recordId]);

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

  // Güncelleme işlemi
  const handleUpdate = async () => {
    if (!selectedSpecies || !weight || !selectedLabel || !location) {
      Alert.alert("Eksik Bilgi", "Zorunlu alanları doldurunuz.");
      return;
    }

        try {
          const docRef = doc(db, 'fish_entries', recordId);
      await updateDoc(docRef, {
        species: selectedSpecies,
        speciesLabel: selectedLabel,
        baitType,
        baitColor,
        baitWeight,
        length,
        weight,
        rodType,
        reelType,
        lineThickness,
        seaColor,
        moonPhase,
        waterTemp,
        currentStatus,
        location,
        timestamp: dateTime
      });

      Alert.alert("Başarılı", "Kayıt başarıyla güncellendi.");
      navigation.goBack();
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      Alert.alert("Hata", "Güncelleme sırasında bir hata oluştu.");
    }
  };

  // SpeciesPickerModal bileşenini güncelle
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
                    onSelect(item.value, item.label);
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
          style={styles.selectBox}
          onPress={onPress}
        >
          <Text style={styles.selectBoxText}>
            {value ? `${value} ${field.unit}` : `${field.label} seçin...`}
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Balık Türü</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModalVisible(true)}>
                <Text style={styles.selectBoxText}>{selectedLabel || 'Balık türü seçin...'}</Text>
              </TouchableOpacity>
            </View>

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
                label="Güncelle" 
                onPress={handleUpdate}
                style={styles.customButton}
              />
            </View>

            <SpeciesPickerModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              fishSpecies={fishSpecies}
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
});
