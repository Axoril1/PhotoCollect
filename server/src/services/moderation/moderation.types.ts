export type ModerationDecision = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';

export interface ProviderResult {
  provider: string;
  adultScore: number;      // Normalized 0 to 1
  violenceScore: number;   // Normalized 0 to 1
  racyScore: number;       // Normalized 0 to 1
  confidence: number;      // Normalized 0 to 1
  rawLabels: Record<string, any>;
  processingTime: number;  // ms
  status: 'success' | 'failed';
  error?: string;
}

export interface ModerationResponse {
  decision: ModerationDecision;
  providerResults: ProviderResult[];
  processingTime: number; // total ms
}

export interface IModerationProvider {
  name: string;
  initialize(): Promise<void>;
  moderate(imageBuffer: Buffer, mimeType?: string): Promise<ProviderResult>;
}
