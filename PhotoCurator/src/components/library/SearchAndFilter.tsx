import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Switch,
} from 'react-native';
import { Photo, ClusterType } from '../../types';

export interface SearchFilters {
  searchText: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasFeatures?: boolean;
  hasFaces?: boolean;
  qualityThreshold?: number;
  clusterType?: ClusterType;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  fileSize?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
}

export interface SortOptions {
  field: 'date' | 'quality' | 'size' | 'name';
  direction: 'asc' | 'desc';
}

interface SearchAndFilterProps {
  filters: SearchFilters;
  sortOptions: SortOptions;
  onFiltersChange: (filters: SearchFilters) => void;
  onSortChange: (sort: SortOptions) => void;
  availableTags?: string[];
  showFilterModal: boolean;
  onToggleFilterModal: () => void;
}

interface FilterModalProps {
  visible: boolean;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
  availableTags?: string[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  onFiltersChange,
  onClose,
  availableTags = [],
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
    onClose();
  }, [localFilters, onFiltersChange, onClose]);

  const handleResetFilters = useCallback(() => {
    const resetFilters: SearchFilters = {
      searchText: '',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onClose();
  }, [onFiltersChange, onClose]);

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Filters</Text>
          
          <TouchableOpacity onPress={handleApplyFilters}>
            <Text style={styles.modalApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Quality Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Quality</Text>
            
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Minimum Quality</Text>
              <View style={styles.qualityButtons}>
                {[0, 0.3, 0.5, 0.7, 0.9].map(threshold => (
                  <TouchableOpacity
                    key={threshold}
                    style={[
                      styles.qualityButton,
                      localFilters.qualityThreshold === threshold && styles.qualityButtonActive
                    ]}
                    onPress={() => updateFilter('qualityThreshold', 
                      localFilters.qualityThreshold === threshold ? undefined : threshold
                    )}
                  >
                    <Text style={[
                      styles.qualityButtonText,
                      localFilters.qualityThreshold === threshold && styles.qualityButtonTextActive
                    ]}>
                      {threshold === 0 ? 'Any' : `${Math.round(threshold * 100)}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Content Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Content</Text>
            
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Has AI Analysis</Text>
              <Switch
                value={localFilters.hasFeatures || false}
                onValueChange={(value) => updateFilter('hasFeatures', value || undefined)}
              />
            </View>
            
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Has Faces</Text>
              <Switch
                value={localFilters.hasFaces || false}
                onValueChange={(value) => updateFilter('hasFaces', value || undefined)}
              />
            </View>
          </View>

          {/* Cluster Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Cluster Type</Text>
            
            <View style={styles.clusterTypeContainer}>
              {Object.values(ClusterType).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.clusterTypeButton,
                    localFilters.clusterType === type && styles.clusterTypeButtonActive
                  ]}
                  onPress={() => updateFilter('clusterType', 
                    localFilters.clusterType === type ? undefined : type
                  )}
                >
                  <Text style={[
                    styles.clusterTypeButtonText,
                    localFilters.clusterType === type && styles.clusterTypeButtonTextActive
                  ]}>
                    {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* File Size Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>File Size</Text>
            
            <View style={styles.fileSizeContainer}>
              {[
                { label: 'Any', min: undefined, max: undefined },
                { label: 'Small (<1MB)', min: undefined, max: 1024 * 1024 },
                { label: 'Medium (1-5MB)', min: 1024 * 1024, max: 5 * 1024 * 1024 },
                { label: 'Large (>5MB)', min: 5 * 1024 * 1024, max: undefined },
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.fileSizeButton,
                    localFilters.fileSize?.min === option.min && 
                    localFilters.fileSize?.max === option.max && 
                    styles.fileSizeButtonActive
                  ]}
                  onPress={() => updateFilter('fileSize', 
                    option.min === undefined && option.max === undefined 
                      ? undefined 
                      : { min: option.min, max: option.max }
                  )}
                >
                  <Text style={[
                    styles.fileSizeButtonText,
                    localFilters.fileSize?.min === option.min && 
                    localFilters.fileSize?.max === option.max && 
                    styles.fileSizeButtonTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tags</Text>
              
              <View style={styles.tagsContainer}>
                {availableTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      localFilters.tags?.includes(tag) && styles.tagButtonActive
                    ]}
                    onPress={() => {
                      const currentTags = localFilters.tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      updateFilter('tags', newTags.length > 0 ? newTags : undefined);
                    }}
                  >
                    <Text style={[
                      styles.tagButtonText,
                      localFilters.tags?.includes(tag) && styles.tagButtonTextActive
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  filters,
  sortOptions,
  onFiltersChange,
  onSortChange,
  availableTags,
  showFilterModal,
  onToggleFilterModal,
}) => {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.hasFeatures) count++;
    if (filters.hasFaces) count++;
    if (filters.qualityThreshold !== undefined) count++;
    if (filters.clusterType) count++;
    if (filters.fileSize) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const handleSearchTextChange = useCallback((text: string) => {
    onFiltersChange({
      ...filters,
      searchText: text,
    });
  }, [filters, onFiltersChange]);

  const handleSortFieldChange = useCallback((field: SortOptions['field']) => {
    onSortChange({
      ...sortOptions,
      field,
    });
  }, [sortOptions, onSortChange]);

  const handleSortDirectionToggle = useCallback(() => {
    onSortChange({
      ...sortOptions,
      direction: sortOptions.direction === 'asc' ? 'desc' : 'asc',
    });
  }, [sortOptions, onSortChange]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos..."
          value={filters.searchText}
          onChangeText={handleSearchTextChange}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter and Sort Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={onToggleFilterModal}
        >
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </TouchableOpacity>

        <View style={styles.sortContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['date', 'quality', 'size', 'name'] as const).map(field => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.sortButton,
                  sortOptions.field === field && styles.sortButtonActive
                ]}
                onPress={() => handleSortFieldChange(field)}
              >
                <Text style={[
                  styles.sortButtonText,
                  sortOptions.field === field && styles.sortButtonTextActive
                ]}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.sortDirectionButton}
            onPress={handleSortDirectionToggle}
          >
            <Text style={styles.sortDirectionText}>
              {sortOptions.direction === 'asc' ? '↑' : '↓'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClose={onToggleFilterModal}
        availableTags={availableTags}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  sortDirectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortDirectionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalApplyText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qualityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  qualityButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  qualityButtonTextActive: {
    color: '#fff',
  },
  clusterTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clusterTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clusterTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  clusterTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  clusterTypeButtonTextActive: {
    color: '#fff',
  },
  fileSizeContainer: {
    gap: 8,
  },
  fileSizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileSizeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fileSizeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  fileSizeButtonTextActive: {
    color: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tagButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resetButton: {
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default SearchAndFilter;