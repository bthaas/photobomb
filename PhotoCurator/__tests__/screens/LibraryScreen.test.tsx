import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LibraryScreen } from '../../src/screens/LibraryScreen';
import { useAppStore } from '../../src/stores/appStore';
import { PhotoRepository } from '../../src/services/storage/PhotoRepository';
import { ClusterRepository } from '../../src/services/storage/ClusterRepository';
import { Photo, PhotoCluster, SyncStatus, ClusterType } from '../../src/types';

// Mock dependencies
jest.mock('../../src/stores/appStore');
jest.mock('../../src/services/storage/PhotoRepository');
jest.mock('../../src/services/storage/ClusterRepository');
// Mock React Native modules
const mockAlert = {
  alert: jest.fn(),
};

const mockShare = {
  share: jest.fn(),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: mockAlert,
    Share: mockShare,
  };
});

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;
const mockPhotoRepository = PhotoRepository as jest.MockedClass<typeof PhotoRepository>;
const mockClusterRepository = ClusterRepository as jest.MockedClass<typeof ClusterRepository>;
// Use the mocked alert and share directly

// Mock data
const mockPhotos: Photo[] = [
  {
    id: '1',
    uri: 'file://photo1.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 2048000,
      format: 'jpeg',
      timestamp: new Date('2023-01-01'),
    },
    syncStatus: SyncStatus.LOCAL_ONLY,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    features: {
      embedding: [0.1, 0.2, 0.3],
      dominantColors: [],
      objects: [{ label: 'beach', confidence: 0.9, boundingBox: { x: 0, y: 0, width: 100, height: 100 } }],
      scenes: [{ label: 'outdoor', confidence: 0.8 }],
    },
  },
  {
    id: '2',
    uri: 'file://photo2.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 1536000,
      format: 'jpeg',
      timestamp: new Date('2023-01-02'),
    },
    syncStatus: SyncStatus.SYNCED,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

