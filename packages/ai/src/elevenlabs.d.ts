export interface ElevenLabsVoiceSettings {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
}
export interface ElevenLabsVoiceDescriptor {
    id: string;
    name: string;
    languages: string[];
    tones: string[];
    description: string;
    modelId: string;
    outputFormat: string;
    voiceSettings: Required<ElevenLabsVoiceSettings>;
}
export interface ElevenLabsSynthesisOptions {
    text: string;
    language: string;
    voice: ElevenLabsVoiceDescriptor;
    modelId?: string;
    outputFormat?: string;
    voiceSettings?: ElevenLabsVoiceSettings;
}
export interface ElevenLabsSynthesisResult {
    audioBuffer: Buffer;
    format: string;
    contentType: string;
    language: string;
    voiceId: string;
    voiceName: string;
    modelId: string;
    characterCount: number;
    durationSeconds: number;
}
export declare function getElevenLabsCharacterLimit(modelId: string): number;
export declare function chunkTextForElevenLabs(text: string, maxCharacters: number): string[];
export declare function selectElevenLabsVoices(language: string, tone: string | null | undefined, limit?: number): ElevenLabsVoiceDescriptor[];
export declare function synthesizeSpeech(options: ElevenLabsSynthesisOptions): Promise<ElevenLabsSynthesisResult>;
//# sourceMappingURL=elevenlabs.d.ts.map