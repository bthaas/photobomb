import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PhotoAnalysisResult {
  bestPhotoIndex: number;
  reasoning: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;
  private googleAI: GoogleGenerativeAI;
  private provider: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    if (this.provider === 'google' && process.env.GOOGLE_API_KEY) {
      this.googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  async analyzeBestPhoto(imageBuffers: Buffer[]): Promise<PhotoAnalysisResult> {
    if (this.provider === 'openai') {
      return this.analyzeWithOpenAI(imageBuffers);
    } else if (this.provider === 'google') {
      return this.analyzeWithGoogle(imageBuffers);
    }
    
    throw new Error('No valid AI provider configured');
  }

  private async analyzeWithOpenAI(imageBuffers: Buffer[]): Promise<PhotoAnalysisResult> {
    const images = imageBuffers.map((buffer, index) => ({
      type: 'image_url' as const,
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
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${content}`);
    }
  }

  private async analyzeWithGoogle(imageBuffers: Buffer[]): Promise<PhotoAnalysisResult> {
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
    } catch (error) {
      throw new Error(`Failed to parse Google AI response: ${content}`);
    }
  }
}