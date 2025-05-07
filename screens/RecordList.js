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
  TextInput,
  Image,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';
import { getWeatherData } from '../services/weatherService';
import axios from 'axios';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '@env';
import { deleteImageFromCloudinary } from '../services/cloudinaryService';
import CustomCheckbox from '../components/CustomCheckbox';
import { Ionicons } from '@expo/vector-icons';
import { getLocationInfo } from '../services/geocodingService';

const TABLE_COLUMNS = [
  {
    title: 'Seç',
    dataIndex: 'select',
    key: 'select',
    width: 60,
  },
  {
    title: 'Sil',
    dataIndex: 'delete',
    key: 'delete',
    width: 80,
  },
  {
    title: 'Düzenle',
    dataIndex: 'edit',
    key: 'edit',
    width: 80,
  },
  {
    title: 'Fotoğraf',
    dataIndex: 'photoURL',
    key: 'photo',
    width: 100,
  },
  {
    title: 'Tür',
    dataIndex: 'speciesLabel',
    key: 'species',
    width: 120,
  },
  {
    title: 'Boy (cm)',
    dataIndex: 'length',
    key: 'length',
    width: 80,
  },
  {
    title: 'Ağırlık (gr)',
    dataIndex: 'weight',
    key: 'weight',
    width: 100,
  },
  {
    title: 'Konum',
    dataIndex: 'location',
    key: 'location',
    width: 200,
    render: (location, record) => {
      if (!location) return '---';
      const [latitude, longitude] = location.split(',');
      return (
        <View>
          <Text style={styles.cellText}>
            {`${latitude}, ${longitude}`}
          </Text>
          {record.addressInfo && (
            <Text style={styles.cellText}>
              {record.addressInfo}
            </Text>
          )}
        </View>
      );
    },
  },
  {
    title: 'Tarih',
    dataIndex: 'timestamp',
    key: 'date',
    width: 120,
    render: (timestamp) => {
      const date = timestamp.toDate();
      return (
        <Text style={styles.dateText}>
          {date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </Text>
      );
    },
  },
  {
    title: 'Saat',
    dataIndex: 'timestamp',
    key: 'time',
    width: 80,
    render: (timestamp) => {
      const date = timestamp.toDate();
      return (
        <Text style={styles.timeText}>
          {date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      );
    },
  },
  {
    title: 'Hava Durumu',
    dataIndex: 'weather',
    key: 'weather',
    width: 100,
  },
  {
    title: 'Sıcaklık',
    dataIndex: 'temperature',
    key: 'temperature',
    width: 80,
  },
  {
    title: 'Rüzgar',
    dataIndex: 'windSpeed',
    key: 'wind',
    width: 80,
    render: (windSpeed) => (
      <Text style={styles.cellText}>
        {windSpeed || '---'}
      </Text>
    ),
  },
  {
    title: 'Basınç',
    dataIndex: 'pressure',
    key: 'pressure',
    width: 80,
  },
  {
    title: 'Dalga',
    dataIndex: 'wave',
    key: 'wave',
    width: 80,
  },
  {
    title: 'Yem Tipi',
    dataIndex: 'baitType',
    key: 'baitType',
    width: 100,
  },
  {
    title: 'Yem Rengi',
    dataIndex: 'baitColor',
    key: 'baitColor',
    width: 100,
  },
  {
    title: 'Yem Ağırlığı',
    dataIndex: 'baitWeight',
    key: 'baitWeight',
    width: 100,
  },
  {
    title: 'Kamış Tipi',
    dataIndex: 'rodType',
    key: 'rodType',
    width: 100,
  },
  {
    title: 'Makine Tipi',
    dataIndex: 'reelType',
    key: 'reelType',
    width: 100,
  },
  {
    title: 'Misina Kalınlığı',
    dataIndex: 'lineThickness',
    key: 'lineThickness',
    width: 120,
  },
  {
    title: 'Denizin Rengi',
    dataIndex: 'seaColor',
    key: 'seaColor',
    width: 100,
  },
  {
    title: 'Ayın Durumu',
    dataIndex: 'moonPhase',
    key: 'moonPhase',
    width: 100,
  },
  {
    title: 'Su Sıcaklığı',
    dataIndex: 'waterTemp',
    key: 'waterTemp',
    width: 100,
  },
  {
    title: 'Akıntı Durumu',
    dataIndex: 'currentStatus',
    key: 'currentStatus',
    width: 100,
  },
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
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [weatherData, setWeatherData] = useState({});
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Kullanıcı oturum durumunu kontrol et
      if (!auth.currentUser) {
        Alert.alert('Hata', 'Oturum açmanız gerekmektedir.');
        setLoading(false);
        return;
      }

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

      // Her kayıt için hava durumu ve adres verilerini al
      const recordsWithWeatherAndAddress = await Promise.all(records.map(async (record) => {
        let weather = {};
        let addressInfo = '';
        if (record.location) {
          try {
            const locationParts = record.location.split(',');
            if (locationParts.length === 2) {
              const [latitude, longitude] = locationParts.map(coord => parseFloat(coord.trim()));
              weather = await getWeatherData(latitude, longitude, record.timestamp.toDate());
              // Adres bilgisini çek
              const address = await getLocationInfo(latitude, longitude);
              if (address) {
                addressInfo = [
                  address.village || address.hamlet || address.suburb || address.neighbourhood || address.town || address.city_district || address.city || address.county || '',
                  address.state || '',
                  address.country || ''
                ].filter(Boolean).join(', ');
              }
            }
          } catch (error) {
            console.error('Hava durumu veya adres verisi alınamadı:', error);
          }
        }
        return { ...record, ...weather, addressInfo };
      }));

      setFishRecords(recordsWithWeatherAndAddress);
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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setFishRecords([]);
      }
    });

    return () => unsubscribe();
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

  const handleSelectRecord = (recordId) => {
    setSelectedRecords(prev => {
      if (prev.includes(recordId)) {
        return prev.filter(id => id !== recordId);
      } else {
        return [...prev, recordId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      Alert.alert('Uyarı', 'Lütfen silmek istediğiniz kayıtları seçin.');
      return;
    }

    Alert.alert(
      'Onay',
      `Seçili ${selectedRecords.length} kayıt silinecek. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Firestore'dan kayıtları sil
              const deletePromises = selectedRecords.map(id => 
                deleteDoc(doc(db, 'fish_entries', id))
              );
              await Promise.all(deletePromises);

              Alert.alert('Başarılı', 'Seçili kayıtlar başarıyla silindi.');
              setSelectedRecords([]);
              fetchRecords();
            } catch (error) {
              console.error('Toplu silme hatası:', error);
              Alert.alert('Hata', 'Kayıtlar silinirken bir hata oluştu.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderTableHeaders = () => (
    <View style={styles.headerRow}>
      {TABLE_COLUMNS.map((column, index) => (
        <View key={index} style={[styles.cell, { width: column.width }]}>
          <Text style={styles.headerText}>{column.title}</Text>
        </View>
      ))}
    </View>
  );

  const renderTableRow = (item, index) => (
    <View key={index} style={styles.tableRow}>
      {TABLE_COLUMNS.map((column, colIndex) => {
        if (column.key === 'select') {
          return (
            <View key={colIndex} style={[styles.cell, { width: column.width }]}> 
              <CustomCheckbox
                value={selectedRecords.includes(item.id)}
                onValueChange={() => handleSelectRecord(item.id)}
                style={styles.checkbox}
              />
            </View>
          );
        }
        if (column.key === 'delete') {
          return (
            <TouchableOpacity 
              key={colIndex}
              style={[styles.tableCell, { width: column.width }]} 
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteText}>Sil</Text>
            </TouchableOpacity>
          );
        }
        if (column.key === 'edit') {
          return (
            <TouchableOpacity 
              key={colIndex}
              style={[styles.tableCell, { width: column.width }]} 
              onPress={() => navigation.navigate('EditFish', { id: item.id })}
            >
              <Text style={styles.editText}>Düzenle</Text>
            </TouchableOpacity>
          );
        }
        if (column.key === 'photo') {
          return (
            <View key={colIndex} style={[styles.cell, { width: column.width }]}> 
              {item.photoURL ? (
                <TouchableOpacity onPress={() => {
                  setSelectedPhoto(item.photoURL);
                  setPhotoModalVisible(true);
                }}>
                  <Image
                    source={{ uri: item.photoURL }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.noPhoto}>
                  <Text style={styles.noPhotoText}>Fotoğraf Yok</Text>
                </View>
              )}
            </View>
          );
        }
        return (
          <View key={colIndex} style={[styles.cell, { width: column.width }]}> 
            {column.render ? column.render(item[column.dataIndex], item) : (
              <Text style={styles.cellText}>
                {item[column.dataIndex]}
              </Text>
            )}
          </View>
        );
      })}
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

  const renderPhotoModal = () => {
    return (
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setPhotoModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <TouchableOpacity 
              style={styles.fullScreenImageContainer}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.container}>
          <View style={styles.filterSection}>
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
          </View>

          <View style={styles.tableSection}>
            <TouchableOpacity 
              onPress={handleBulkDelete}
              disabled={selectedRecords.length === 0}
              style={[
                styles.bulkDeleteButton,
                selectedRecords.length === 0 && styles.bulkDeleteButtonDisabled
              ]}
            >
              <Ionicons 
                name="trash-outline" 
                size={24} 
                color={selectedRecords.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} 
              />
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
            ) : (
              <ScrollView 
                style={styles.tableScrollView}
                contentContainerStyle={styles.tableContentContainer}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {renderTableHeaders()}
                    {fishRecords.map((item, index) => renderTableRow(item, index))}
                  </View>
                </ScrollView>
              </ScrollView>
            )}
          </View>
        </View>

        <SpeciesPickerModal 
          visible={speciesModalVisible}
          onClose={() => setSpeciesModalVisible(false)}
          fishSpecies={fishSpecies}
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

        {renderPhotoModal()}
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
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 60,
  },
  filterSection: {
    marginBottom: 20,
  },
  tableSection: {
    flex: 1,
  },
  tableScrollView: {
    flex: 1,
  },
  tableContentContainer: {
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff'
  },
  selectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectBoxText: {
    color: '#fff',
    fontSize: 16,
  },
  tableContainer: {
    flex: 1,
    marginTop: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  deleteText: {
    color: '#ff4444',
    fontWeight: '500',
  },
  editText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 60,
    left: 20,
    zIndex: 999,
  },
  backText: {
    color: '#fff',
    fontSize: 18,
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
  tableCell: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  photoIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 10,
    padding: 2,
  },
  photoIndicatorText: {
    fontSize: 12,
    color: '#fff',
  },
  fullScreenModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
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
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  noPhotoText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  checkbox: {
    alignSelf: 'center',
  },
  bulkDeleteButton: {
    position: 'absolute',
    top: -40,
    left: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
  },
  bulkDeleteButtonDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  noPhoto: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
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
  photo: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textAlign: 'center',
  }
});
