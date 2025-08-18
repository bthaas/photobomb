/**
 * Data validation functions for core models
 */

import {
  Photo,
  PhotoMetadata,
  ImageFeatures,
  QualityScore,
  CompositionScore,
  ContentScore,
  Face,
  GeoLocation,
  ExifData,
  Color,
  DetectedObject,
  DetectedScene,
  PhotoCluster,
  PersonCluster,
  EventCluster,
  SyncStatus,
  ClusterType,
} from '../types';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Helper function to create validation result
const createValidationResult = (isValid: boolean, errors: string[] = []): ValidationResult => ({
  isValid,
  errors,
});

// Basic type validators
export const isValidString = (value: any, fieldName: string, required = true): string[] => {
  const errors: string[] = [];
  if (required && (value === undefined || value === null)) {
    errors.push(`${fieldName} is required`);
  } else if (value !== undefined && value !== null && typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  } else if (value !== undefined && value !== null && value.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }
  return errors;
};

export const isValidNumber = (value: any, fieldName: string, required = true, min?: number, max?: number): string[] => {
  const errors: string[] = [];
  if (required && (value === undefined || value === null)) {
    errors.push(`${fieldName} is required`);
  } else if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
    } else {
      if (min !== undefined && value < min) {
        errors.push(`${fieldName} must be at least ${min}`);
      }
      if (max !== undefined && value > max) {
        errors.push(`${fieldName} must be at most ${max}`);
      }
    }
  }
  return errors;
};

export const isValidDate = (value: any, fieldName: string, required = true): string[] => {
  const errors: string[] = [];
  if (required && (value === undefined || value === null)) {
    errors.push(`${fieldName} is required`);
  } else if (value !== undefined && value !== null) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      errors.push(`${fieldName} must be a valid Date`);
    }
  }
  return errors;
};

export const isValidArray = (value: any, fieldName: string, required = true, minLength?: number): string[] => {
  const errors: string[] = [];
  if (required && (value === undefined || value === null)) {
    errors.push(`${fieldName} is required`);
  } else if (value !== undefined && value !== null) {
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
    } else if (minLength !== undefined && value.length < minLength) {
      errors.push(`${fieldName} must have at least ${minLength} items`);
    }
  }
  return errors;
};

// Core model validators
export const validateGeoLocation = (location: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!location || typeof location !== 'object') {
    return createValidationResult(false, ['GeoLocation must be an object']);
  }

  errors.push(...isValidNumber(location.latitude, 'latitude', true, -90, 90));
  errors.push(...isValidNumber(location.longitude, 'longitude', true, -180, 180));
  errors.push(...isValidNumber(location.altitude, 'altitude', false));
  errors.push(...isValidNumber(location.accuracy, 'accuracy', false, 0));

  return createValidationResult(errors.length === 0, errors);
};

export const validateExifData = (exif: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!exif || typeof exif !== 'object') {
    return createValidationResult(true); // EXIF is optional
  }

  errors.push(...isValidString(exif.make, 'make', false));
  errors.push(...isValidString(exif.model, 'model', false));
  errors.push(...isValidString(exif.dateTime, 'dateTime', false));
  errors.push(...isValidNumber(exif.orientation, 'orientation', false, 1, 8));
  errors.push(...isValidNumber(exif.exposureTime, 'exposureTime', false, 0));
  errors.push(...isValidNumber(exif.fNumber, 'fNumber', false, 0));
  errors.push(...isValidNumber(exif.iso, 'iso', false, 0));
  errors.push(...isValidNumber(exif.focalLength, 'focalLength', false, 0));

  return createValidationResult(errors.length === 0, errors);
};

export const validatePhotoMetadata = (metadata: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!metadata || typeof metadata !== 'object') {
    return createValidationResult(false, ['PhotoMetadata must be an object']);
  }

  errors.push(...isValidNumber(metadata.width, 'width', true, 1));
  errors.push(...isValidNumber(metadata.height, 'height', true, 1));
  errors.push(...isValidNumber(metadata.fileSize, 'fileSize', true, 0));
  errors.push(...isValidString(metadata.format, 'format', true));
  errors.push(...isValidDate(metadata.timestamp, 'timestamp', true));

  if (metadata.exif) {
    const exifValidation = validateExifData(metadata.exif);
    if (!exifValidation.isValid) {
      errors.push(...exifValidation.errors.map(err => `exif.${err}`));
    }
  }

  if (metadata.location) {
    const locationValidation = validateGeoLocation(metadata.location);
    if (!locationValidation.isValid) {
      errors.push(...locationValidation.errors.map(err => `location.${err}`));
    }
  }

  return createValidationResult(errors.length === 0, errors);
};

