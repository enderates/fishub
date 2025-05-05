import axios from 'axios';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '@env';

export const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // URL'den public_id'yi çıkar
    const publicId = imageUrl.split('/').pop().split('.')[0];
    
    // Timestamp oluştur
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Cloudinary API'sine silme isteği gönder
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        public_id: publicId,
        api_key: CLOUDINARY_API_KEY,
        timestamp: timestamp,
        signature: CLOUDINARY_API_SECRET // Basit bir yaklaşım
      }
    );

    return response.data;
  } catch (error) {
    console.error('Cloudinary silme hatası:', error);
    throw error;
  }
}; 