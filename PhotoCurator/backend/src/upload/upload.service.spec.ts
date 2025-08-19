import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

import { UploadService } from './upload.service';

// Mock AWS SDK
jest.mock('aws-sdk');

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  const mockS3 = {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    getSignedUrlPromise: jest.fn(),
    deleteObject: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock AWS.S3 constructor
    (AWS.S3 as jest.MockedClass<typeof AWS.S3>).mockImplementation(() => mockS3 as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file to S3 and return result', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockUploadResult = {
        Location: 'https://s3.amazonaws.com/bucket/key',
      };

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockUploadResult),
      });

      const result = await service.uploadFile(mockFile, 'user1');

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url', mockUploadResult.Location);
      expect(result).toHaveProperty('bucket');
      expect(mockS3.upload).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for file access', async () => {
      const mockSignedUrl = 'https://s3.amazonaws.com/bucket/key?signature=abc';
      mockS3.getSignedUrl.mockReturnValue(mockSignedUrl);

      const result = await service.getSignedUrl('test-key');

      expect(result).toBe(mockSignedUrl);
      expect(mockS3.getSignedUrl).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: 'test-key',
        Expires: 3600,
      });
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      const mockUploadUrl = 'https://s3.amazonaws.com/bucket/key?upload=true';
      mockS3.getSignedUrlPromise.mockResolvedValue(mockUploadUrl);

      const result = await service.generatePresignedUploadUrl(
        'user1',
        'test.jpg',
        'image/jpeg',
      );

      expect(result).toHaveProperty('uploadUrl', mockUploadUrl);
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('fields');
    });
  });
});