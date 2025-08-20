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
exports.PhotoController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const ai_service_1 = require("../ai/ai.service");
let PhotoController = class PhotoController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async analyzePhotos(files) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No photos provided');
        }
        if (files.length < 2) {
            throw new common_1.BadRequestException('At least 2 photos are required for comparison');
        }
        if (files.length > 20) {
            throw new common_1.BadRequestException('Maximum 20 photos allowed');
        }
        try {
            const imageBuffers = files.map(file => file.buffer);
            const result = await this.aiService.analyzeBestPhoto(imageBuffers);
            if (result.bestPhotoIndex < 0 || result.bestPhotoIndex >= files.length) {
                throw new Error('Invalid photo index returned from AI');
            }
            return {
                success: true,
                bestPhotoIndex: result.bestPhotoIndex,
                reasoning: result.reasoning,
                totalPhotos: files.length,
                selectedPhoto: {
                    originalName: files[result.bestPhotoIndex].originalname,
                    size: files[result.bestPhotoIndex].size,
                    mimeType: files[result.bestPhotoIndex].mimetype,
                },
            };
        }
        catch (error) {
            console.error('Photo analysis error:', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({
                success: false,
                message: 'Failed to analyze photos',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async healthCheck() {
        return {
            success: true,
            message: 'AI Photo Curator backend is running',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.PhotoController = PhotoController;
__decorate([
    (0, common_1.Post)('analyze'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 20, {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only image files are allowed'), false);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], PhotoController.prototype, "analyzePhotos", null);
__decorate([
    (0, common_1.Post)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PhotoController.prototype, "healthCheck", null);
exports.PhotoController = PhotoController = __decorate([
    (0, common_1.Controller)('photo'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], PhotoController);
//# sourceMappingURL=photo.controller.js.map