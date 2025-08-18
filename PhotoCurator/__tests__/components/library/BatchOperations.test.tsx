import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { BatchOperations } from '../../../src/components/library/BatchOperations';
import { Photo, SyncStatus } from '../../../src/types';

// Mock Alert and Platform
const mockAlert = {
  alert: jest.fn(),
};

const mockPlatform = {
  OS: 'ios',
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: mockAlert,
    Platform: mockPlatform,
  };
});

// Use the mocked alert directly

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

describe('BatchOperations', () => {
  const defaultProps = {
    selectedPhotos: new Set(['1', '2']),
    photos: mockPhotos,
    onClearSelection: jest.fn(),
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.alert.mockClear();
  });

  it('renders when visible with selected photos', () => {
    const { getByText } = render(<BatchOperations {...defaultProps} />);
    
    expect(getByText('2 photos selected')).toBeTruthy();
    expect(getByText('Clear')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <BatchOperations {...defaultProps} visible={false} />
    );
    
    expect(queryByText('2 photos selected')).toBeNull();
  });

  it('does not render when no photos selected', () => {
    const { queryByText } = render(
      <BatchOperations {...defaultProps} selectedPhotos={new Set()} />
    );
    
    expect(queryByText('2 photos selected')).toBeNull();
  });

  it('displays singular text for single photo', () => {
    const { getByText } = render(
      <BatchOperations {...defaultProps} selectedPhotos={new Set(['1'])} />
    );
    
    expect(getByText('1 photo selected')).toBeTruthy();
  });

  it('handles clear selection', () => {
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations {...defaultProps} onClearSelection={onClearSelection} />
    );
    
    fireEvent.press(getByText('Clear'));
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('renders share button when onSharePhotos provided', () => {
    const { getByText } = render(
      <BatchOperations {...defaultProps} onSharePhotos={jest.fn()} />
    );
    
    expect(getByText('Share')).toBeTruthy();
  });

  it('handles share photos', () => {
    const onSharePhotos = jest.fn();
    const { getByText } = render(
      <BatchOperations {...defaultProps} onSharePhotos={onSharePhotos} />
    );
    
    fireEvent.press(getByText('Share'));
    expect(onSharePhotos).toHaveBeenCalledWith(['1', '2']);
  });

  it('prevents sharing more than 10 photos', () => {
    const largeSelection = new Set(Array.from({ length: 15 }, (_, i) => `${i + 1}`));
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        selectedPhotos={largeSelection}
        onSharePhotos={jest.fn()} 
      />
    );
    
    fireEvent.press(getByText('Share'));
    
    expect(mockAlert.alert).toHaveBeenCalledWith(
      'Too Many Photos',
      'You can only share up to 10 photos at once. Please select fewer photos.',
      [{ text: 'OK' }]
    );
  });

  it('renders export button when onExportPhotos provided', () => {
    const { getByText } = render(
      <BatchOperations {...defaultProps} onExportPhotos={jest.fn()} />
    );
    
    expect(getByText('Export')).toBeTruthy();
  });

  it('handles export photos with confirmation', () => {
    const onExportPhotos = jest.fn();
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onExportPhotos={onExportPhotos}
        onClearSelection={onClearSelection}
      />
    );
    
    fireEvent.press(getByText('Export'));
    
    expect(mockAlert.alert).toHaveBeenCalledWith(
      'Export Photos',
      'Export 2 photos to device gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: expect.any(Function),
        },
      ]
    );
    
    // Simulate user confirming export
    const confirmCallback = mockAlert.alert.mock.calls[0][2][1].onPress;
    confirmCallback();
    
    expect(onExportPhotos).toHaveBeenCalledWith(['1', '2']);
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('renders delete button when onDeletePhotos provided', () => {
    const { getByText } = render(
      <BatchOperations {...defaultProps} onDeletePhotos={jest.fn()} />
    );
    
    expect(getByText('Delete')).toBeTruthy();
  });

  it('handles delete photos with confirmation', () => {
    const onDeletePhotos = jest.fn();
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onDeletePhotos={onDeletePhotos}
        onClearSelection={onClearSelection}
      />
    );
    
    fireEvent.press(getByText('Delete'));
    
    expect(mockAlert.alert).toHaveBeenCalledWith(
      'Delete Photos',
      'Are you sure you want to delete 2 photos? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: expect.any(Function),
        },
      ]
    );
    
    // Simulate user confirming delete
    const confirmCallback = mockAlert.alert.mock.calls[0][2][1].onPress;
    confirmCallback();
    
    expect(onDeletePhotos).toHaveBeenCalledWith(['1', '2']);
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('renders more button when additional actions provided', () => {
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onAddToCluster={jest.fn()}
        onMarkAsFavorite={jest.fn()}
      />
    );
    
    expect(getByText('More')).toBeTruthy();
  });

  it('handles add to cluster action', () => {
    const onAddToCluster = jest.fn();
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onAddToCluster={onAddToCluster}
        onClearSelection={onClearSelection}
      />
    );
    
    fireEvent.press(getByText('More'));
    
    // Since we're testing iOS, ActionSheetIOS should be called
    // For simplicity, we'll test the direct handler
    expect(mockAlert.alert).toHaveBeenCalledWith(
      'Add to Cluster',
      'Add 2 photos to a cluster?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: expect.any(Function),
        },
      ]
    );
  });

  it('handles remove from cluster action', () => {
    const onRemoveFromCluster = jest.fn();
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onRemoveFromCluster={onRemoveFromCluster}
        onClearSelection={onClearSelection}
      />
    );
    
    fireEvent.press(getByText('More'));
    
    expect(mockAlert.alert).toHaveBeenCalledWith(
      'Remove from Cluster',
      'Remove 2 photos from their clusters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: expect.any(Function),
        },
      ]
    );
  });

  it('handles mark as favorite action', () => {
    const onMarkAsFavorite = jest.fn();
    const onClearSelection = jest.fn();
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onMarkAsFavorite={onMarkAsFavorite}
        onClearSelection={onClearSelection}
      />
    );
    
    fireEvent.press(getByText('More'));
    
    // The more button should trigger the action directly for mark as favorite
    // since it doesn't need confirmation
    expect(onMarkAsFavorite).toHaveBeenCalledWith(['1', '2']);
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('uses correct button styles', () => {
    const { getByText } = render(
      <BatchOperations 
        {...defaultProps} 
        onSharePhotos={jest.fn()}
        onExportPhotos={jest.fn()}
        onDeletePhotos={jest.fn()}
        onAddToCluster={jest.fn()}
      />
    );
    
    const shareButton = getByText('Share').parent;
    const exportButton = getByText('Export').parent;
    const deleteButton = getByText('Delete').parent;
    const moreButton = getByText('More').parent;
    
    // Check that buttons have appropriate styling
    expect(shareButton?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#007AFF' })
    );
    expect(exportButton?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#34C759' })
    );
    expect(deleteButton?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#FF3B30' })
    );
    expect(moreButton?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#8E8E93' })
    );
  });

  it('handles singular vs plural text correctly', () => {
    const { getByText, rerender } = render(
      <BatchOperations {...defaultProps} selectedPhotos={new Set(['1'])} />
    );
    
    expect(getByText('1 photo selected')).toBeTruthy();
    
    rerender(
      <BatchOperations {...defaultProps} selectedPhotos={new Set(['1', '2', '3'])} />
    );
    
    expect(getByText('3 photos selected')).toBeTruthy();
  });
});