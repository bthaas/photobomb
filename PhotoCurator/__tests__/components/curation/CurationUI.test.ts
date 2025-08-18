/**
 * Curation UI logic tests (without React Native components)
 */

import {
  CurationResult,
  CurationGoal,
  RankedPhoto,
  Photo,
  UserFeedback,
  PhotoCluster,
  ClusterType
} from '../../../src/types';

// Mock data
const mockPhoto1: Photo = {
  id: 'photo1',
  uri: 'file://photo1.jpg',
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    format: 'JPEG',
    timestamp: new Date('2023-01-01')
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockPhoto2: Photo = {
  id: 'photo2',
  uri: 'file://photo2.jpg',
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 1536000,
    format: 'JPEG',
    timestamp: new Date('2023-01-01')
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockRankedPhotos: RankedPhoto[] = [
  {
    photo: mockPhoto1,
    rank: 1,
    score: 0.92,
    scoreBreakdown: {
      quality: 0.9,
      composition: 0.95,
      content: 0.88,
      uniqueness: 0.85,
      emotional: 0.82
    },
    reasoning: ['Excellent composition', 'High technical quality']
  },
  {
    photo: mockPhoto2,
    rank: 2,
    score: 0.78,
    scoreBreakdown: {
      quality: 0.8,
      composition: 0.75,
      content: 0.82,
      uniqueness: 0.76,
      emotional: 0.77
    },
    reasoning: ['Good exposure']
  }
];

const mockCurationResult: CurationResult = {
  goal: CurationGoal.BALANCED,
  selectedPhotos: mockRankedPhotos,
  totalPhotos: 10,
  processingTime: 1500,
  weights: {
    qualityWeight: 0.25,
    compositionWeight: 0.25,
    contentWeight: 0.25,
    uniquenessWeight: 0.15,
    emotionalWeight: 0.1
  },
  createdAt: new Date('2023-01-01')
};

const mockCluster: PhotoCluster = {
  id: 'cluster1',
  type: ClusterType.VISUAL_SIMILARITY,
  photos: [mockPhoto1, mockPhoto2],
  centroid: [0.1, 0.2, 0.3],
  confidence: 0.85,
  label: 'Scenic Photos',
  createdAt: new Date('2023-01-01')
};

describe('Curation UI Logic', () => {
  describe('Score Color Calculation', () => {
    const getScoreColor = (score: number): string => {
      if (score >= 0.8) return '#4CAF50'; // Green
      if (score >= 0.6) return '#FF9800'; // Orange
      return '#F44336'; // Red
    };

    it('returns green for high scores', () => {
      expect(getScoreColor(0.9)).toBe('#4CAF50');
      expect(getScoreColor(0.8)).toBe('#4CAF50');
    });

    it('returns orange for medium scores', () => {
      expect(getScoreColor(0.7)).toBe('#FF9800');
      expect(getScoreColor(0.6)).toBe('#FF9800');
    });

    it('returns red for low scores', () => {
      expect(getScoreColor(0.5)).toBe('#F44336');
      expect(getScoreColor(0.3)).toBe('#F44336');
    });
  });

  describe('Goal Display Name Conversion', () => {
    const getGoalDisplayName = (goal: CurationGoal): string => {
      switch (goal) {
        case CurationGoal.BEST_SCENIC:
          return 'Best Scenic';
        case CurationGoal.BEST_PORTRAITS:
          return 'Best Portraits';
        case CurationGoal.MOST_CREATIVE:
          return 'Most Creative';
        case CurationGoal.BEST_TECHNICAL:
          return 'Best Technical';
        case CurationGoal.MOST_EMOTIONAL:
          return 'Most Emotional';
        case CurationGoal.BALANCED:
          return 'Balanced';
        default:
          return 'Unknown';
      }
    };

    it('converts all curation goals correctly', () => {
      expect(getGoalDisplayName(CurationGoal.BEST_SCENIC)).toBe('Best Scenic');
      expect(getGoalDisplayName(CurationGoal.BEST_PORTRAITS)).toBe('Best Portraits');
      expect(getGoalDisplayName(CurationGoal.MOST_CREATIVE)).toBe('Most Creative');
      expect(getGoalDisplayName(CurationGoal.BEST_TECHNICAL)).toBe('Best Technical');
      expect(getGoalDisplayName(CurationGoal.MOST_EMOTIONAL)).toBe('Most Emotional');
      expect(getGoalDisplayName(CurationGoal.BALANCED)).toBe('Balanced');
    });
  });

  describe('User Feedback Creation', () => {
    const createFeedback = (
      photoId: string,
      action: 'keep' | 'discard' | 'favorite',
      context: {
        clusterId?: string;
        curationGoal: CurationGoal;
        originalRank: number;
        originalScore: number;
      }
    ): UserFeedback => {
      return {
        photoId,
        action,
        context,
        timestamp: new Date()
      };
    };

    it('creates feedback with correct structure', () => {
      const feedback = createFeedback('photo1', 'keep', {
        clusterId: 'cluster1',
        curationGoal: CurationGoal.BALANCED,
        originalRank: 1,
        originalScore: 0.92
      });

      expect(feedback.photoId).toBe('photo1');
      expect(feedback.action).toBe('keep');
      expect(feedback.context.clusterId).toBe('cluster1');
      expect(feedback.context.curationGoal).toBe(CurationGoal.BALANCED);
      expect(feedback.context.originalRank).toBe(1);
      expect(feedback.context.originalScore).toBe(0.92);
      expect(feedback.timestamp).toBeInstanceOf(Date);
    });

    it('handles different feedback actions', () => {
      const keepFeedback = createFeedback('photo1', 'keep', {
        curationGoal: CurationGoal.BALANCED,
        originalRank: 1,
        originalScore: 0.92
      });

      const discardFeedback = createFeedback('photo2', 'discard', {
        curationGoal: CurationGoal.BALANCED,
        originalRank: 2,
        originalScore: 0.78
      });

      const favoriteFeedback = createFeedback('photo1', 'favorite', {
        curationGoal: CurationGoal.BALANCED,
        originalRank: 1,
        originalScore: 0.92
      });

      expect(keepFeedback.action).toBe('keep');
      expect(discardFeedback.action).toBe('discard');
      expect(favoriteFeedback.action).toBe('favorite');
    });
  });

  describe('Export Options Validation', () => {
    interface ExportOptions {
      format: 'album' | 'folder' | 'share';
      includeMetadata: boolean;
      includeRankings: boolean;
      maxPhotos?: number;
      quality: 'original' | 'high' | 'medium';
    }

    const validateExportOptions = (options: ExportOptions): boolean => {
      const validFormats = ['album', 'folder', 'share'];
      const validQualities = ['original', 'high', 'medium'];

      return (
        validFormats.includes(options.format) &&
        validQualities.includes(options.quality) &&
        typeof options.includeMetadata === 'boolean' &&
        typeof options.includeRankings === 'boolean' &&
        (options.maxPhotos === undefined || options.maxPhotos > 0)
      );
    };

    it('validates correct export options', () => {
      const validOptions: ExportOptions = {
        format: 'album',
        includeMetadata: true,
        includeRankings: false,
        quality: 'high'
      };

      expect(validateExportOptions(validOptions)).toBe(true);
    });

    it('rejects invalid format', () => {
      const invalidOptions: ExportOptions = {
        format: 'invalid' as any,
        includeMetadata: true,
        includeRankings: false,
        quality: 'high'
      };

      expect(validateExportOptions(invalidOptions)).toBe(false);
    });

    it('rejects invalid quality', () => {
      const invalidOptions: ExportOptions = {
        format: 'album',
        includeMetadata: true,
        includeRankings: false,
        quality: 'invalid' as any
      };

      expect(validateExportOptions(invalidOptions)).toBe(false);
    });

    it('validates maxPhotos when provided', () => {
      const validOptions: ExportOptions = {
        format: 'album',
        includeMetadata: true,
        includeRankings: false,
        maxPhotos: 10,
        quality: 'high'
      };

      const invalidOptions: ExportOptions = {
        format: 'album',
        includeMetadata: true,
        includeRankings: false,
        maxPhotos: 0,
        quality: 'high'
      };

      expect(validateExportOptions(validOptions)).toBe(true);
      expect(validateExportOptions(invalidOptions)).toBe(false);
    });
  });

  describe('Photo Selection Logic', () => {
    const selectPhotos = (
      photos: RankedPhoto[],
      selectedIds: Set<string>
    ): RankedPhoto[] => {
      return photos.filter(photo => selectedIds.has(photo.photo.id));
    };

    const selectTopPhotos = (photos: RankedPhoto[], count: number): Set<string> => {
      return new Set(
        photos
          .slice(0, count)
          .map(photo => photo.photo.id)
      );
    };

    it('selects photos by ID set', () => {
      const selectedIds = new Set(['photo1']);
      const selected = selectPhotos(mockRankedPhotos, selectedIds);

      expect(selected).toHaveLength(1);
      expect(selected[0].photo.id).toBe('photo1');
    });

    it('selects top N photos', () => {
      const topIds = selectTopPhotos(mockRankedPhotos, 1);
      
      expect(topIds.size).toBe(1);
      expect(topIds.has('photo1')).toBe(true);
    });

    it('handles empty selection', () => {
      const selected = selectPhotos(mockRankedPhotos, new Set());
      expect(selected).toHaveLength(0);
    });

    it('handles selecting more photos than available', () => {
      const topIds = selectTopPhotos(mockRankedPhotos, 10);
      expect(topIds.size).toBe(2); // Only 2 photos available
    });
  });

  describe('Cluster Photo Filtering', () => {
    const getClusterPhotos = (
      cluster: PhotoCluster,
      rankedPhotos: RankedPhoto[]
    ): RankedPhoto[] => {
      return rankedPhotos.filter(rp =>
        cluster.photos.some(p => p.id === rp.photo.id)
      );
    };

    it('filters ranked photos by cluster', () => {
      const clusterPhotos = getClusterPhotos(mockCluster, mockRankedPhotos);
      
      expect(clusterPhotos).toHaveLength(2);
      expect(clusterPhotos[0].photo.id).toBe('photo1');
      expect(clusterPhotos[1].photo.id).toBe('photo2');
    });

    it('handles cluster with no matching photos', () => {
      const emptyCluster: PhotoCluster = {
        ...mockCluster,
        photos: []
      };

      const clusterPhotos = getClusterPhotos(emptyCluster, mockRankedPhotos);
      expect(clusterPhotos).toHaveLength(0);
    });
  });

  describe('Statistics Calculation', () => {
    const calculateStats = (result: CurationResult) => {
      const averageScore = result.selectedPhotos.reduce(
        (sum, photo) => sum + photo.score,
        0
      ) / result.selectedPhotos.length;

      const selectionRate = (result.selectedPhotos.length / result.totalPhotos) * 100;

      const topReasons = result.selectedPhotos
        .flatMap(photo => photo.reasoning)
        .reduce((acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const sortedReasons = Object.entries(topReasons)
        .sort(([, a], [, b]) => b - a)
        .map(([reason]) => reason);

      return {
        averageScore,
        selectionRate,
        topReasons: sortedReasons
      };
    };

    it('calculates statistics correctly', () => {
      const stats = calculateStats(mockCurationResult);

      expect(stats.averageScore).toBeCloseTo(0.85); // (0.92 + 0.78) / 2
      expect(stats.selectionRate).toBe(20); // 2 of 10 photos
      expect(stats.topReasons).toContain('Excellent composition');
      expect(stats.topReasons).toContain('High technical quality');
      expect(stats.topReasons).toContain('Good exposure');
    });

    it('handles single photo result', () => {
      const singlePhotoResult: CurationResult = {
        ...mockCurationResult,
        selectedPhotos: [mockRankedPhotos[0]],
        totalPhotos: 5
      };

      const stats = calculateStats(singlePhotoResult);

      expect(stats.averageScore).toBe(0.92);
      expect(stats.selectionRate).toBe(20); // 1 of 5 photos
    });
  });

  describe('Weight Normalization', () => {
    const normalizeWeights = (weights: any): any => {
      const total = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
      const normalized: any = {};
      
      for (const [key, value] of Object.entries(weights)) {
        normalized[key] = (value as number) / total;
      }
      
      return normalized;
    };

    it('normalizes weights to sum to 1', () => {
      const weights = {
        qualityWeight: 0.5,
        compositionWeight: 0.3,
        contentWeight: 0.2,
        uniquenessWeight: 0.1,
        emotionalWeight: 0.1
      };

      const normalized = normalizeWeights(weights);
      const sum = Object.values(normalized).reduce((s: number, w: any) => s + w, 0);

      expect(sum).toBeCloseTo(1.0);
    });

    it('handles equal weights', () => {
      const weights = {
        qualityWeight: 1,
        compositionWeight: 1,
        contentWeight: 1,
        uniquenessWeight: 1,
        emotionalWeight: 1
      };

      const normalized = normalizeWeights(weights);

      Object.values(normalized).forEach(weight => {
        expect(weight).toBeCloseTo(0.2); // 1/5
      });
    });
  });
});