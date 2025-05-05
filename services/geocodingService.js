export async function getLocationInfo(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error('Ters geocoding hatası:', error);
    return null;
  }
} 