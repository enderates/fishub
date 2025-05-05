// services/weatherService.js

import axios from 'axios';
import { WEATHER_API_KEY } from '@env';

export async function getWeatherData(latitude, longitude, date) {
  try {
    // Open-Meteo'dan hava durumu bilgilerini al
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,pressure_msl&timezone=auto`
    );

    // Marine API'den dalga bilgilerini al
    const marineResponse = await axios.get(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height&timezone=auto`
    );

    console.log('Weather API Response:', weatherResponse.data);
    console.log('Marine API Response:', marineResponse.data);

    const weatherData = weatherResponse.data;
    const marineData = marineResponse.data;

    // Dalga yüksekliği hesaplama
    let waveHeight = 'Yok';
    if (marineData.hourly?.wave_height) {
      const currentHour = new Date().getHours();
      const currentWaveHeight = marineData.hourly.wave_height[currentHour];
      if (currentWaveHeight !== undefined && currentWaveHeight !== null) {
        waveHeight = `${currentWaveHeight.toFixed(1)} m`;
      }
    }

    // Rüzgar hızı hesaplama (m/s'den km/s'ye çevirme)
    let windSpeed = '---';
    const currentWindSpeed = weatherData.current?.wind_speed_10m;
    if (currentWindSpeed !== undefined && currentWindSpeed !== null) {
      const windSpeedKmh = currentWindSpeed * 3.6;
      windSpeed = `${Math.round(windSpeedKmh)} km/s`;
    }

    // Hava durumu kodu ve açıklaması
    const weatherCode = weatherData.current?.weather_code;
    const weatherDescription = getWeatherDescription(weatherCode);

    // Su sıcaklığı (yaklaşık olarak hava sıcaklığından hesaplanıyor)
    const currentTemp = weatherData.current?.temperature_2m;
    const waterTemp = currentTemp ? `${(currentTemp - 2).toFixed(1)}°C` : 'Yok';

    // Ay evresi hesaplama
    const moonPhase = calculateMoonPhase(date);

    const result = {
      weather: weatherDescription,
      temperature: currentTemp ? `${Math.round(currentTemp)}°C` : '---',
      windSpeed: windSpeed,
      pressure: weatherData.current?.pressure_msl ? `${Math.round(weatherData.current.pressure_msl)} hPa` : '---',
      wave: waveHeight,
      waterTemp: waterTemp,
      moonPhase: moonPhase
    };

    console.log('Processed Weather Data:', result);
    return result;

  } catch (error) {
    console.error('Hava durumu verisi alınamadı:', error);
    return {
      weather: 'Veri alınamadı',
      temperature: '---',
      windSpeed: '---',
      pressure: '---',
      wave: 'Yok',
      waterTemp: 'Yok',
      moonPhase: '---'
    };
  }
}

function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Açık',
    1: 'Çoğunlukla Açık',
    2: 'Parçalı Bulutlu',
    3: 'Bulutlu',
    45: 'Sisli',
    48: 'Kırağılı Sis',
    51: 'Hafif Çisenti',
    53: 'Orta Çisenti',
    55: 'Yoğun Çisenti',
    61: 'Hafif Yağmur',
    63: 'Orta Yağmur',
    65: 'Yoğun Yağmur',
    71: 'Hafif Kar',
    73: 'Orta Kar',
    75: 'Yoğun Kar',
    77: 'Kar Tanesi',
    80: 'Hafif Sağanak',
    81: 'Orta Sağanak',
    82: 'Yoğun Sağanak',
    85: 'Hafif Kar Sağanağı',
    86: 'Yoğun Kar Sağanağı',
    95: 'Gök Gürültülü Fırtına',
    96: 'Hafif Dolu ile Gök Gürültülü Fırtına',
    99: 'Yoğun Dolu ile Gök Gürültülü Fırtına'
  };
  return weatherCodes[code] || 'Bilinmiyor';
}

function calculateMoonPhase(date) {
  let year = date.getFullYear();
  let month = date.getMonth();
  let day = date.getDate();
  
  let c, e, jd, b;

  if (month < 3) {
    year--;
    month += 12;
  }

  month++;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd);
  jd -= b;
  b = Math.round(jd * 8);

  if (b >= 8) b = 0;

  const phases = [
    'Yeni Ay',
    'İlk Hilal',
    'İlk Dördün',
    'Şişkin Ay',
    'Dolunay',
    'Son Dördün',
    'Son Hilal',
    'Balsız Ay'
  ];

  return phases[b];
} 