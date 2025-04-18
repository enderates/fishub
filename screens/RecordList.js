// screens/RecordList.js

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  ImageBackground,
  SafeAreaView,
  Pressable,
  Platform,
  TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

const TABLE_COLUMNS = [
  { key: 'delete', header: 'Sil', width: 80 },
  { key: 'edit', header: 'Düzenle', width: 80 },
  { key: 'speciesLabel', header: 'Tür', width: 150 },
  { key: 'location', header: 'Lokasyon', width: 200 },
  { key: 'dateTime', header: 'Tarih', width: 150 },
  { key: 'length', header: 'Boy', width: 80 },
  { key: 'weight', header: 'Ağırlık', width: 80 },
  { key: 'rodType', header: 'Kamış', width: 120 },
  { key: 'baitType', header: 'Yem Tipi', width: 120 },
  { key: 'baitColor', header: 'Yem Rengi', width: 120 },
  { key: 'baitWeight', header: 'Yem Ağırlığı', width: 100 },
  { key: 'reelType', header: 'Makine', width: 120 },
  { key: 'lineThickness', header: 'Misina', width: 100 },
  { key: 'seaColor', header: 'Deniz Rengi', width: 120 },
  { key: 'moonPhase', header: 'Ay Durumu', width: 120 },
  { key: 'waterTemp', header: 'Su Sıcaklığı', width: 100 },
  { key: 'currentStatus', header: 'Akıntı', width: 100 }
];

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

