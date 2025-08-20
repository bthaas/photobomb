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
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const generative_ai_1 = require("@google/generative-ai");
let AiService = class AiService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'openai';
        if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        if (this.provider === 'google' && process.env.GOOGLE_API_KEY) {
            this.googleAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        }
    }
    async analyzeBestPhoto(imageBuffers) {
        if (this.provider === 'openai') {
            return this.analyzeWithOpenAI(imageBuffers);
        }
        else if (this.provider === 'google') {
            return this.analyzeWithGoogle(imageBuffers);
        }
        throw new Error('No valid AI provider configured');
    }
    async analyzeWithOpenAI(imageBuffers) {
        const images = imageBuffers.map((buffer, index) => ({
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            },
        }));
        const prompt = `Analyze these ${imageBuffers.length} photos and select the single best one based on:

1. Technical quality (clarity, lighting, exposure, composition)
2. Content quality (subject focus, emotion, visual appeal)
3. Overall aesthetic value

Respond with ONLY a JSON object in this exact format:
{
  "bestPhotoIndex": <number from 0 to ${imageBuffers.length - 1}>,
  "reasoning": "<brief explanation>"
}

Do not include any other text or formatting.`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        ...images,
                    ],
                },
            ],
            max_tokens: 500,
            temperature: 0.3,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }
        try {
            return JSON.parse(content.trim());
        }
        catch (error) {
            throw new Error(`Failed to parse OpenAI response: ${content}`);
        }
    }
    async analyzeWithGoogle(imageBuffers) {
        const model = this.googleAI.getGenerativeModel({ model: 'gemini-pro-vision' });
        const images = imageBuffers.map((buffer) => ({
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: 'image/jpeg',
            },
        }));
        const prompt = `Analyze these ${imageBuffers.length} photos and select the single best one based on:

1. Technical quality (clarity, lighting, exposure, composition)
2. Content quality (subject focus, emotion, visual appeal)
3. Overall aesthetic value

Respond with ONLY a JSON object in this exact format:
{
  "bestPhotoIndex": <number from 0 to ${imageBuffers.length - 1}>,
  "reasoning": "<brief explanation>"
}

Do not include any other text or formatting.`;
        const result = await model.generateContent([prompt, ...images]);
        const content = result.response.text();
        try {
            return JSON.parse(content.trim());
        }
        catch (error) {
            throw new Error(`Failed to parse Google AI response: ${content}`);
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map