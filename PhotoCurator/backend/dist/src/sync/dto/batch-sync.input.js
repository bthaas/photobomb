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
exports.BatchSyncInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const sync_metadata_input_1 = require("./sync-metadata.input");
let SyncItemInput = class SyncItemInput {
};
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SyncItemInput.prototype, "photoId", void 0);
__decorate([
    (0, graphql_1.Field)(() => sync_metadata_input_1.SyncMetadataInput),
    __metadata("design:type", sync_metadata_input_1.SyncMetadataInput)
], SyncItemInput.prototype, "metadata", void 0);
SyncItemInput = __decorate([
    (0, graphql_1.InputType)()
], SyncItemInput);
let BatchSyncInput = class BatchSyncInput {
};
exports.BatchSyncInput = BatchSyncInput;
__decorate([
    (0, graphql_1.Field)(() => [SyncItemInput]),
    __metadata("design:type", Array)
], BatchSyncInput.prototype, "items", void 0);
exports.BatchSyncInput = BatchSyncInput = __decorate([
    (0, graphql_1.InputType)()
], BatchSyncInput);
//# sourceMappingURL=batch-sync.input.js.map