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
exports.PhotosResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const photos_service_1 = require("./photos.service");
const photo_entity_1 = require("../entities/photo.entity");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_photo_input_1 = require("./dto/create-photo.input");
const update_photo_input_1 = require("./dto/update-photo.input");
const photos_filter_input_1 = require("./dto/photos-filter.input");
const photo_stats_response_1 = require("./dto/photo-stats.response");
let PhotosResolver = class PhotosResolver {
    constructor(photosService) {
        this.photosService = photosService;
    }
    async photos(filter, context) {
        const userId = context.req.user.id;
        return this.photosService.findAll(userId, filter);
    }
    async photo(id, context) {
        const userId = context.req.user.id;
        return this.photosService.findById(id, userId);
    }
    async similarPhotos(photoId, limit, context) {
        const userId = context.req.user.id;
        return this.photosService.findSimilar(photoId, userId, limit);
    }
    async photoStats(context) {
        const userId = context.req.user.id;
        return this.photosService.getPhotoStats(userId);
    }
    async createPhoto(createPhotoInput, context) {
        const userId = context.req.user.id;
        return this.photosService.create(createPhotoInput, userId);
    }
    async updatePhoto(id, updatePhotoInput, context) {
        const userId = context.req.user.id;
        return this.photosService.update(id, updatePhotoInput, userId);
    }
    async markPhotosAsCurated(ids, context) {
        const userId = context.req.user.id;
        await this.photosService.markAsCurated(ids, userId);
        return true;
    }
    async deletePhoto(id, context) {
        const userId = context.req.user.id;
        await this.photosService.softDelete(id, userId);
        return true;
    }
};
exports.PhotosResolver = PhotosResolver;
__decorate([
    (0, graphql_1.Query)(() => [photo_entity_1.Photo]),
    __param(0, (0, graphql_1.Args)('filter', { nullable: true })),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [photos_filter_input_1.PhotosFilterInput, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "photos", null);
__decorate([
    (0, graphql_1.Query)(() => photo_entity_1.Photo, { nullable: true }),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "photo", null);
__decorate([
    (0, graphql_1.Query)(() => [photo_entity_1.Photo]),
    __param(0, (0, graphql_1.Args)('photoId')),
    __param(1, (0, graphql_1.Args)('limit', { defaultValue: 10 })),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "similarPhotos", null);
__decorate([
    (0, graphql_1.Query)(() => photo_stats_response_1.PhotoStatsResponse),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "photoStats", null);
__decorate([
    (0, graphql_1.Mutation)(() => photo_entity_1.Photo),
    __param(0, (0, graphql_1.Args)('createPhotoInput')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_photo_input_1.CreatePhotoInput, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "createPhoto", null);
__decorate([
    (0, graphql_1.Mutation)(() => photo_entity_1.Photo),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('updatePhotoInput')),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_photo_input_1.UpdatePhotoInput, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "updatePhoto", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('ids', { type: () => [String] })),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "markPhotosAsCurated", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PhotosResolver.prototype, "deletePhoto", null);
exports.PhotosResolver = PhotosResolver = __decorate([
    (0, graphql_1.Resolver)(() => photo_entity_1.Photo),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [photos_service_1.PhotosService])
], PhotosResolver);
//# sourceMappingURL=photos.resolver.js.map