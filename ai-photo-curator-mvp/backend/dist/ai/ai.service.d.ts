export interface PhotoAnalysisResult {
    bestPhotoIndex: number;
    reasoning: string;
}
export declare class AiService {
    private openai;
    private googleAI;
    private provider;
    constructor();
    analyzeBestPhoto(imageBuffers: Buffer[]): Promise<PhotoAnalysisResult>;
    private analyzeWithOpenAI;
    private analyzeWithGoogle;
}
