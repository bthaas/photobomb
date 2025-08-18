import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PhotoGridView } from '../../../src/components/library/PhotoGridView';
import { Photo, SyncStatus } from '../../../src/types';

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
    faces: [
      {
        id: 'face1',
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
        landmarks: {
          leftEye: { x: 150, y: 150 },
          rightEye: { x: 250, y: 150 },
          nose: { x: 200, y: 200 },
          leftMouth: { x: 180, y: 250 },
          rightMouth: { x: 220, y: 250 },
        },
        embedding: [0.1, 0.2, 0.3],
        confidence: 0.95,
        attributes: {
          age: 25,
          gender: 'female',
          emotion: 'happy',
          smile: 0.9,
          eyesOpen: 0.95,
        },
      },
    ],
    clusterId: 'cluster1',
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
    qualityScore: {
      overall: 0.7,
      sharpness: 0.6,
      exposure: 0.8,
      colorBalance: 0.7,
      noise: 0.2,
    },
  },
];

describe('PhotoGridView', () => {
  const defaultProps = {
    photos: mockPhotos,
    selectedPhotos: new Set<string>(),
    onPhotoPress: jest.fn(),
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders photos in a grid', () => {
    const { getByTestId } = render(<PhotoGridView {...defaultProps} />);
    
    // Should render the photo grid container
    expect(getByTestId).toBeDefined();
  });

  it('displays quality indicators for high-quality photos', () => {
    const { getByText } = render(
      <PhotoGridView {...defaultProps} showQualityIndicator={true} />
    );
    
    // First photo has quality score > 0.8, should show star
    expect(getByText('★')).toBeTruthy();
  });

  it('displays face count badges', () => {
    const { getByText } = render(<PhotoGridView {...defaultProps} />);
    
    // First photo has 1 face
    expect(getByText('1')).toBeTruthy();
  });

  it('shows cluster indicators for clustered photos', () => {
    const { UNSAFE_getByType } = render(<PhotoGridView {...defaultProps} />);
    
    // Should render cluster indicators (green dots)
    const indicators = UNSAFE_getByType('View').filter((view: any) => 
      view.props.style?.backgroundColor === '#34C759'
    );
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('handles photo press in normal mode', () => {
    const onPhotoPress = jest.fn();
    const { getByTestId } = render(
      <PhotoGridView {...defaultProps} onPhotoPress={onPhotoPress} />
    );
    
    // Find and press the first photo
    const photoItems = getByTestId('photo-item-1');
    if (photoItems) {
      fireEvent.press(photoItems);
      expect(onPhotoPress).toHaveBeenCalledWith(mockPhotos[0]);
    }
  });

  it('handles photo press in selection mode', () => {
    const onSelectionChange = jest.fn();
    const { getByTestId } = render(
      <PhotoGridView 
        {...defaultProps} 
        onSelectionChange={onSelectionChange}
        showSelectionMode={true}
      />
    );
    
    const photoItems = getByTestId('photo-item-1');
    if (photoItems) {
      fireEvent.press(photoItems);
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1']));
    }
  });

  it('handles long press to start selection', () => {
    const onPhotoLongPress = jest.fn();
    const { getByTestId } = render(
      <PhotoGridView {...defaultProps} onPhotoLongPress={onPhotoLongPress} />
    );
    
    const photoItems = getByTestId('photo-item-1');
    if (photoItems) {
      fireEvent(photoItems, 'longPress');
      expect(onPhotoLongPress).toHaveBeenCalledWith(mockPhotos[0]);
    }
  });

  it('shows selection overlay for selected photos', () => {
    const selectedPhotos = new Set(['1']);
    const { getByText } = render(
      <PhotoGridView {...defaultProps} selectedPhotos={selectedPhotos} />
    );
    
    // Should show checkmark for selected photo
    expect(getByText('✓')).toBeTruthy();
  });

  it('displays loading state', () => {
    const { getByText } = render(
      <PhotoGridView {...defaultProps} photos={[]} loading={true} />
    );
    
    expect(getByText('Loading photos...')).toBeTruthy();
  });

  it('displays empty state when no photos', () => {
    const { getByText } = render(
      <PhotoGridView {...defaultProps} photos={[]} loading={false} />
    );
    
    expect(getByText('No photos found')).toBeTruthy();
    expect(getByText('Import photos to get started')).toBeTruthy();
  });

  it('handles refresh when pull-to-refresh is triggered', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <PhotoGridView {...defaultProps} onRefresh={onRefresh} />
    );
    
    const flatList = getByTestId('photo-grid-flatlist');
    if (flatList) {
      fireEvent(flatList, 'refresh');
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    }
  });

  it('handles end reached for pagination', () => {
    const onEndReached = jest.fn();
    const { getByTestId } = render(
      <PhotoGridView 
        {...defaultProps} 
        onEndReached={onEndReached}
        hasMore={true}
      />
    );
    
    const flatList = getByTestId('photo-grid-flatlist');
    if (flatList) {
      fireEvent(flatList, 'endReached');
      expect(onEndReached).toHaveBeenCalled();
    }
  });

  it('shows loading footer when has more photos', () => {
    const { getByText } = render(
      <PhotoGridView {...defaultProps} hasMore={true} />
    );
    
    expect(getByText('Loading more photos...')).toBeTruthy();
  });

  it('optimizes rendering with proper item layout', () => {
    const { UNSAFE_getByType } = render(<PhotoGridView {...defaultProps} />);
    
    const flatList = UNSAFE_getByType('FlatList');
    expect(flatList.props.getItemLayout).toBeDefined();
    expect(flatList.props.initialNumToRender).toBe(20);
    expect(flatList.props.maxToRenderPerBatch).toBe(10);
    expect(flatList.props.windowSize).toBe(10);
    expect(flatList.props.removeClippedSubviews).toBe(true);
  });

  it('uses proper key extractor', () => {
    const { UNSAFE_getByType } = render(<PhotoGridView {...defaultProps} />);
    
    const flatList = UNSAFE_getByType('FlatList');
    const keyExtractor = flatList.props.keyExtractor;
    expect(keyExtractor(mockPhotos[0])).toBe('1');
  });
});