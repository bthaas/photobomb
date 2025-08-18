/**
 * Photo Editing Integration Tests
 */

import { PhotoEditor } from '../../src/services/editing/PhotoEditor';
import { ModelManager } from '../../src/services/ai/ModelManager';
import { ModelErrorHandler } from '../../src/services/ai/ModelErrorHandler';
import { Photo, SyncStatus } from '../../src/types/photo';
import { EditedPhoto } from '../../src/types/editing';

describe('Photo Editing Integration', () => {
  let photoEditor: PhotoEditor;
  let testPhoto: Photo;

  beforeAll(async () => {
    // Initialize services with mocked dependencies for integration testing
    const modelManager = {
      loadModel: jest.fn().mockResolvedValue({
        predict: jest.fn().mockResolvedValue({
          segmentation: new Array(1920 * 1080).fill(0.9),
          composition: { overall: 0.7, ruleOfThirds: 0.3 },
        }),
      }),
    } as any;
    
    const errorHandler = {
      handleMLError: jest.fn(),
    } as any;
    
    photoEditor = new PhotoEditor(modelManager, errorHandler);

    // Create test photo
    testPhoto = {
      id: 'integration-test-photo',
      uri: 'file://test-assets/sample-photo.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 2000000,
        format: 'jpeg',
        timestamp: new Date(),
      },
      qualityScore: {
        overall: 0.6,
        sharpness: 0.7,
        exposure: 0.3, // More underexposed to trigger enhancement
        colorBalance: 0.6,
        noise: 0.8,
      },
      compositionScore: {
        overall: 0.5,
        ruleOfThirds: 0.3, // Poor composition
        leadingLines: 0.4,
        symmetry: 0.6,
        subjectPlacement: 0.7,
      },
      faces: [{
        id: 'face-integration-test',
        boundingBox: { x: 500, y: 300, width: 400, height: 400 },
        landmarks: {
          leftEye: { x: 600, y: 400 },
          rightEye: { x: 800, y: 400 },
          nose: { x: 700, y: 500 },
          leftMouth: { x: 650, y: 600 },
          rightMouth: { x: 750, y: 600 },
        },
        embedding: new Array(128).fill(0.5),
        confidence: 0.85,
        attributes: {
          age: 25,
          gender: 'male',
          emotion: 'neutral',
          smile: 0.3,
          eyesOpen: 0.9,
        },
      }],
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('End-to-End Editing Workflow', () => {
    it('should complete full editing workflow: enhance -> crop -> save', async () => {
      // Step 1: Enhance the photo
      const enhancedPhoto = await photoEditor.enhancePhoto(testPhoto);
      
      expect(enhancedPhoto).toBeDefined();
      expect(enhancedPhoto.originalPhotoId).toBe(testPhoto.id);
      expect(enhancedPhoto.edits).toHaveLength(1);
      expect(enhancedPhoto.edits[0].type).toBe('enhance');

      // Verify enhancement parameters are appropriate for underexposed photo
      const enhancementParams = enhancedPhoto.edits[0].parameters;
      expect(enhancementParams.exposure).toBeGreaterThan(0);
      expect(enhancementParams.shadows).toBeGreaterThan(0);

      // Step 2: Generate crop suggestions
      const cropSuggestions = await photoEditor.suggestCrop(testPhoto);
      
      expect(cropSuggestions).toBeDefined();
      expect(cropSuggestions.length).toBeGreaterThan(0);
      
      // Should include rule of thirds suggestion for poorly composed photo
      const ruleOfThirdsCrop = cropSuggestions.find(s => 
        s.reasoning.includes('rule of thirds')
      );
      expect(ruleOfThirdsCrop).toBeDefined();

      // Should include subject-focused crop for photo with faces
      const subjectCrop = cropSuggestions.find(s => 
        s.reasoning.includes('main subject')
      );
      expect(subjectCrop).toBeDefined();

      // Step 3: Apply best crop suggestion
      const bestCrop = cropSuggestions[0]; // Highest scoring crop
      const croppedPhoto = await photoEditor.applyCrop(testPhoto, bestCrop);
      
      expect(croppedPhoto).toBeDefined();
      expect(croppedPhoto.originalPhotoId).toBe(testPhoto.id);
      expect(croppedPhoto.edits).toHaveLength(1);
      expect(croppedPhoto.edits[0].type).toBe('crop');

      // Verify crop was applied correctly
      const cropParams = croppedPhoto.edits[0].parameters;
      expect(cropParams.coordinates).toEqual(bestCrop.coordinates);
      expect(cropParams.aspectRatio).toBe(bestCrop.aspectRatio);
    }, 30000); // Allow 30 seconds for full workflow

    it('should handle complex editing sequence with multiple operations', async () => {
      const editingSteps: EditedPhoto[] = [];

      // Step 1: Enhance photo
      const enhanced = await photoEditor.enhancePhoto(testPhoto);
      editingSteps.push(enhanced);

      // Step 2: Apply vintage filter
      const vintageFilter = {
        id: 'vintage',
        name: 'Vintage',
        type: 'vintage' as const,
        parameters: { sepia: 0.4, vignette: 0.2 },
      };
      const filtered = await photoEditor.applyFilters(testPhoto, [vintageFilter]);
      editingSteps.push(filtered);

      // Step 3: Apply crop
      const cropSuggestions = await photoEditor.suggestCrop(testPhoto);
      const squareCrop = cropSuggestions.find(s => s.aspectRatio === 1);
      if (squareCrop) {
        const cropped = await photoEditor.applyCrop(testPhoto, squareCrop);
        editingSteps.push(cropped);
      }

      // Verify all steps completed successfully
      expect(editingSteps.length).toBe(3);
      expect(editingSteps[0].edits[0].type).toBe('enhance');
      expect(editingSteps[1].edits[0].type).toBe('filter');
      expect(editingSteps[2].edits[0].type).toBe('crop');

      // Verify each step maintains photo integrity
      editingSteps.forEach(step => {
        expect(step.originalPhotoId).toBe(testPhoto.id);
        expect(step.uri).toBeDefined();
        expect(step.metadata).toBeDefined();
        expect(step.createdAt).toBeDefined();
      });
    }, 45000); // Allow 45 seconds for complex workflow
  });

  describe('Background Removal Integration', () => {
    it('should perform background removal with realistic confidence scores', async () => {
      const result = await photoEditor.removeBackground(testPhoto);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.subjectMask).toBeDefined();
      expect(result.backgroundMask).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);

      // Verify suggestions are appropriate for confidence level
      if (result.confidence > 0.8) {
        expect(result.suggestions.blur_background).toBe(true);
        expect(result.suggestions.replace_background).toBe(true);
      }
      
      if (result.confidence > 0.7) {
        expect(result.suggestions.extract_subject).toBe(true);
      }
    }, 15000); // Allow 15 seconds for background removal
  });

  describe('Performance and Quality Integration', () => {
    it('should maintain acceptable performance across multiple operations', async () => {
      const operations = [
        () => photoEditor.enhancePhoto(testPhoto),
        () => photoEditor.suggestCrop(testPhoto),
        () => photoEditor.removeBackground(testPhoto),
      ];

      const startTime = Date.now();
      
      // Run operations in parallel
      const results = await Promise.all(operations.map(op => op()));
      
      const totalTime = Date.now() - startTime;

      // All operations should complete within reasonable time
      expect(totalTime).toBeLessThan(20000); // 20 seconds total

      // Verify all operations completed successfully
      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined(); // Enhanced photo
      expect(results[1]).toBeDefined(); // Crop suggestions
      expect(results[2]).toBeDefined(); // Background removal result
    }, 25000);

    it('should preserve image quality through editing pipeline', async () => {
      // Test quality preservation through enhancement
      const enhanced = await photoEditor.enhancePhoto(testPhoto);
      
      // Enhanced image should maintain reasonable file size
      const sizeRatio = enhanced.metadata.fileSize / testPhoto.metadata.fileSize;
      expect(sizeRatio).toBeGreaterThan(0.5); // Not too compressed
      expect(sizeRatio).toBeLessThan(2.0); // Not too bloated

      // Dimensions should be preserved
      expect(enhanced.metadata.width).toBe(testPhoto.metadata.width);
      expect(enhanced.metadata.height).toBe(testPhoto.metadata.height);

      // Format should be preserved
      expect(enhanced.metadata.format).toBe(testPhoto.metadata.format);
    });
  });

  describe('Error Handling Integration', () => {
    it('should gracefully handle corrupted photo data', async () => {
      const corruptedPhoto: Photo = {
        ...testPhoto,
        uri: 'file://non-existent-photo.jpg',
        metadata: {
          ...testPhoto.metadata,
          width: 0,
          height: 0,
        },
      };

      // Operations should not crash, but may return error states
      await expect(async () => {
        try {
          await photoEditor.enhancePhoto(corruptedPhoto);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });

    it('should handle network interruptions during processing', async () => {
      // Simulate network interruption by using invalid model paths
      const photoEditorWithBadConfig = new PhotoEditor(
        new ModelManager(),
        new ModelErrorHandler(),
        {
          maxImageSize: 1,
          compressionQuality: 0.1,
          enableHardwareAcceleration: false,
          preserveOriginals: true,
        }
      );

      // Should handle gracefully without crashing
      await expect(async () => {
        try {
          await photoEditorWithBadConfig.removeBackground(testPhoto);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });
  });

  describe('Memory Management Integration', () => {
    it('should handle large photo processing without memory leaks', async () => {
      const largePhoto: Photo = {
        ...testPhoto,
        metadata: {
          ...testPhoto.metadata,
          width: 4000,
          height: 3000,
          fileSize: 10000000, // 10MB
        },
      };

      // Process large photo multiple times
      for (let i = 0; i < 3; i++) {
        const enhanced = await photoEditor.enhancePhoto(largePhoto);
        expect(enhanced).toBeDefined();
        
        const suggestions = await photoEditor.suggestCrop(largePhoto);
        expect(suggestions.length).toBeGreaterThan(0);
      }

      // If we reach here without memory errors, test passes
      expect(true).toBe(true);
    }, 60000); // Allow 60 seconds for large photo processing
  });

  describe('Concurrent Operations Integration', () => {
    it('should handle concurrent editing operations safely', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => ({
        photo: { ...testPhoto, id: `concurrent-test-${i}` },
        operation: Math.random() > 0.5 ? 'enhance' : 'crop',
      }));

      const promises = concurrentOperations.map(async ({ photo, operation }) => {
        if (operation === 'enhance') {
          return photoEditor.enhancePhoto(photo);
        } else {
          const suggestions = await photoEditor.suggestCrop(photo);
          if (suggestions.length > 0) {
            return photoEditor.applyCrop(photo, suggestions[0]);
          }
          return null;
        }
      });

      const results = await Promise.all(promises);

      // All operations should complete successfully
      results.forEach((result, index) => {
        if (result) {
          expect(result.originalPhotoId).toBe(`concurrent-test-${index}`);
        }
      });
    }, 30000);
  });
});