export const validateColor = (color: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!color || typeof color !== 'object') {
    return createValidationResult(false, ['Color must be an object']);
  }

  errors.push(...isValidNumber(color.r, 'r', true, 0, 255));
  errors.push(...isValidNumber(color.g, 'g', true, 0, 255));
  errors.push(...isValidNumber(color.b, 'b', true, 0, 255));
  errors.push(...isValidString(color.hex, 'hex', true));
  errors.push(...isValidNumber(color.percentage, 'percentage', true, 0, 100));

  // Validate hex format
  if (color.hex && !/^#[0-9A-Fa-f]{6}$/.test(color.hex)) {
    errors.push('hex must be a valid hex color code');
  }

  return createValidationResult(errors.length === 0, errors);
};

export const validateDetectedObject = (obj: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return createValidationResult(false, ['DetectedObject must be an object']);
  }

  errors.push(...isValidString(obj.label, 'label', true));
  errors.push(...isValidNumber(obj.confidence, 'confidence', true, 0, 1));

  if (!obj.boundingBox || typeof obj.boundingBox !== 'object') {
    errors.push('boundingBox is required and must be an object');
  } else {
    errors.push(...isValidNumber(obj.boundingBox.x, 'boundingBox.x', true, 0));
    errors.push(...isValidNumber(obj.boundingBox.y, 'boundingBox.y', true, 0));
    errors.push(...isValidNumber(obj.boundingBox.width, 'boundingBox.width', true, 0));
    errors.push(...isValidNumber(obj.boundingBox.height, 'boundingBox.height', true, 0));
  }

  return createValidationResult(errors.length === 0, errors);
};

export const validateImageFeatures = (features: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!features || typeof features !== 'object') {
    return createValidationResult(false, ['ImageFeatures must be an object']);
  }

  errors.push(...isValidArray(features.embedding, 'embedding', true, 1));
  errors.push(...isValidArray(features.dominantColors, 'dominantColors', true));
  errors.push(...isValidArray(features.objects, 'objects', true));
  errors.push(...isValidArray(features.scenes, 'scenes', true));

  // Validate embedding contains only numbers
  if (Array.isArray(features.embedding)) {
    features.embedding.forEach((val: any, index: number) => {
      if (typeof val !== 'number' || isNaN(val)) {
        errors.push(`embedding[${index}] must be a valid number`);
      }
    });
  }

  // Validate colors
  if (Array.isArray(features.dominantColors)) {
    features.dominantColors.forEach((color: any, index: number) => {
      const colorValidation = validateColor(color);
      if (!colorValidation.isValid) {
        errors.push(...colorValidation.errors.map(err => `dominantColors[${index}].${err}`));
      }
    });
  }

  // Validate objects
  if (Array.isArray(features.objects)) {
    features.objects.forEach((obj: any, index: number) => {
      const objValidation = validateDetectedObject(obj);
      if (!objValidation.isValid) {
        errors.push(...objValidation.errors.map(err => `objects[${index}].${err}`));
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
};

export const validateQualityScore = (score: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!score || typeof score !== 'object') {
    return createValidationResult(false, ['QualityScore must be an object']);
  }

  errors.push(...isValidNumber(score.overall, 'overall', true, 0, 1));
  errors.push(...isValidNumber(score.sharpness, 'sharpness', true, 0, 1));
  errors.push(...isValidNumber(score.exposure, 'exposure', true, 0, 1));
  errors.push(...isValidNumber(score.colorBalance, 'colorBalance', true, 0, 1));
  errors.push(...isValidNumber(score.noise, 'noise', true, 0, 1));

  return createValidationResult(errors.length === 0, errors);
};

export const validateCompositionScore = (score: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!score || typeof score !== 'object') {
    return createValidationResult(false, ['CompositionScore must be an object']);
  }

  errors.push(...isValidNumber(score.overall, 'overall', true, 0, 1));
  errors.push(...isValidNumber(score.ruleOfThirds, 'ruleOfThirds', true, 0, 1));
  errors.push(...isValidNumber(score.leadingLines, 'leadingLines', true, 0, 1));
  errors.push(...isValidNumber(score.symmetry, 'symmetry', true, 0, 1));
  errors.push(...isValidNumber(score.subjectPlacement, 'subjectPlacement', true, 0, 1));

  return createValidationResult(errors.length === 0, errors);
};

export const validateContentScore = (score: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!score || typeof score !== 'object') {
    return createValidationResult(false, ['ContentScore must be an object']);
  }

  errors.push(...isValidNumber(score.overall, 'overall', true, 0, 1));
  errors.push(...isValidNumber(score.faceQuality, 'faceQuality', true, 0, 1));
  errors.push(...isValidNumber(score.emotionalSentiment, 'emotionalSentiment', true, 0, 1));
  errors.push(...isValidNumber(score.interestingness, 'interestingness', true, 0, 1));

  return createValidationResult(errors.length === 0, errors);
};

