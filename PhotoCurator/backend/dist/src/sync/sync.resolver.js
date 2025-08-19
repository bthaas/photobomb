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
exports.SyncResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const sync_metadata_input_1 = require("./dto/sync-metadata.input");
const batch_sync_input_1 = require("./dto/batch-sync.input");
const batch_sync_response_1 = require("./dto/batch-sync.response");
const sync_status_response_1 = require("./dto/sync-status.response");
let SyncResolver = class SyncResolver {
    constructor(syncService) {
        this.syncService = syncService;
    }
    async syncPhotoMetadata(photoId, metadata, context) {
        const userId = context.req.user.id;
        return this.syncService.syncPhotoMetadata(photoId, metadata, userId);
    }
    async batchSyncMetadata(syncData, context) {
        const userId = context.req.user.id;
        return this.syncService.batchSyncMetadata(syncData.items, userId);
    }
    async syncStatus(context) {
        const userId = context.req.user.id;
        return this.syncService.getSyncStatus(userId);
    }
    async markPhotosForSync(photoIds, context) {
        const userId = context.req.user.id;
        return this.syncService.markPhotosForSync(photoIds, userId);
    }
    async curatedPhotosForSync(context) {
        const userId = context.req.user.id;
        return this.syncService.getCuratedPhotosForSync(userId);
    }
};
exports.SyncResolver = SyncResolver;
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('photoId')),
    __param(1, (0, graphql_1.Args)('metadata')),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sync_metadata_input_1.SyncMetadataInput, Object]),
    __metadata("design:returntype", Promise)
], SyncResolver.prototype, "syncPhotoMetadata", null);
__decorate([
    (0, graphql_1.Mutation)(() => batch_sync_response_1.BatchSyncResponse),
    __param(0, (0, graphql_1.Args)('syncData')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [batch_sync_input_1.BatchSyncInput, Object]),
    __metadata("design:returntype", Promise)
], SyncResolver.prototype, "batchSyncMetadata", null);
__decorate([
    (0, graphql_1.Query)(() => sync_status_response_1.SyncStatusResponse),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncResolver.prototype, "syncStatus", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('photoIds', { type: () => [String] })),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], SyncResolver.prototype, "markPhotosForSync", null);
__decorate([
    (0, graphql_1.Query)(() => [Object]),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncResolver.prototype, "curatedPhotosForSync", null);
exports.SyncResolver = SyncResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncResolver);
//# sourceMappingURL=sync.resolver.js.map