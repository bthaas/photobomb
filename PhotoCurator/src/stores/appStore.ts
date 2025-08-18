import {create} from 'zustand';
import {Photo, PhotoCluster, CurationGoal} from '../types';

interface AppState {
  // Photo Library State
  photos: Photo[];
  clusters: PhotoCluster[];
  selectedPhotos: string[];

  // UI State
  isLoading: boolean;
  currentScreen: string;

  // Curation State
  curationGoal: CurationGoal;
  curatedPhotos: Photo[];

  // Actions
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  removePhoto: (photoId: string) => void;
  setClusters: (clusters: PhotoCluster[]) => void;
  setSelectedPhotos: (photoIds: string[]) => void;
  togglePhotoSelection: (photoId: string) => void;
  setLoading: (loading: boolean) => void;
  setCurrentScreen: (screen: string) => void;
  setCurationGoal: (goal: CurationGoal) => void;
  setCuratedPhotos: (photos: Photo[]) => void;
}

export const useAppStore = create<AppState>(set => ({
  // Initial State
  photos: [],
  clusters: [],
  selectedPhotos: [],
  isLoading: false,
  currentScreen: 'Home',
  curationGoal: CurationGoal.BALANCED,
  curatedPhotos: [],

  // Actions
  setPhotos: photos => set({photos}),

  addPhoto: photo =>
    set(state => ({
      photos: [...state.photos, photo],
    })),

  removePhoto: photoId =>
    set(state => ({
      photos: state.photos.filter(p => p.id !== photoId),
      selectedPhotos: state.selectedPhotos.filter(id => id !== photoId),
    })),

  setClusters: clusters => set({clusters}),

  setSelectedPhotos: photoIds => set({selectedPhotos: photoIds}),

  togglePhotoSelection: photoId =>
    set(state => {
      const isSelected = state.selectedPhotos.includes(photoId);
      return {
        selectedPhotos: isSelected
          ? state.selectedPhotos.filter(id => id !== photoId)
          : [...state.selectedPhotos, photoId],
      };
    }),

  setLoading: isLoading => set({isLoading}),

  setCurrentScreen: currentScreen => set({currentScreen}),

  setCurationGoal: curationGoal => set({curationGoal}),

  setCuratedPhotos: curatedPhotos => set({curatedPhotos}),
}));
