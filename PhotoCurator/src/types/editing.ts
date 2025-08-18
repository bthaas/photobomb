/**
 * Photo editing and enhancement data models
 */

export interface CropSuggestion {
  id: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  aspectRatio: number;
  confidence: number;
  reasoning: string;
  compositionScore: number;
}

export interface Filter {
  id: string;
  name: string;
  type: 'color' | 'artistic' | 'vintage' | 'black_white' | 'enhancement';
  parameters: Record<string, number>;
  previewUrl?: string;
}

export interface EditedPhoto {
  id: string;
  originalPhotoId: string;
  uri: string;
  edits: PhotoEdit[];
  metadata: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
  };
  createdAt: Date;
}

export interface PhotoEdit {
  id: string;
  type: 'crop' | 'enhance' | 'background_removal' | 'filter' | 'adjustment';
  parameters: Record<string, any>;
  appliedAt: Date;
  isReversible: boolean;
}

export interface EnhancementSettings {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  saturation: number;
  sharpness: number;
  noise_reduction: number;
}

export interface BackgroundRemovalResult {
  subjectMask: string; // Base64 encoded mask
  backgroundMask: string; // Base64 encoded mask
  confidence: number;
  processingTime: number;
  suggestions: {
    blur_background: boolean;
    replace_background: boolean;
    extract_subject: boolean;
  };
}