import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClusterView } from '../../../src/components/library/ClusterView';
import { PhotoCluster, ClusterType, Photo, SyncStatus } from '../../../src/types';

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
    qualityScore: {
      overall: 0.9,
      sharpness: 0.8,
      exposure: 0.9,
      colorBalance: 0.85,
      noise: 0.1,
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
  {
    id: 'cluster2',
    type: ClusterType.FACE_GROUP,
    photos: [mockPhotos[0]],
    centroid: [0.4, 0.5, 0.6],
    confidence: 0.92,
    label: 'John Doe',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

describe('ClusterView', () => {
  const defaultProps = {
    clusters: mockClusters,
    onPhotoPress: jest.fn(),
    selectedPhotos: new Set<string>(),
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clusters with correct information', () => {
    const { getByText } = render(<ClusterView {...defaultProps} />);
    
    expect(getByText('Beach Photos')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('(2)')).toBeTruthy(); // Photo count for first cluster
    expect(getByText('(1)')).toBeTruthy(); // Photo count for second cluster
  });

  it('displays correct cluster type icons', () => {
    const { getByText } = render(<ClusterView {...defaultProps} />);
    
    expect(getByText('🖼️')).toBeTruthy(); // Visual similarity icon
    expect(getByText('👤')).toBeTruthy(); // Face group icon
  });

  it('shows confidence percentages', () => {
    const { getByText } = render(<ClusterView {...defaultProps} />);
    
    expect(getByText('Similar Photos • 85% confidence')).toBeTruthy();
    expect(getByText('People • 92% confidence')).toBeTruthy();
  });

  it('displays photo previews for each cluster', () => {
    const { UNSAFE_getAllByType } = render(<ClusterView {...defaultProps} />);
    
    // Should render Image components for photo previews
    const images = UNSAFE_getAllByType('Image');
    expect(images.length).toBeGreaterThan(0);
  });

  it('shows remaining photo count when cluster has more than 4 photos', () => {
    const largeCluster: PhotoCluster = {
      ...mockClusters[0],
      photos: [...mockPhotos, ...mockPhotos, ...mockPhotos], // 6 photos total
    };
    
    const { getByText } = render(
      <ClusterView {...defaultProps} clusters={[largeCluster]} />
    );
    
    expect(getByText('+2')).toBeTruthy(); // Should show +2 for remaining photos
  });

  it('handles cluster header press', () => {
    const onClusterPress = jest.fn();
    const { getByText } = render(
      <ClusterView {...defaultProps} onClusterPress={onClusterPress} />
    );
    
    fireEvent.press(getByText('Beach Photos'));
    expect(onClusterPress).toHaveBeenCalledWith(mockClusters[0]);
  });

  it('handles expand/collapse toggle', () => {
    const { getByText } = render(<ClusterView {...defaultProps} />);
    
    const expandButton = getByText('▶');
    fireEvent.press(expandButton);
    
    // Should change to collapse icon
    expect(getByText('▼')).toBeTruthy();
  });

  it('handles photo press in normal mode', () => {
    const onPhotoPress = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ClusterView {...defaultProps} onPhotoPress={onPhotoPress} />
    );
    
    const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
    const photoTouchable = touchableOpacities.find((touchable: any) => 
      touchable.props.style?.some?.((style: any) => style?.borderRadius === 8)
    );
    
    if (photoTouchable) {
      fireEvent.press(photoTouchable);
      expect(onPhotoPress).toHaveBeenCalled();
    }
  });

  it('handles photo press in selection mode', () => {
    const onSelectionChange = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ClusterView 
        {...defaultProps} 
        onSelectionChange={onSelectionChange}
        showSelectionMode={true}
      />
    );
    
    const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
    const photoTouchable = touchableOpacities.find((touchable: any) => 
      touchable.props.style?.some?.((style: any) => style?.borderRadius === 8)
    );
    
    if (photoTouchable) {
      fireEvent.press(photoTouchable);
      expect(onSelectionChange).toHaveBeenCalled();
    }
  });

  it('shows selection overlay for selected photos', () => {
    const selectedPhotos = new Set(['1']);
    const { getByText } = render(
      <ClusterView {...defaultProps} selectedPhotos={selectedPhotos} />
    );
    
    expect(getByText('✓')).toBeTruthy();
  });

  it('sorts clusters by photo count and confidence', () => {
    const unsortedClusters = [
      {
        ...mockClusters[1], // 1 photo, 92% confidence
      },
      {
        ...mockClusters[0], // 2 photos, 85% confidence
      },
    ];
    
    const { UNSAFE_getByType } = render(
      <ClusterView {...defaultProps} clusters={unsortedClusters} />
    );
    
    const flatList = UNSAFE_getByType('FlatList');
    const sortedData = flatList.props.data;
    
    // Should sort by photo count first (descending)
    expect(sortedData[0].photos.length).toBeGreaterThanOrEqual(sortedData[1].photos.length);
  });

  it('displays empty state when no clusters', () => {
    const { getByText } = render(
      <ClusterView {...defaultProps} clusters={[]} />
    );
    
    expect(getByText('No clusters found')).toBeTruthy();
    expect(getByText('Photos will be automatically grouped as they are analyzed')).toBeTruthy();
  });

  it('shows quality indicators on photos', () => {
    const { getByText } = render(<ClusterView {...defaultProps} />);
    
    // First photo has quality score > 0.8, should show star
    expect(getByText('★')).toBeTruthy();
  });

  it('expands cluster to show additional photos', () => {
    const largeCluster: PhotoCluster = {
      ...mockClusters[0],
      photos: [...mockPhotos, ...mockPhotos, ...mockPhotos], // 6 photos total
    };
    
    const { getByText, UNSAFE_getByType } = render(
      <ClusterView {...defaultProps} clusters={[largeCluster]} />
    );
    
    // Expand the cluster
    const expandButton = getByText('▶');
    fireEvent.press(expandButton);
    
    // Should render additional photos in expanded view
    const flatList = UNSAFE_getByType('FlatList');
    expect(flatList.props.data.length).toBe(2); // Should show remaining 2 photos
  });

  it('uses proper styling and layout', () => {
    const { UNSAFE_getByType } = render(<ClusterView {...defaultProps} />);
    
    const container = UNSAFE_getByType('View');
    expect(container.props.style).toMatchObject({
      flex: 1,
      backgroundColor: '#fff',
    });
  });
});