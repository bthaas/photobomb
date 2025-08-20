"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
const express = require("express");
let app;
async function bootstrap() {
    if (!app) {
        const expressApp = express();
        app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
        app.enableCors({
            origin: true,
            credentials: true,
        });
        await app.init();
    }
    return app;
}
exports.default = async (req, res) => {
    const nestApp = await bootstrap();
    return nestApp.getHttpAdapter().getInstance()(req, res);
};
//# sourceMappingURL=vercel.js.map