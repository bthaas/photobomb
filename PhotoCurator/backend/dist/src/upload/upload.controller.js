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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const upload_service_1 = require("./upload.service");
const photos_service_1 = require("../photos/photos.service");
let UploadController = class UploadController {
    constructor(uploadService, photosService) {
        this.uploadService = uploadService;
        this.photosService = photosService;
    }
    async uploadPhoto(file, metadata, req) {
        const userId = req.user.id;
        const uploadResult = await this.uploadService.uploadFile(file, userId, 'photos');
        const photo = await this.photosService.create({
            originalFilename: file.originalname,
            s3Key: uploadResult.key,
            s3Bucket: uploadResult.bucket,
            mimeType: file.mimetype,
            fileSize: file.size,
            width: metadata.width ? parseInt(metadata.width) : 0,
            height: metadata.height ? parseInt(metadata.height) : 0,
            exifData: metadata.exifData ? JSON.parse(metadata.exifData) : null,
            location: metadata.location ? JSON.parse(metadata.location) : null,
            takenAt: metadata.takenAt ? new Date(metadata.takenAt) : null,
        }, userId);
        return {
            success: true,
            photo,
            uploadUrl: uploadResult.url,
        };
    }
    async getPresignedUploadUrl(body, req) {
        const userId = req.user.id;
        const { filename, contentType } = body;
        const result = await this.uploadService.generatePresignedUploadUrl(userId, filename, contentType);
        return result;
    }
    async getSignedUrl(photoId, expiresIn, req) {
        const userId = req.user.id;
        const photo = await this.photosService.findById(photoId, userId);
        if (!photo) {
            throw new Error('Photo not found');
        }
        const signedUrl = await this.uploadService.getSignedUrl(photo.s3Key, expiresIn ? parseInt(expiresIn) : 3600);
        return { signedUrl };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Post)('presigned-url'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getPresignedUploadUrl", null);
__decorate([
    (0, common_1.Get)('signed-url/:photoId'),
    __param(0, (0, common_1.Param)('photoId')),
    __param(1, (0, common_1.Query)('expiresIn')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getSignedUrl", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [upload_service_1.UploadService,
        photos_service_1.PhotosService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map