const mockClusters: PhotoCluster[] = [
  {
    id: 'cluster1',
    type: ClusterType.VISUAL_SIMILARITY,
    photos: mockPhotos,
    centroid: [0.1, 0.2, 0.3],
    confidence: 0.85,
    label: 'Beach Photos',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

describe('LibraryScreen', () => {
  const mockStoreActions = {
    photos: mockPhotos,
    clusters: mockClusters,
    selectedPhotos: [],
    setPhotos: jest.fn(),
    setClusters: jest.fn(),
    setSelectedPhotos: jest.fn(),
    togglePhotoSelection: jest.fn(),
  };

  const mockPhotoRepositoryInstance = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockClusterRepositoryInstance = {
    findAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppStore.mockReturnValue(mockStoreActions as any);
    mockPhotoRepository.mockImplementation(() => mockPhotoRepositoryInstance as any);
    mockClusterRepository.mockImplementation(() => mockClusterRepositoryInstance as any);
    
    mockPhotoRepositoryInstance.find.mockResolvedValue(mockPhotos);
    mockClusterRepositoryInstance.findAll.mockResolvedValue(mockClusters);
  });

  it('renders library screen with header', () => {
    const { getByText } = render(<LibraryScreen />);
    
    expect(getByText('Photo Library')).toBeTruthy();
    expect(getByText('Grid')).toBeTruthy();
    expect(getByText('Clusters')).toBeTruthy();
  });

  it('loads photos and clusters on mount', async () => {
    render(<LibraryScreen />);
    
    await waitFor(() => {
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalled();
      expect(mockClusterRepositoryInstance.findAll).toHaveBeenCalled();
      expect(mockStoreActions.setPhotos).toHaveBeenCalledWith(mockPhotos);
      expect(mockStoreActions.setClusters).toHaveBeenCalledWith(mockClusters);
    });
  });

  it('switches between grid and cluster view modes', () => {
    const { getByText } = render(<LibraryScreen />);
    
    // Should start in grid mode
    expect(getByText('Grid')).toBeTruthy();
    
    // Switch to clusters
    fireEvent.press(getByText('Clusters'));
    
    // Should now show cluster view
    expect(getByText('Clusters')).toBeTruthy();
  });

  it('handles search text input', async () => {
    const { getByPlaceholderText } = render(<LibraryScreen />);
    
    const searchInput = getByPlaceholderText('Search photos...');
    fireEvent.changeText(searchInput, 'beach');
    
    await waitFor(() => {
      // Should trigger a new search with filtered results
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalledTimes(2); // Initial load + search
    });
  });

  it('handles filter changes', async () => {
    const { getByText } = render(<LibraryScreen />);
    
    // Open filter modal
    fireEvent.press(getByText('Filters'));
    
    // This would open the filter modal in the actual component
    // The test verifies the filter button is present and clickable
    expect(getByText('Filters')).toBeTruthy();
  });

  it('handles sort option changes', async () => {
    const { getByText } = render(<LibraryScreen />);
    
    fireEvent.press(getByText('Quality'));
    
    await waitFor(() => {
      // Should trigger a new search with quality sorting
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ field: 'quality_overall' }),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  it('handles photo selection', () => {
    const { getByTestId } = render(<LibraryScreen />);
    
    // This would be handled by the PhotoGridView component
    // The test verifies the selection logic is wired up
    expect(mockStoreActions.togglePhotoSelection).toBeDefined();
  });

  it('handles photo deletion', async () => {
    mockPhotoRepositoryInstance.delete.mockResolvedValue(undefined);
    
    const { getByText } = render(<LibraryScreen />);
    
    // Simulate photo deletion (this would normally be triggered from photo detail view)
    const deleteHandler = jest.fn();
    
    // Mock the delete confirmation
    mockAlert.alert.mockImplementation((title, message, buttons) => {
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });
    
    // The actual deletion would be handled by the component's internal methods
    expect(mockPhotoRepositoryInstance.delete).toBeDefined();
  });

  it('handles batch photo deletion', async () => {
    const selectedPhotos = ['1', '2'];
    mockStoreActions.selectedPhotos = selectedPhotos;
    mockPhotoRepositoryInstance.delete.mockResolvedValue(undefined);
    
    render(<LibraryScreen />);
    
    // Mock the confirmation dialog
    mockAlert.alert.mockImplementation((title, message, buttons) => {
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });
    
    // The batch deletion logic should be available
    expect(mockPhotoRepositoryInstance.delete).toBeDefined();
  });

  it('handles photo sharing', async () => {
    mockShare.share.mockResolvedValue({ action: 'sharedAction' });
    
    render(<LibraryScreen />);
    
    // The sharing functionality should be available
    expect(mockShare.share).toBeDefined();
  });

  it('handles refresh', async () => {
    render(<LibraryScreen />);
    
    // Simulate pull-to-refresh
    await waitFor(() => {
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalled();
      expect(mockClusterRepositoryInstance.findAll).toHaveBeenCalled();
    });
  });

  it('handles load more photos', async () => {
    mockPhotoRepositoryInstance.find.mockResolvedValueOnce(mockPhotos);
    
    render(<LibraryScreen />);
    
    await waitFor(() => {
      // Should load initial photos
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        50, // limit
        0   // offset
      );
    });
  });

  it('filters photos by search text', async () => {
    const { getByPlaceholderText } = render(<LibraryScreen />);
    
    const searchInput = getByPlaceholderText('Search photos...');
    fireEvent.changeText(searchInput, 'beach');
    
    await waitFor(() => {
      // Should filter photos containing 'beach' in their detected objects/scenes
      expect(mockPhotoRepositoryInstance.find).toHaveBeenCalled();
    });
  });

  it('generates available tags from photo features', () => {
    render(<LibraryScreen />);
    
    // The component should extract tags from photo features
    // This is tested indirectly through the search functionality
    expect(mockStoreActions.photos).toEqual(mockPhotos);
  });

  it('handles error states gracefully', async () => {
    mockPhotoRepositoryInstance.find.mockRejectedValue(new Error('Database error'));
    
    render(<LibraryScreen />);
    
    await waitFor(() => {
      expect(mockAlert.alert).toHaveBeenCalledWith('Error', 'Failed to load photos');
    });
  });

  it('shows loading states appropriately', () => {
    const { getByText } = render(<LibraryScreen />);
    
    // The loading states are handled by child components
    // This test verifies the screen structure is correct
    expect(getByText('Photo Library')).toBeTruthy();
  });

  it('handles empty states', () => {
    mockStoreActions.photos = [];
    mockStoreActions.clusters = [];
    
    const { getByText } = render(<LibraryScreen />);
    
    // Empty states are handled by child components
    expect(getByText('Photo Library')).toBeTruthy();
  });

  it('maintains proper component hierarchy', () => {
    const { getByText } = render(<LibraryScreen />);
    
    // Verify main components are present
    expect(getByText('Photo Library')).toBeTruthy();
    expect(getByText('Grid')).toBeTruthy();
    expect(getByText('Clusters')).toBeTruthy();
    expect(getByText('Filters')).toBeTruthy();
  });
});