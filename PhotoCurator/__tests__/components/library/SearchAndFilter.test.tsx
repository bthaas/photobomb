import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchAndFilter, SearchFilters, SortOptions } from '../../../src/components/library/SearchAndFilter';
import { ClusterType } from '../../../src/types';

describe('SearchAndFilter', () => {
  const defaultFilters: SearchFilters = {
    searchText: '',
  };

  const defaultSortOptions: SortOptions = {
    field: 'date',
    direction: 'desc',
  };

  const defaultProps = {
    filters: defaultFilters,
    sortOptions: defaultSortOptions,
    onFiltersChange: jest.fn(),
    onSortChange: jest.fn(),
    showFilterModal: false,
    onToggleFilterModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    const { getByPlaceholderText } = render(<SearchAndFilter {...defaultProps} />);
    
    expect(getByPlaceholderText('Search photos...')).toBeTruthy();
  });

  it('handles search text input', () => {
    const onFiltersChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchAndFilter {...defaultProps} onFiltersChange={onFiltersChange} />
    );
    
    const searchInput = getByPlaceholderText('Search photos...');
    fireEvent.changeText(searchInput, 'beach');
    
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchText: 'beach',
    });
  });

  it('displays filter button with active state', () => {
    const filtersWithActive: SearchFilters = {
      searchText: '',
      hasFeatures: true,
      qualityThreshold: 0.8,
    };
    
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} filters={filtersWithActive} />
    );
    
    expect(getByText('Filters (2)')).toBeTruthy();
  });

  it('handles filter button press', () => {
    const onToggleFilterModal = jest.fn();
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} onToggleFilterModal={onToggleFilterModal} />
    );
    
    fireEvent.press(getByText('Filters'));
    expect(onToggleFilterModal).toHaveBeenCalled();
  });

  it('displays sort options', () => {
    const { getByText } = render(<SearchAndFilter {...defaultProps} />);
    
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Quality')).toBeTruthy();
    expect(getByText('Size')).toBeTruthy();
    expect(getByText('Name')).toBeTruthy();
  });

  it('handles sort field selection', () => {
    const onSortChange = jest.fn();
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} onSortChange={onSortChange} />
    );
    
    fireEvent.press(getByText('Quality'));
    expect(onSortChange).toHaveBeenCalledWith({
      ...defaultSortOptions,
      field: 'quality',
    });
  });

  it('handles sort direction toggle', () => {
    const onSortChange = jest.fn();
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} onSortChange={onSortChange} />
    );
    
    fireEvent.press(getByText('↓'));
    expect(onSortChange).toHaveBeenCalledWith({
      ...defaultSortOptions,
      direction: 'asc',
    });
  });

  it('shows correct sort direction icon', () => {
    const ascSortOptions: SortOptions = {
      field: 'date',
      direction: 'asc',
    };
    
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} sortOptions={ascSortOptions} />
    );
    
    expect(getByText('↑')).toBeTruthy();
  });

  describe('Filter Modal', () => {
    const modalProps = {
      ...defaultProps,
      showFilterModal: true,
    };

    it('renders filter modal when visible', () => {
      const { getByText } = render(<SearchAndFilter {...modalProps} />);
      
      expect(getByText('Filters')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Apply')).toBeTruthy();
    });

    it('displays quality filter options', () => {
      const { getByText } = render(<SearchAndFilter {...modalProps} />);
      
      expect(getByText('Quality')).toBeTruthy();
      expect(getByText('Minimum Quality')).toBeTruthy();
      expect(getByText('Any')).toBeTruthy();
      expect(getByText('30%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('70%')).toBeTruthy();
      expect(getByText('90%')).toBeTruthy();
    });

    it('displays content filter switches', () => {
      const { getByText } = render(<SearchAndFilter {...modalProps} />);
      
      expect(getByText('Content')).toBeTruthy();
      expect(getByText('Has AI Analysis')).toBeTruthy();
      expect(getByText('Has Faces')).toBeTruthy();
    });

    it('displays cluster type filter options', () => {
      const { getByText } = render(<SearchAndFilter {...modalProps} />);
      
      expect(getByText('Cluster Type')).toBeTruthy();
      expect(getByText('Visual Similarity')).toBeTruthy();
      expect(getByText('Face Group')).toBeTruthy();
      expect(getByText('Event')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
      expect(getByText('Time Period')).toBeTruthy();
    });

    it('displays file size filter options', () => {
      const { getByText } = render(<SearchAndFilter {...modalProps} />);
      
      expect(getByText('File Size')).toBeTruthy();
      expect(getByText('Any')).toBeTruthy();
      expect(getByText('Small (<1MB)')).toBeTruthy();
      expect(getByText('Medium (1-5MB)')).toBeTruthy();
      expect(getByText('Large (>5MB)')).toBeTruthy();
    });

    it('displays available tags when provided', () => {
      const availableTags = ['beach', 'sunset', 'portrait'];
      const { getByText } = render(
        <SearchAndFilter {...modalProps} availableTags={availableTags} />
      );
      
      expect(getByText('Tags')).toBeTruthy();
      expect(getByText('beach')).toBeTruthy();
      expect(getByText('sunset')).toBeTruthy();
      expect(getByText('portrait')).toBeTruthy();
    });

    it('handles quality threshold selection', async () => {
      const onFiltersChange = jest.fn();
      const { getByText } = render(
        <SearchAndFilter {...modalProps} onFiltersChange={onFiltersChange} />
      );
      
      fireEvent.press(getByText('70%'));
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
          qualityThreshold: 0.7,
        });
      });
    });

    it('handles content filter toggle', async () => {
      const onFiltersChange = jest.fn();
      const { getByText, UNSAFE_getAllByType } = render(
        <SearchAndFilter {...modalProps} onFiltersChange={onFiltersChange} />
      );
      
      const switches = UNSAFE_getAllByType('Switch');
      fireEvent(switches[0], 'valueChange', true); // Has AI Analysis
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
          hasFeatures: true,
        });
      });
    });

    it('handles cluster type selection', async () => {
      const onFiltersChange = jest.fn();
      const { getByText } = render(
        <SearchAndFilter {...modalProps} onFiltersChange={onFiltersChange} />
      );
      
      fireEvent.press(getByText('Face Group'));
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
          clusterType: ClusterType.FACE_GROUP,
        });
      });
    });

    it('handles file size selection', async () => {
      const onFiltersChange = jest.fn();
      const { getByText } = render(
        <SearchAndFilter {...modalProps} onFiltersChange={onFiltersChange} />
      );
      
      fireEvent.press(getByText('Large (>5MB)'));
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
          fileSize: {
            min: 5 * 1024 * 1024,
            max: undefined,
          },
        });
      });
    });

    it('handles tag selection', async () => {
      const availableTags = ['beach', 'sunset'];
      const onFiltersChange = jest.fn();
      const { getByText } = render(
        <SearchAndFilter 
          {...modalProps} 
          availableTags={availableTags}
          onFiltersChange={onFiltersChange} 
        />
      );
      
      fireEvent.press(getByText('beach'));
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
          tags: ['beach'],
        });
      });
    });

    it('handles reset all filters', async () => {
      const filtersWithData: SearchFilters = {
        searchText: 'test',
        hasFeatures: true,
        qualityThreshold: 0.8,
      };
      
      const onFiltersChange = jest.fn();
      const onToggleFilterModal = jest.fn();
      const { getByText } = render(
        <SearchAndFilter 
          {...modalProps}
          filters={filtersWithData}
          onFiltersChange={onFiltersChange}
          onToggleFilterModal={onToggleFilterModal}
        />
      );
      
      fireEvent.press(getByText('Reset All'));
      
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          searchText: '',
        });
        expect(onToggleFilterModal).toHaveBeenCalled();
      });
    });

    it('handles modal cancel', () => {
      const onToggleFilterModal = jest.fn();
      const { getByText } = render(
        <SearchAndFilter {...modalProps} onToggleFilterModal={onToggleFilterModal} />
      );
      
      fireEvent.press(getByText('Cancel'));
      expect(onToggleFilterModal).toHaveBeenCalled();
    });
  });

  it('counts active filters correctly', () => {
    const activeFilters: SearchFilters = {
      searchText: '',
      hasFeatures: true,
      hasFaces: true,
      qualityThreshold: 0.8,
      clusterType: ClusterType.FACE_GROUP,
      fileSize: { min: 1024 * 1024 },
      tags: ['beach', 'sunset'],
    };
    
    const { getByText } = render(
      <SearchAndFilter {...defaultProps} filters={activeFilters} />
    );
    
    expect(getByText('Filters (6)')).toBeTruthy();
  });
});