"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
const aws_serverless_express_1 = require("aws-serverless-express");
const express = require("express");
let server;
async function bootstrap() {
    const expressApp = express();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    await app.init();
    return (0, aws_serverless_express_1.createServer)(expressApp);
}
const handler = async (event, context, callback) => {
    if (!server) {
        server = await bootstrap();
    }
    return (0, aws_serverless_express_1.proxy)(server, event, context, 'PROMISE').promise;
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map