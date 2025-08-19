"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const AWS = require("aws-sdk");
const upload_service_1 = require("./upload.service");
jest.mock('aws-sdk');
describe('UploadService', () => {
    let service;
    let configService;
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                upload_service_1.UploadService,
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();
        service = module.get(upload_service_1.UploadService);
        configService = module.get(config_1.ConfigService);
        AWS.S3.mockImplementation(() => mockS3);
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
            };
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
            const result = await service.generatePresignedUploadUrl('user1', 'test.jpg', 'image/jpeg');
            expect(result).toHaveProperty('uploadUrl', mockUploadUrl);
            expect(result).toHaveProperty('key');
            expect(result).toHaveProperty('fields');
        });
    });
});
//# sourceMappingURL=upload.service.spec.js.map