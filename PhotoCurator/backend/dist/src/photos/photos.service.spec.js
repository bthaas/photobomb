"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const photos_service_1 = require("./photos.service");
const photo_entity_1 = require("../entities/photo.entity");
describe('PhotosService', () => {
    let service;
    let repository;
    const mockPhoto = {
        id: '1',
        originalFilename: 'test.jpg',
        s3Key: 'photos/user1/test.jpg',
        s3Bucket: 'test-bucket',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        width: 800,
        height: 600,
        userId: 'user1',
        syncStatus: 'pending',
        isCurated: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null,
    };
    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                photos_service_1.PhotosService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(photo_entity_1.Photo),
                    useValue: mockRepository,
                },
            ],
        }).compile();
        service = module.get(photos_service_1.PhotosService);
        repository = module.get((0, typeorm_1.getRepositoryToken)(photo_entity_1.Photo));
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('create', () => {
        it('should create and save a photo', async () => {
            const createPhotoInput = {
                originalFilename: 'test.jpg',
                s3Key: 'photos/user1/test.jpg',
                s3Bucket: 'test-bucket',
                mimeType: 'image/jpeg',
                fileSize: 1024,
                width: 800,
                height: 600,
            };
            mockRepository.create.mockReturnValue(mockPhoto);
            mockRepository.save.mockResolvedValue(mockPhoto);
            const result = await service.create(createPhotoInput, 'user1');
            expect(result).toEqual(mockPhoto);
            expect(mockRepository.create).toHaveBeenCalledWith({
                ...createPhotoInput,
                userId: 'user1',
            });
            expect(mockRepository.save).toHaveBeenCalledWith(mockPhoto);
        });
    });
    describe('findById', () => {
        it('should find photo by id and userId', async () => {
            mockRepository.findOne.mockResolvedValue(mockPhoto);
            const result = await service.findById('1', 'user1');
            expect(result).toEqual(mockPhoto);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: '1', userId: 'user1', isDeleted: false },
            });
        });
        it('should return null if photo not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            const result = await service.findById('nonexistent', 'user1');
            expect(result).toBeNull();
        });
    });
    describe('getPhotoStats', () => {
        it('should return photo statistics', async () => {
            mockRepository.count
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(25)
                .mockResolvedValueOnce(80)
                .mockResolvedValueOnce(90);
            const result = await service.getPhotoStats('user1');
            expect(result).toEqual({
                total: 100,
                curated: 25,
                analyzed: 80,
                synced: 90,
            });
        });
    });
});
//# sourceMappingURL=photos.service.spec.js.map