const DatePickerModal = memo(({ visible, onClose, onConfirm, type, initialDate }) => {
  // Geçici tarih state'i
  const [tempDate, setTempDate] = useState(initialDate || new Date());

  // Tarih değiştiğinde geçici state'i güncelle
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Tamam'a basıldığında seçilen tarihi gönder ve modalı kapat
  const handleConfirm = () => {
    onConfirm(tempDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalHeaderButton} 
              onPress={onClose}
            >
              <Text style={styles.modalHeaderButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
              {type === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}
            </Text>
            
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
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              textColor="#fff"
              themeVariant="dark"
              style={{ backgroundColor: 'transparent' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default function RecordList() {
  const navigation = useNavigation();
  const [fishRecords, setFishRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState({ show: false, type: null });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let q = collection(db, 'fish_entries');
      let constraints = [];

      // Balık türü filtresi
      if (selectedSpecies) {
        constraints.push(where('speciesLabel', '==', selectedSpecies));
      }

      // Tarih filtrelerini ayarlayalım
      if (startDate || endDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          constraints.push(where('timestamp', '>=', start));
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          constraints.push(where('timestamp', '<=', end));
        }
      }

      // Sorguyu oluştur ve tarihe göre sırala
      q = constraints.length > 0 
        ? query(q, ...constraints, orderBy('timestamp', 'desc'))
        : query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFishRecords(records);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      Alert.alert('Hata', 'Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [])
  );

  useEffect(() => {
    fetch('https://api.gbif.org/v1/species/search?taxon_key=204&limit=50')
      .then(response => response.json())
      .then(data => {
        const list = data.results.map(item => ({ 
          label: item.canonicalName, 
          value: item.canonicalName 
        }));
        setFishSpecies(list);
        setLoadingSpecies(false);
      })
      .catch(error => {
        console.error('Balık türleri alınamadı:', error);
        setLoadingSpecies(false);
      });
  }, []);

  const handleDelete = async (id) => {
    Alert.alert('Onay', 'Bu kayıt silinecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'fish_entries', id));
            Alert.alert('Başarılı', 'Veri silinmiştir');
            fetchRecords();
          } catch (error) {
            Alert.alert('Hata', 'Veri silinemedi');
            console.error('Silme hatası:', error);
          }
        }
      }
    ]);
  };

  const renderTableHeaders = () => (
    <View style={styles.headerRow}>
      {TABLE_COLUMNS.map((column, index) => (
        <View key={index} style={[styles.cell, { width: column.width }]}>
          <Text style={styles.headerText}>{column.header}</Text>
        </View>
      ))}
    </View>
  );

  const renderTableRow = (item, index) => (
    <View style={[styles.dataRow, index % 2 === 1 && styles.alternateRow]}>
      {TABLE_COLUMNS.map((column, colIndex) => (
        <View key={colIndex} style={[styles.cell, { width: column.width }]}>
          {column.key === 'delete' ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteText}>Sil</Text>
            </TouchableOpacity>
          ) : column.key === 'edit' ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('EditFish', { id: item.id })}
            >
              <Text style={styles.editText}>Düzenle</Text>
            </TouchableOpacity>
          ) : column.key === 'dateTime' ? (
            <Text style={styles.cellText}>
              {formatDateTime(item.timestamp)}
            </Text>
          ) : (
            <Text 
              style={styles.cellText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item[column.key]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const showPicker = (type) => {
    setDatePickerVisible({ show: true, type });
  };

  const handleDateConfirm = (selectedDate) => {
    const { type } = datePickerVisible;
    
    // Seçilen tarihi UTC'ye çevir ve saat bilgisini sıfırla
    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);

    if (type === 'start') {
      setStartDate(date);
    } else if (type === 'end') {
      setEndDate(date);
    }
    
    setDatePickerVisible({ show: false, type: null });
  };

  // Tarih formatı için yeni bir yardımcı fonksiyon ekleyelim
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} - ${hours}:${minutes}`;
  };

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Kayıt Raporlama</Text>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => setSpeciesModalVisible(true)}
          >
            <Text style={styles.selectBoxText}>
              {selectedSpecies || 'Tüm Balık Türleri'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => showPicker('start')}
          >
            <Text style={styles.selectBoxText}>
              {startDate ? formatDateTime(startDate) : 'Başlangıç Tarihi Seç'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => showPicker('end')}
          >
            <Text style={styles.selectBoxText}>
              {endDate ? formatDateTime(endDate) : 'Bitiş Tarihi Seç'}
            </Text>
          </TouchableOpacity>

          <View style={styles.reportButtonContainer}>
            <ModernButton 
              label="Raporla" 
              onPress={fetchRecords} 
              disabled={loading}
              style={styles.customReportButton}
            />
          </View>

          <View style={{ marginVertical: 15 }} />

          {loading ? (
            <ActivityIndicator size="large" color="#6200ee" />
          ) : (
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {renderTableHeaders()}
                  {fishRecords.map((item, index) => (
                    <View key={item.id}>
                      {renderTableRow(item, index)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <SpeciesPickerModal 
            visible={speciesModalVisible}
            onClose={() => setSpeciesModalVisible(false)}
            fishSpecies={[{ label: 'Tüm Balık Türleri', value: '' }, ...fishSpecies]}
            onSelect={(value) => {
              setSelectedSpecies(value);
              setSpeciesModalVisible(false);
            }}
          />

          <DatePickerModal
            visible={datePickerVisible.show}
            onClose={() => setDatePickerVisible({ show: false, type: null })}
            onConfirm={handleDateConfirm}
            type={datePickerVisible.type}
            initialDate={datePickerVisible.type === 'start' ? startDate : endDate}
          />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 999,
  },
  backText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  selectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectBoxText: {
    color: '#fff',
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    minHeight: 35,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  alternateRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cell: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  headerText: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexShrink: 1,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteText: {
    color: '#ff0000',
    fontWeight: '500',
  },
  editText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  tableContainer: {
    marginTop: 15,
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '80%',
    width: '100%',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderButton: {
    padding: 8,
  },
  modalHeaderButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalHeaderButtonTextConfirm: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
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
  pickerContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 235, 238, 0.7)',
  },
  editButton: {
    backgroundColor: 'rgba(232, 245, 233, 0.7)',
  },
  modalListItemHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalListItemTextHighlight: {
    fontWeight: '600',
    color: '#fff',
  },
  reportButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  customReportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 0,
    width: 'auto',
    minWidth: 0,
  },
});
