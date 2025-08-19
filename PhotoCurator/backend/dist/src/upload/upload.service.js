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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const AWS = require("aws-sdk");
let UploadService = class UploadService {
    constructor(configService) {
        this.configService = configService;
        this.s3 = new AWS.S3({
            accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
            region: this.configService.get('AWS_REGION') || 'us-east-1',
        });
        this.bucketName = this.configService.get('S3_BUCKET_NAME') || 'photo-curator-uploads';
    }
    async uploadFile(file, userId, folder = 'photos') {
        const fileExtension = file.originalname.split('.').pop();
        const key = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        const uploadParams = {
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'private',
            Metadata: {
                originalName: file.originalname,
                uploadedBy: userId,
                uploadedAt: new Date().toISOString(),
            },
        };
        const result = await this.s3.upload(uploadParams).promise();
        return {
            key,
            url: result.Location,
            bucket: this.bucketName,
        };
    }
    async getSignedUrl(key, expiresIn = 3600) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Expires: expiresIn,
        };
        return this.s3.getSignedUrl('getObject', params);
    }
    async deleteFile(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
        };
        await this.s3.deleteObject(params).promise();
    }
    async generatePresignedUploadUrl(userId, filename, contentType, folder = 'photos') {
        const fileExtension = filename.split('.').pop();
        const key = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        const params = {
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
            ACL: 'private',
            Expires: 300,
        };
        const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);
        return {
            uploadUrl,
            key,
            fields: {
                'Content-Type': contentType,
                'x-amz-acl': 'private',
            },
        };
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map