import { ImageAnnotatorClient } from '@google-cloud/vision';
import { IModerationProvider, ProviderResult } from '../moderation.types';
import { PROVIDER_NAMES, GOOGLE_LIKELIHOOD_SCORES } from '../moderation.constants';
import { measureTime } from '../moderation.utils';
import { CredentialLoader } from '../config/credentialLoader';
import { moderationConfig } from '../../../config/moderation.config';

export class GoogleVisionProvider implements IModerationProvider {
  readonly name = PROVIDER_NAMES.GOOGLE_VISION;
  private client: ImageAnnotatorClient | null = null;

  async initialize(): Promise<void> {
    if (this.client) return;

    if (!moderationConfig.enableGoogleModeration) {
      throw new Error("Google Vision moderation is disabled in configuration.");
    }

    // Load credentials via standard loader (Step 4 & 7)
    const creds = CredentialLoader.load();

    // Print startup verification (Step 5)
    console.log(`✓ Google Vision Credential Mode: ${creds.mode}`);

    try {
      this.client = new ImageAnnotatorClient(creds.clientConfig);
    } catch (err: any) {
      throw new Error(`Failed to initialize Google Vision client: ${err.message}`);
    }
  }

  async moderate(imageBuffer: Buffer): Promise<ProviderResult> {
    if (!this.client) {
      try {
        await this.initialize();
      } catch (err: any) {
        return {
          provider: this.name,
          adultScore: 0,
          violenceScore: 0,
          racyScore: 0,
          confidence: 0,
          rawLabels: {},
          processingTime: 0,
          status: 'failed',
          error: `Initialization failed: ${err.message}`,
        };
      }
    }

    try {
      const { result, duration } = await measureTime(async () => {
        const [response] = await this.client!.safeSearchDetection({
          image: { content: imageBuffer },
        });
        return response;
      });

      const safeSearch = result.safeSearchAnnotation;
      if (!safeSearch) {
        throw new Error("Google Vision response did not contain safeSearchAnnotation.");
      }

      // Map SafeSearch likelihood to normalized scores (0 to 1)
      const adultScore = GOOGLE_LIKELIHOOD_SCORES[safeSearch.adult as string] ?? 0;
      const violenceScore = GOOGLE_LIKELIHOOD_SCORES[safeSearch.violence as string] ?? 0;
      const racyScore = GOOGLE_LIKELIHOOD_SCORES[safeSearch.racy as string] ?? 0;

      // Maximum score reflects the highest severity category found
      const confidence = Math.max(adultScore, violenceScore, racyScore);

      return {
        provider: this.name,
        adultScore,
        violenceScore,
        racyScore,
        confidence,
        rawLabels: {
          adult: safeSearch.adult,
          spoof: safeSearch.spoof,
          medical: safeSearch.medical,
          violence: safeSearch.violence,
          racy: safeSearch.racy,
        },
        processingTime: duration,
        status: 'success',
      };
    } catch (err: any) {
      return {
        provider: this.name,
        adultScore: 0,
        violenceScore: 0,
        racyScore: 0,
        confidence: 0,
        rawLabels: {},
        processingTime: 0,
        status: 'failed',
        error: err.message || 'Unknown error occurred in Google Vision provider.',
      };
    }
  }
}
export default GoogleVisionProvider;
