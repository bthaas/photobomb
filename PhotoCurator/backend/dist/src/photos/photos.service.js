"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const photo_entity_1 = require("../entities/photo.entity");
let PhotosService = class PhotosService {
    constructor(photosRepository) {
        this.photosRepository = photosRepository;
    }
    async create(createPhotoInput, userId) {
        const photo = this.photosRepository.create({
            ...createPhotoInput,
            userId,
        });
        return this.photosRepository.save(photo);
    }
    async findAll(userId, filter) {
        const queryBuilder = this.photosRepository
            .createQueryBuilder('photo')
            .where('photo.userId = :userId', { userId })
            .andWhere('photo.isDeleted = false');
        if (filter?.isCurated !== undefined) {
            queryBuilder.andWhere('photo.isCurated = :isCurated', {
                isCurated: filter.isCurated
            });
        }
        if (filter?.clusterId) {
            queryBuilder.andWhere('photo.clusterId = :clusterId', {
                clusterId: filter.clusterId
            });
        }
        if (filter?.minQualityScore) {
            queryBuilder.andWhere('photo.qualityScore >= :minQualityScore', {
                minQualityScore: filter.minQualityScore
            });
        }
        if (filter?.dateFrom) {
            queryBuilder.andWhere('photo.takenAt >= :dateFrom', {
                dateFrom: filter.dateFrom
            });
        }
        if (filter?.dateTo) {
            queryBuilder.andWhere('photo.takenAt <= :dateTo', {
                dateTo: filter.dateTo
            });
        }
        return queryBuilder
            .orderBy('photo.takenAt', 'DESC')
            .limit(filter?.limit || 100)
            .offset(filter?.offset || 0)
            .getMany();
    }
    async findById(id, userId) {
        return this.photosRepository.findOne({
            where: { id, userId, isDeleted: false },
        });
    }
    async findSimilar(photoId, userId, limit = 10) {
        const photo = await this.findById(photoId, userId);
        if (!photo || !photo.embedding) {
            return [];
        }
        return [];
    }
    async update(id, updatePhotoInput, userId) {
        await this.photosRepository.update({ id, userId }, updatePhotoInput);
        return this.findById(id, userId);
    }
    async updateAnalysis(id, analysisData, userId) {
        const updateData = {
            ...analysisData,
            embedding: analysisData.embedding ? JSON.stringify(analysisData.embedding) : undefined,
        };
        await this.photosRepository.update({ id, userId }, updateData);
        return this.findById(id, userId);
    }
    async markAsCurated(ids, userId) {
        await this.photosRepository.update({ id: { $in: ids }, userId }, { isCurated: true });
    }
    async softDelete(id, userId) {
        await this.photosRepository.update({ id, userId }, { isDeleted: true });
    }
    async getPhotoStats(userId) {
        const [total, curated, analyzed, synced] = await Promise.all([
            this.photosRepository.count({ where: { userId, isDeleted: false } }),
            this.photosRepository.count({ where: { userId, isDeleted: false, isCurated: true } }),
            this.photosRepository.count({
                where: { userId, isDeleted: false, qualityScore: { $ne: null } }
            }),
            this.photosRepository.count({
                where: { userId, isDeleted: false, syncStatus: 'synced' }
            }),
        ]);
        return { total, curated, analyzed, synced };
    }
};
exports.PhotosService = PhotosService;
exports.PhotosService = PhotosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(photo_entity_1.Photo)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PhotosService);
//# sourceMappingURL=photos.service.js.map