/**
 * Utility functions for photo metadata extraction and manipulation
 */

import { PhotoMetadata, ExifData, GeoLocation } from '../types';

// Mock EXIF library interface (in real implementation, would use react-native-exif or similar)
interface ExifLibrary {
  getExif(uri: string): Promise<any>;
}

// Mock image info library interface (in real implementation, would use react-native-image-size or similar)
interface ImageInfo {
  width: number;
  height: number;
  size: number;
  type: string;
}

/**
 * Extract basic image information from URI
 */
export const getImageInfo = async (uri: string): Promise<Partial<ImageInfo>> => {
  // In real implementation, this would use a native library
  // For now, return mock data based on URI
  try {
    // Mock implementation - in real app would use react-native-image-size
    return {
      width: 1920,
      height: 1080,
      size: 2048000, // 2MB
      type: 'jpeg'
    };
  } catch (error) {
    console.error('Failed to get image info:', error);
    return {};
  }
};

/**
 * Extract EXIF data from image
 */
export const extractExifData = async (uri: string): Promise<ExifData | undefined> => {
  try {
    // Mock implementation - in real app would use react-native-exif
    const mockExif = {
      make: 'Apple',
      model: 'iPhone 14 Pro',
      dateTime: '2024:01:15 14:30:25',
      orientation: 1,
      exposureTime: 0.008333333333333333, // 1/120
      fNumber: 1.78,
      iso: 100,
      focalLength: 6.86,
      flash: false,
      whiteBalance: 'Auto'
    };

    return mockExif;
  } catch (error) {
    console.error('Failed to extract EXIF data:', error);
    return undefined;
  }
};

/**
 * Extract GPS coordinates from EXIF data
 */
export const extractGeoLocation = (exifData: any): GeoLocation | undefined => {
  try {
    if (!exifData || !exifData.GPS) {
      return undefined;
    }

    const { GPS } = exifData;
    
    // Convert GPS coordinates from EXIF format to decimal degrees
    const latitude = convertDMSToDD(
      GPS.GPSLatitude,
      GPS.GPSLatitudeRef
    );
    
    const longitude = convertDMSToDD(
      GPS.GPSLongitude,
      GPS.GPSLongitudeRef
    );

    if (latitude === null || longitude === null) {
      return undefined;
    }

    return {
      latitude,
      longitude,
      altitude: GPS.GPSAltitude || undefined,
      accuracy: GPS.GPSHPositioningError || undefined
    };
  } catch (error) {
    console.error('Failed to extract GPS location:', error);
    return undefined;
  }
};

/**
 * Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to DD (Decimal Degrees)
 */
const convertDMSToDD = (dms: number[], ref: string): number | null => {
  if (!dms || dms.length !== 3) {
    return null;
  }

  const [degrees, minutes, seconds] = dms;
  let dd = degrees + minutes / 60 + seconds / 3600;

  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }

  return dd;
};

/**
 * Get file size from URI
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    // Mock implementation - in real app would use react-native-fs
    return 2048000; // 2MB
  } catch (error) {
    console.error('Failed to get file size:', error);
    return 0;
  }
};

/**
 * Determine image format from URI or MIME type
 */
export const getImageFormat = (uri: string, mimeType?: string): string => {
  if (mimeType) {
    return mimeType.split('/')[1] || 'unknown';
  }

  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    case 'webp':
      return 'webp';
    case 'heic':
      return 'heic';
    case 'heif':
      return 'heif';
    default:
      return 'unknown';
  }
};

/**
 * Extract complete photo metadata from image URI
 */
export const extractPhotoMetadata = async (uri: string): Promise<PhotoMetadata> => {
  try {
    const [imageInfo, exifData] = await Promise.all([
      getImageInfo(uri),
      extractExifData(uri)
    ]);

    const fileSize = await getFileSize(uri);
    const format = getImageFormat(uri);
    
    // Extract location from EXIF if available
    const location = exifData ? extractGeoLocation({ GPS: exifData }) : undefined;

    // Parse timestamp from EXIF or use current time
    let timestamp = new Date();
    if (exifData?.dateTime) {
      const exifDate = parseExifDateTime(exifData.dateTime);
      if (exifDate) {
        timestamp = exifDate;
      }
    }

    return {
      width: imageInfo.width || 0,
      height: imageInfo.height || 0,
      fileSize,
      format,
      exif: exifData,
      location,
      timestamp
    };
  } catch (error) {
    console.error('Failed to extract photo metadata:', error);
    
    // Return minimal metadata on error
    return {
      width: 0,
      height: 0,
      fileSize: 0,
      format: 'unknown',
      timestamp: new Date()
    };
  }
};

/**
 * Parse EXIF date/time string to Date object
 */
export const parseExifDateTime = (dateTimeString: string): Date | null => {
  try {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
      return null;
    }

    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const [datePart, timePart] = dateTimeString.split(' ');
    
    if (!datePart || !timePart) {
      return null;
    }

    const [year, month, day] = datePart.split(':').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    // Validate the parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
      return null;
    }

    // Check for valid ranges
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, second);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('Failed to parse EXIF date/time:', error);
    return null;
  }
};

/**
 * Format EXIF date/time for display
 */
export const formatExifDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
};

/**
 * Calculate image aspect ratio
 */
export const calculateAspectRatio = (metadata: PhotoMetadata): number => {
  if (metadata.height === 0) return 1;
  return metadata.width / metadata.height;
};

/**
 * Check if image is in portrait orientation
 */
export const isPortrait = (metadata: PhotoMetadata): boolean => {
  return metadata.height > metadata.width;
};

/**
 * Check if image is in landscape orientation
 */
export const isLandscape = (metadata: PhotoMetadata): boolean => {
  return metadata.width > metadata.height;
};

/**
 * Check if image is square
 */
export const isSquare = (metadata: PhotoMetadata): boolean => {
  return metadata.width === metadata.height;
};

/**
 * Get image orientation string
 */
export const getOrientation = (metadata: PhotoMetadata): 'portrait' | 'landscape' | 'square' => {
  if (isSquare(metadata)) return 'square';
  if (isPortrait(metadata)) return 'portrait';
  return 'landscape';
};

/**
 * Calculate image resolution in megapixels
 */
export const calculateMegapixels = (metadata: PhotoMetadata): number => {
  return (metadata.width * metadata.height) / 1000000;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get camera settings summary from EXIF
 */
export const getCameraSettings = (exif: ExifData): string => {
  const parts: string[] = [];
  
  if (exif.fNumber) {
    parts.push(`f/${exif.fNumber}`);
  }
  
  if (exif.exposureTime) {
    const shutter = exif.exposureTime < 1 
      ? `1/${Math.round(1 / exif.exposureTime)}`
      : `${exif.exposureTime}`;
    parts.push(`${shutter}s`);
  }
  
  if (exif.iso) {
    parts.push(`ISO ${exif.iso}`);
  }
  
  if (exif.focalLength) {
    parts.push(`${exif.focalLength}mm`);
  }
  
  return parts.join(' • ');
};

/**
 * Update photo metadata with new values
 */
export const updatePhotoMetadata = (
  currentMetadata: PhotoMetadata,
  updates: Partial<PhotoMetadata>
): PhotoMetadata => {
  return {
    ...currentMetadata,
    ...updates,
    exif: updates.exif ? { ...currentMetadata.exif, ...updates.exif } : currentMetadata.exif,
    location: updates.location ? { ...currentMetadata.location, ...updates.location } : currentMetadata.location
  };
};