export const validateFace = (face: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!face || typeof face !== 'object') {
    return createValidationResult(false, ['Face must be an object']);
  }

  errors.push(...isValidString(face.id, 'id', true));
  errors.push(...isValidArray(face.embedding, 'embedding', true, 1));
  errors.push(...isValidNumber(face.confidence, 'confidence', true, 0, 1));

  // Validate bounding box
  if (!face.boundingBox || typeof face.boundingBox !== 'object') {
    errors.push('boundingBox is required and must be an object');
  } else {
    errors.push(...isValidNumber(face.boundingBox.x, 'boundingBox.x', true, 0));
    errors.push(...isValidNumber(face.boundingBox.y, 'boundingBox.y', true, 0));
    errors.push(...isValidNumber(face.boundingBox.width, 'boundingBox.width', true, 0));
    errors.push(...isValidNumber(face.boundingBox.height, 'boundingBox.height', true, 0));
  }

  // Validate landmarks if present
  if (face.landmarks) {
    const landmarks = ['leftEye', 'rightEye', 'nose', 'leftMouth', 'rightMouth'];
    landmarks.forEach(landmark => {
      if (face.landmarks[landmark]) {
        errors.push(...isValidNumber(face.landmarks[landmark].x, `landmarks.${landmark}.x`, true));
        errors.push(...isValidNumber(face.landmarks[landmark].y, `landmarks.${landmark}.y`, true));
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
};

export const validatePhoto = (photo: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!photo || typeof photo !== 'object') {
    return createValidationResult(false, ['Photo must be an object']);
  }

  errors.push(...isValidString(photo.id, 'id', true));
  errors.push(...isValidString(photo.uri, 'uri', true));
  errors.push(...isValidDate(photo.createdAt, 'createdAt', true));
  errors.push(...isValidDate(photo.updatedAt, 'updatedAt', true));

  // Validate sync status
  if (!Object.values(SyncStatus).includes(photo.syncStatus)) {
    errors.push('syncStatus must be a valid SyncStatus value');
  }

  // Validate metadata
  const metadataValidation = validatePhotoMetadata(photo.metadata);
  if (!metadataValidation.isValid) {
    errors.push(...metadataValidation.errors.map(err => `metadata.${err}`));
  }

  // Validate optional fields
  if (photo.features) {
    const featuresValidation = validateImageFeatures(photo.features);
    if (!featuresValidation.isValid) {
      errors.push(...featuresValidation.errors.map(err => `features.${err}`));
    }
  }

  if (photo.qualityScore) {
    const qualityValidation = validateQualityScore(photo.qualityScore);
    if (!qualityValidation.isValid) {
      errors.push(...qualityValidation.errors.map(err => `qualityScore.${err}`));
    }
  }

  if (photo.compositionScore) {
    const compositionValidation = validateCompositionScore(photo.compositionScore);
    if (!compositionValidation.isValid) {
      errors.push(...compositionValidation.errors.map(err => `compositionScore.${err}`));
    }
  }

  if (photo.contentScore) {
    const contentValidation = validateContentScore(photo.contentScore);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors.map(err => `contentScore.${err}`));
    }
  }

  if (photo.faces && Array.isArray(photo.faces)) {
    photo.faces.forEach((face: any, index: number) => {
      const faceValidation = validateFace(face);
      if (!faceValidation.isValid) {
        errors.push(...faceValidation.errors.map(err => `faces[${index}].${err}`));
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
};