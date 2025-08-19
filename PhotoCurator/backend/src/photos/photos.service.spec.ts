import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PhotosService } from './photos.service';
import { Photo } from '../entities/photo.entity';

describe('PhotosService', () => {
  let service: PhotosService;
  let repository: Repository<Photo>;

  const mockPhoto: Photo = {
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        {
          provide: getRepositoryToken(Photo),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    repository = module.get<Repository<Photo>>(getRepositoryToken(Photo));
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
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25)  // curated
        .mockResolvedValueOnce(80)  // analyzed
        .mockResolvedValueOnce(90); // synced

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