// screens/MapPickerScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';

const GOOGLE_API_KEY = 'AIzaSyB3g-VKzYtLglviF-VYFOsc63RPyzy_VFA';

export default function MapPickerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const onLocationSelected = route.params?.onLocationSelected;

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum erişimi verilmedi.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const regionData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setInitialRegion(regionData);
      setCurrentLocation(regionData);
    })();
  }, []);

  const handleSelectLocation = (event) => {
    const coords = event.nativeEvent.coordinate;
    setSelectedLocation(coords);
    setInitialRegion({
      ...coords,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleSearch = async (text) => {
    setAddress(text);
    if (text.length < 3) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}&input=${text}&language=tr&components=country:tr`
      );
      const data = await res.json();
      if (data.status === 'OK') {
        setSuggestions(data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    }
  };

  const handleSuggestionPress = async (placeId) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_API_KEY}&place_id=${placeId}`
      );
      const data = await res.json();
      const { lat, lng } = data.result.geometry.location;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setInitialRegion(newRegion);
      setSelectedLocation({ latitude: lat, longitude: lng });
      setSuggestions([]);
      setAddress(data.result.formatted_address);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
      navigation.goBack();
    } else {
      Platform.OS === 'web'
        ? window.alert('Lütfen bir konum seçin.')
        : Alert.alert('Uyarı', 'Lütfen bir konum seçin.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Adres girin..."
        value={address}
        onChangeText={handleSearch}
      />
      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestionList}
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(item.place_id)}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {initialRegion && (
        <MapView
          style={styles.map}
          onPress={handleSelectLocation}
          initialRegion={initialRegion}
        >
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Bulunduğun Konum"
              description="Bu senin bulunduğun yer."
              pinColor="blue"
            />
          )}
          {selectedLocation && <Marker coordinate={selectedLocation} />}
        </MapView>
      )}
      <View style={styles.buttonContainer}>
        <Button title="Konumu Onayla" onPress={handleConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    zIndex: 999,
    elevation: 3,
  },
  suggestionList: {
    maxHeight: 200,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    zIndex: 999,
    elevation: 3,
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: '#fafafa',
  },
  map: { flex: 1 },
  buttonContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
});