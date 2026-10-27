import { IModerationProvider, ProviderResult, ModerationResponse } from './moderation.types';
import { GoogleVisionProvider } from './providers/googleVisionProvider';
import { NsfwProvider } from './providers/nsfwProvider';
import { DecisionEngine } from './decisionEngine';
import { measureTime } from './moderation.utils';

export class ModerationService {
  private providers: IModerationProvider[] = [];
  private decisionEngine: DecisionEngine;

  constructor() {
    this.decisionEngine = new DecisionEngine();

    // Register Google Vision if enabled (default true)
    if (process.env.ENABLE_GOOGLE_MODERATION !== 'false') {
      this.providers.push(new GoogleVisionProvider());
    }

    // Register NSFWJS if enabled (default false unless set to true)
    if (process.env.ENABLE_NSFWJS === 'true') {
      this.providers.push(new NsfwProvider());
    }
  }

  async initialize(): Promise<void> {
    if (this.providers.length === 0) {
      console.warn("⚠️ Moderation Service initialized with NO active providers.");
      console.log('✓ Moderation Service Ready');
      return;
    }

    const initPromises = this.providers.map(async (provider) => {
      try {
        await provider.initialize();
        const displayLabel = provider.name === 'google_vision' ? 'Google Vision' : 'NSFWJS';
        console.log(`✓ ${displayLabel} Ready`);
      } catch (err: any) {
        console.error(`✗ Failed to initialize ${provider.name}:`, err.message);
        throw err;
      }
    });

    await Promise.all(initPromises);
    console.log('✓ Moderation Service Ready');
  }

  async moderateImage(imageBuffer: Buffer, mimeType?: string): Promise<ModerationResponse> {
    const { result: providerResults, duration } = await measureTime(async () => {
      const promises = this.providers.map(async (provider) => {
        try {
          const result = await provider.moderate(imageBuffer, mimeType);
          
          // Step 9: Structured Logging for each provider execution
          console.log(JSON.stringify({
            event: 'moderation_provider_run',
            provider: provider.name,
            status: result.status,
            latencyMs: result.processingTime,
            confidence: result.confidence,
            decision: this.decisionEngine.decide([result]),
          }));

          return result;
        } catch (err: any) {
          console.error(JSON.stringify({
            event: 'moderation_provider_error',
            provider: provider.name,
            error: err.message,
          }));

          return {
            provider: provider.name,
            adultScore: 0,
            violenceScore: 0,
            racyScore: 0,
            confidence: 0,
            rawLabels: {},
            processingTime: 0,
            status: 'failed' as const,
            error: err.message,
          };
        }
      });

      return await Promise.all(promises);
    });

    const decision = this.decisionEngine.decide(providerResults);

    // Step 9: Structured Logging for overall outcome decision
    console.log(JSON.stringify({
      event: 'moderation_completed',
      decision,
      totalLatencyMs: duration,
      providerCount: providerResults.length,
    }));

    return {
      decision,
      providerResults,
      processingTime: duration,
    };
  }
}

export const moderationService = new ModerationService();
export default moderationService;
