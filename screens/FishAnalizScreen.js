import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Image, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModernButton from '../components/ModernButton';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function FishAnalizScreen() {
  const navigation = useNavigation();
  const [analizType, setAnalizType] = useState('tarih');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [fishData, setFishData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialMapRegion, setInitialMapRegion] = useState({
    latitude: 41.0,
    longitude: 29.0,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const mapRef = useRef(null);

  // Verileri tarih aralığına göre getir
  const fetchFishData = async () => {
    if (!startDate && !endDate) {
      alert('Lütfen en az bir tarih seçin');
      return;
    }

    setLoading(true);
    try {
      // Kullanıcı oturum durumunu kontrol et
      if (!auth.currentUser) {
        alert('Oturum açmanız gerekmektedir.');
        setLoading(false);
        return;
      }

      let q = collection(db, 'fish_entries');
      let constraints = [];
      
      // Tarih filtrelerini ayarla
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

      // Sorguyu oluştur ve tarihe göre sırala
      q = constraints.length > 0 
        ? query(q, ...constraints, orderBy('timestamp', 'desc'))
        : query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp ? new Date(doc.data().timestamp.seconds * 1000).toLocaleDateString() : 'Tarih yok'
      })).filter(record => record.locationLatitude && record.locationLongitude);

      console.log(`${records.length} kayıt bulundu.`);
      setFishData(records);

      // Haritayı gösterdikten sonra tüm noktaları kapsayacak şekilde ayarla
      if (records.length > 0) {
        setShowReport(true);
        
        // Haritayı gösterdikten sonra tüm noktaları kapsayacak şekilde ayarla
        setTimeout(() => {
          if (mapRef.current && records.length > 0) {
            const coordinates = records.map(record => ({
              latitude: record.locationLatitude,
              longitude: record.locationLongitude
            }));
            
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }
        }, 500);
      } else {
        setShowReport(true);
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleShowReport = () => {
    fetchFishData();
  };

  // Tarih formatı için yardımcı fonksiyon
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    if (typeof timestamp === 'object' && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  // Marker'a tıklama olayını yönetecek fonksiyon
  const handleMarkerPress = (coordinate) => {
    // Marker'a tıklandığında o noktaya yakınlaştır
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.02, // Yakın zoom seviyesi (küçük değer = daha yakın)
        longitudeDelta: 0.02,
      }, 500); // 500ms animasyon süresi
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Fish Analiz</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.section}>
          <Text style={styles.label}>Analiz Türü Seçin:</Text>
          <View style={styles.analizTypeRow}>
            <TouchableOpacity style={[styles.analizTypeButton, analizType === 'tarih' && styles.analizTypeButtonActive]} onPress={() => setAnalizType('tarih')}>
              <Text style={analizType === 'tarih' ? styles.analizTypeTextActive : styles.analizTypeText}>Tarihe Göre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.analizTypeButton, analizType === 'lokasyon' && styles.analizTypeButtonActive]} onPress={() => setAnalizType('lokasyon')}>
              <Text style={analizType === 'lokasyon' ? styles.analizTypeTextActive : styles.analizTypeText}>Lokasyona Göre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.analizTypeButton, analizType === 'tur' && styles.analizTypeButtonActive]} onPress={() => setAnalizType('tur')}>
              <Text style={analizType === 'tur' ? styles.analizTypeTextActive : styles.analizTypeText}>Balık Türüne Göre</Text>
            </TouchableOpacity>
          </View>
        </View>
        {analizType === 'tarih' && (
          <View style={styles.section}>
            <Text style={styles.label}>Tarih Aralığı:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateButtonText}>{startDate ? startDate.toLocaleDateString() : 'Başlangıç Tarihi'}</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 10 }}>-</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateButtonText}>{endDate ? endDate.toLocaleDateString() : 'Bitiş Tarihi'}</Text>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>
        )}
        <View style={styles.section}>
          <ModernButton 
            label={loading ? "Yükleniyor..." : "Raporu Göster"} 
            onPress={handleShowReport} 
            style={styles.customButton}
            disabled={loading} 
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
          </View>
        )}

        {showReport && !loading && analizType === 'tarih' && (
          <View style={{ flex: 1, width: '100%', marginTop: 10 }}>
            {fishData.length === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Seçilen tarih aralığında veri bulunamadı</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.resultHeader}>{fishData.length} adet balık kaydı bulundu</Text>
                <MapView
                  ref={mapRef}
                  style={{ flex: 1, minHeight: 300 }}
                  initialRegion={initialMapRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                  showsCompass={true}
                  zoomControlEnabled={true}
                >
                  {fishData.map(fish => (
                    <Marker 
                      key={fish.id} 
                      coordinate={{ 
                        latitude: fish.locationLatitude, 
                        longitude: fish.locationLongitude 
                      }}
                      title={fish.speciesLabel || "Balık"}
                      onPress={() => handleMarkerPress({
                        latitude: fish.locationLatitude,
                        longitude: fish.locationLongitude
                      })}
                    >
                      <Callout>
                        <View style={styles.calloutContainer}>
                          <Text style={styles.calloutTitle}>{fish.speciesLabel || "Bilinmeyen Tür"}</Text>
                          <Text>Tarih: {formatDateTime(fish.timestamp)}</Text>
                          {fish.length && <Text>Boy: {fish.length} cm</Text>}
                          {fish.weight && <Text>Ağırlık: {fish.weight} gr</Text>}
                          
                          {fish.photoURL ? (
                            <View style={styles.calloutImageContainer}>
                              <Image 
                                source={{ uri: fish.photoURL }} 
                                style={styles.calloutImage}
                                resizeMode="cover"
                              />
                            </View>
                          ) : (
                            <Text style={styles.noPhotoText}>Fotoğraf Yok</Text>
                          )}
                        </View>
                      </Callout>
                    </Marker>
                  ))}
                </MapView>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#0d47a1',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  analizTypeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  analizTypeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  analizTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  analizTypeText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  analizTypeTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  dateButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    minWidth: 120,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  customButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 0,
    width: 'auto',
    alignSelf: 'center',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 60,
    left: 20,
    zIndex: 999,
  },
  backText: {
    color: '#007AFF',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#007AFF',
    fontSize: 16,
  },
  calloutContainer: {
    width: 150,
    padding: 5,
    alignItems: 'center',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutImageContainer: {
    marginTop: 8,
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calloutImage: {
    width: '100%',
    height: '100%',
  },
  noPhotoText: {
    marginTop: 5,
    color: '#888',
    fontSize: 12,
  },
  resultHeader: {
    fontSize: 14,
    marginBottom: 8,
    color: '#0d47a1',
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
  },
}); 