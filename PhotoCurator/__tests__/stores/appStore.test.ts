import {useAppStore} from '../../src/stores/appStore';
import {Photo, CurationGoal, SyncStatus} from '../../src/types';

// Mock photo data
const mockPhoto: Photo = {
  id: '1',
  uri: 'file://test.jpg',
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 1024000,
    format: 'jpg',
    timestamp: new Date(),
  },
  syncStatus: SyncStatus.LOCAL_ONLY,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      photos: [],
      selectedPhotos: [],
      isLoading: false,
      curationGoal: CurationGoal.BALANCED,
    });
  });

  it('should add a photo', () => {
    const {addPhoto} = useAppStore.getState();
    addPhoto(mockPhoto);

    const {photos} = useAppStore.getState();
    expect(photos).toHaveLength(1);
    expect(photos[0]).toEqual(mockPhoto);
  });

  it('should toggle photo selection', () => {
    const {addPhoto, togglePhotoSelection} = useAppStore.getState();
    addPhoto(mockPhoto);

    togglePhotoSelection('1');
    expect(useAppStore.getState().selectedPhotos).toContain('1');

    togglePhotoSelection('1');
    expect(useAppStore.getState().selectedPhotos).not.toContain('1');
  });

  it('should set loading state', () => {
    const {setLoading} = useAppStore.getState();

    setLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);

    setLoading(false);
    expect(useAppStore.getState().isLoading).toBe(false);
  });
});
