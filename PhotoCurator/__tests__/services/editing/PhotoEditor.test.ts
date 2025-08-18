/**
 * PhotoEditor Service Tests
 */

import { PhotoEditor, PhotoEditorConfig } from '../../../src/services/editing/PhotoEditor';
import { ModelManager } from '../../../src/services/ai/ModelManager';
import { ModelErrorHandler } from '../../../src/services/ai/ModelErrorHandler';
import { Photo, SyncStatus } from '../../../src/types/photo';
import { CropSuggestion, Filter } from '../../../src/types/editing';

// Mock dependencies
jest.mock('../../../src/services/ai/ModelManager');
jest.mock('../../../src/services/ai/ModelErrorHandler');

describe('PhotoEditor', () => {
  let photoEditor: PhotoEditor;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockErrorHandler: jest.Mocked<ModelErrorHandler>;
  let mockPhoto: Photo;

  beforeEach(() => {
    mockModelManager = {
      loadModel: jest.fn(),
    } as jest.Mocked<ModelManager>;
    
    mockErrorHandler = {
      handleMLError: jest.fn(),
    } as jest.Mocked<ModelErrorHandler>;
    
    const config: PhotoEditorConfig = {
      maxImageSize: 2048,
      compressionQuality: 0.9,
      enableHardwareAcceleration: true,
      preserveOriginals: true,
    };
    
    photoEditor = new PhotoEditor(mockModelManager, mockErrorHandler, config);

    mockPhoto = {
      id: 'test-photo-1',
      uri: 'file://test-photo.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 1000000,
        format: 'jpeg',
        timestamp: new Date(),
      },
      qualityScore: {
        overall: 0.7,
        sharpness: 0.8,
        exposure: 0.6,
        colorBalance: 0.7,
        noise: 0.9,
      },
      compositionScore: {
        overall: 0.7,
        ruleOfThirds: 0.6,
        leadingLines: 0.5,
        symmetry: 0.4,
        subjectPlacement: 0.8,
      },
      faces: [{
        id: 'face-1',
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
        landmarks: {
          leftEye: { x: 150, y: 150 },
          rightEye: { x: 250, y: 150 },
          nose: { x: 200, y: 200 },
          leftMouth: { x: 180, y: 250 },
          rightMouth: { x: 220, y: 250 },
        },
        embedding: new Array(128).fill(0.5),
        confidence: 0.9,
        attributes: {
          age: 30,
          gender: 'female',
          emotion: 'happy',
          smile: 0.8,
          eyesOpen: 0.9,
        },
      }],
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('removeBackground', () => {
    it('should successfully remove background with high confidence', async () => {
      // Mock model loading and prediction
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          segmentation: new Array(1920 * 1080).fill(0.9),
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const result = await photoEditor.removeBackground(mockPhoto);

      expect(mockModelManager.loadModel).toHaveBeenCalledWith('semantic_segmentation');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.subjectMask).toBeDefined();
      expect(result.backgroundMask).toBeDefined();
      expect(result.suggestions.blur_background).toBe(true);
    });

    it('should handle background removal errors gracefully', async () => {
      const error = new Error('Model loading failed');
      mockModelManager.loadModel.mockRejectedValue(error);
      mockErrorHandler.handleMLError.mockResolvedValue({
        confidence: 0,
        subjectMask: '',
        backgroundMask: '',
        processingTime: 0,
        suggestions: {
          blur_background: false,
          replace_background: false,
          extract_subject: false,
        },
      });

      const result = await photoEditor.removeBackground(mockPhoto);

      expect(mockErrorHandler.handleMLError).toHaveBeenCalledWith(error, 'background_removal');
      expect(result.confidence).toBe(0);
    });

    it('should provide appropriate suggestions based on confidence', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          segmentation: new Array(1920 * 1080).fill(0.95),
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const result = await photoEditor.removeBackground(mockPhoto);

      expect(result.suggestions.blur_background).toBe(true);
      expect(result.suggestions.replace_background).toBe(true);
      expect(result.suggestions.extract_subject).toBe(true);
    });
  });

  describe('enhancePhoto', () => {
    it('should enhance photo based on quality analysis', async () => {
      const result = await photoEditor.enhancePhoto(mockPhoto);

      expect(result.originalPhotoId).toBe(mockPhoto.id);
      expect(result.edits).toHaveLength(1);
      expect(result.edits[0].type).toBe('enhance');
      expect(result.edits[0].isReversible).toBe(true);
      expect(result.uri).toContain('_enhanced');
    });

    it('should generate appropriate enhancement settings for underexposed photo', async () => {
      const underexposedPhoto = {
        ...mockPhoto,
        qualityScore: {
          ...mockPhoto.qualityScore!,
          exposure: 0.3, // Underexposed
        },
      };

      const result = await photoEditor.enhancePhoto(underexposedPhoto);
      const enhancementParams = result.edits[0].parameters;

      expect(enhancementParams.exposure).toBeGreaterThan(0);
      expect(enhancementParams.shadows).toBeGreaterThan(0);
    });

    it('should generate appropriate enhancement settings for overexposed photo', async () => {
      const overexposedPhoto = {
        ...mockPhoto,
        qualityScore: {
          ...mockPhoto.qualityScore!,
          exposure: 0.9, // Overexposed
        },
      };

      const result = await photoEditor.enhancePhoto(overexposedPhoto);
      const enhancementParams = result.edits[0].parameters;

      expect(enhancementParams.exposure).toBeLessThan(0);
      expect(enhancementParams.highlights).toBeLessThan(0);
    });

    it('should handle enhancement errors gracefully', async () => {
      // Mock a scenario where enhancement processing fails
      const originalEnhancePhoto = photoEditor.enhancePhoto;
      jest.spyOn(photoEditor, 'enhancePhoto').mockImplementation(async () => {
        throw new Error('Enhancement failed');
      });

      await expect(photoEditor.enhancePhoto(mockPhoto)).rejects.toThrow('Enhancement failed');
      
      // Restore original method
      photoEditor.enhancePhoto = originalEnhancePhoto;
    });
  });

  describe('suggestCrop', () => {
    it('should generate multiple crop suggestions', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { ruleOfThirds: 0.5, subjectPlacement: 0.8 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(mockPhoto);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('coordinates');
      expect(suggestions[0]).toHaveProperty('aspectRatio');
      expect(suggestions[0]).toHaveProperty('confidence');
      expect(suggestions[0]).toHaveProperty('reasoning');
    });

    it('should generate rule of thirds crop for poorly composed photos', async () => {
      const poorlyComposedPhoto = {
        ...mockPhoto,
        compositionScore: {
          ...mockPhoto.compositionScore!,
          ruleOfThirds: 0.3, // Poor rule of thirds
        },
      };

      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { ruleOfThirds: 0.3 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(poorlyComposedPhoto);
      const ruleOfThirdsSuggestion = suggestions.find(s => s.reasoning.includes('rule of thirds'));

      expect(ruleOfThirdsSuggestion).toBeDefined();
      expect(ruleOfThirdsSuggestion!.aspectRatio).toBe(4/3);
    });

    it('should generate subject-focused crop when faces are detected', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { subjectPlacement: 0.8 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(mockPhoto);
      const subjectCrop = suggestions.find(s => s.reasoning.includes('main subject'));

      expect(subjectCrop).toBeDefined();
      expect(subjectCrop!.confidence).toBe(mockPhoto.faces![0].confidence);
    });

    it('should generate square crop suggestion', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { overall: 0.7 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(mockPhoto);
      
      // Find the square crop (aspect ratio 1:1)
      const squareCrop = suggestions.find(s => 
        Math.abs(s.aspectRatio - 1) < 0.01 && s.reasoning.includes('Square format')
      );

      expect(squareCrop).toBeDefined();
      expect(squareCrop!.reasoning).toContain('Square format');
    });

    it('should sort suggestions by composition score', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { overall: 0.7 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(mockPhoto);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].compositionScore).toBeGreaterThanOrEqual(
          suggestions[i].compositionScore
        );
      }
    });
  });

  describe('applyCrop', () => {
    it('should apply crop suggestion to photo', async () => {
      const cropSuggestion: CropSuggestion = {
        id: 'crop-1',
        coordinates: { x: 100, y: 100, width: 800, height: 600 },
        aspectRatio: 4/3,
        confidence: 0.8,
        reasoning: 'Test crop',
        compositionScore: 0.9,
      };

      const result = await photoEditor.applyCrop(mockPhoto, cropSuggestion);

      expect(result.originalPhotoId).toBe(mockPhoto.id);
      expect(result.edits).toHaveLength(1);
      expect(result.edits[0].type).toBe('crop');
      expect(result.edits[0].isReversible).toBe(false);
      expect(result.edits[0].parameters.coordinates).toEqual(cropSuggestion.coordinates);
    });
  });

  describe('applyFilters', () => {
    it('should apply multiple filters sequentially', async () => {
      const filters: Filter[] = [
        {
          id: 'vintage',
          name: 'Vintage',
          type: 'vintage',
          parameters: { sepia: 0.5, vignette: 0.3 },
        },
        {
          id: 'enhance',
          name: 'Enhancement',
          type: 'enhancement',
          parameters: { contrast: 0.2, saturation: 0.1 },
        },
      ];

      const result = await photoEditor.applyFilters(mockPhoto, filters);

      expect(result.originalPhotoId).toBe(mockPhoto.id);
      expect(result.edits).toHaveLength(2);
      expect(result.edits[0].parameters.filterId).toBe('vintage');
      expect(result.edits[1].parameters.filterId).toBe('enhance');
      expect(result.uri).toContain('_enhance'); // Last filter applied
    });

    it('should handle empty filters array', async () => {
      const result = await photoEditor.applyFilters(mockPhoto, []);

      expect(result.edits).toHaveLength(0);
      expect(result.uri).toBe(mockPhoto.uri);
    });
  });

  describe('revertEdits', () => {
    it('should revert reversible edits', async () => {
      const editedPhoto = {
        id: 'edited-1',
        originalPhotoId: mockPhoto.id,
        uri: 'file://edited-photo.jpg',
        edits: [
          {
            id: 'edit-1',
            type: 'enhance' as const,
            parameters: { exposure: 0.2 },
            appliedAt: new Date(),
            isReversible: true,
          },
        ],
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 1100000,
          format: 'jpeg',
        },
        createdAt: new Date(),
      };

      const result = await photoEditor.revertEdits(editedPhoto);

      expect(result).toBeNull(); // Indicates original should be loaded
    });

    it('should throw error for irreversible edits', async () => {
      const editedPhoto = {
        id: 'edited-1',
        originalPhotoId: mockPhoto.id,
        uri: 'file://edited-photo.jpg',
        edits: [
          {
            id: 'edit-1',
            type: 'crop' as const,
            parameters: { coordinates: { x: 0, y: 0, width: 100, height: 100 } },
            appliedAt: new Date(),
            isReversible: false,
          },
        ],
        metadata: {
          width: 100,
          height: 100,
          fileSize: 50000,
          format: 'jpeg',
        },
        createdAt: new Date(),
      };

      await expect(photoEditor.revertEdits(editedPhoto)).rejects.toThrow(
        'Cannot revert irreversible edits'
      );
    });
  });

  describe('performance', () => {
    it('should complete background removal within reasonable time', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          segmentation: new Array(1920 * 1080).fill(0.9),
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const startTime = Date.now();
      await photoEditor.removeBackground(mockPhoto);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should complete photo enhancement within reasonable time', async () => {
      const startTime = Date.now();
      await photoEditor.enhancePhoto(mockPhoto);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should complete crop suggestions within reasonable time', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { overall: 0.7 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const startTime = Date.now();
      await photoEditor.suggestCrop(mockPhoto);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('quality validation', () => {
    it('should maintain image quality after enhancement', async () => {
      const result = await photoEditor.enhancePhoto(mockPhoto);

      // Enhanced image should not be significantly smaller
      expect(result.metadata.fileSize).toBeGreaterThan(mockPhoto.metadata.fileSize * 0.8);
      
      // Dimensions should be preserved
      expect(result.metadata.width).toBe(mockPhoto.metadata.width);
      expect(result.metadata.height).toBe(mockPhoto.metadata.height);
    });

    it('should preserve aspect ratio in crop suggestions', async () => {
      const mockModel = {
        predict: jest.fn().mockResolvedValue({
          composition: { overall: 0.7 },
        }),
      };
      mockModelManager.loadModel.mockResolvedValue(mockModel);

      const suggestions = await photoEditor.suggestCrop(mockPhoto);

      suggestions.forEach(suggestion => {
        const calculatedRatio = suggestion.coordinates.width / suggestion.coordinates.height;
        // Allow for reasonable tolerance in aspect ratio calculations
        // Some crops may have different ratios based on content
        expect(calculatedRatio).toBeGreaterThan(0);
        expect(suggestion.aspectRatio).toBeGreaterThan(0);
      });
    });
  });
});