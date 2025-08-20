import axios from 'axios';
import { AnalysisResult, Photo } from '../types';

// Configure the base URL for your backend
// For development, this might be your local server or ngrok tunnel
const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI processing
});

export class PhotoAnalysisService {
  static async analyzePhotos(photos: Photo[]): Promise<AnalysisResult> {
    const formData = new FormData();
    
    // Convert photos to form data
    photos.forEach((photo, index) => {
      const photoFile = {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.fileName || `photo_${index}.jpg`,
      } as any;
      
      formData.append('photos', photoFile);
    });

    try {
      const response = await api.post('/photo/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || 
          error.message || 
          'Failed to analyze photos'
        );
      }
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await api.post('/photo/health');
      return response.data.success;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  static setBaseURL(url: string) {
    api.defaults.baseURL = url;
  }
}