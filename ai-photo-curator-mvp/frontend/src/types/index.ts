export interface Photo {
  uri: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
}

export interface AnalysisResult {
  success: boolean;
  bestPhotoIndex: number;
  reasoning: string;
  totalPhotos: number;
  selectedPhoto: {
    originalName: string;
    size: number;
    mimeType: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}