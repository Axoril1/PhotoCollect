import * as nsfw from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { IModerationProvider, ProviderResult } from '../moderation.types';
import { PROVIDER_NAMES } from '../moderation.constants';
import { measureTime, decodeImageBuffer } from '../moderation.utils';

export class NsfwProvider implements IModerationProvider {
  readonly name = PROVIDER_NAMES.NSFWJS;
  private model: any = null;

  async initialize(): Promise<void> {
    if (this.model) return;

    try {
      // Load the default MobileNetV2 model once
      this.model = await nsfw.load();
    } catch (err: any) {
      throw new Error(`Failed to load NSFWJS model: ${err.message}`);
    }
  }

  async moderate(imageBuffer: Buffer): Promise<ProviderResult> {
    if (!this.model) {
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
          error: `Model initialization failed: ${err.message}`,
        };
      }
    }

    let tensor: tf.Tensor3D | null = null;
    try {
      // Decode image buffer using sharp to avoid native gyp build issues
      const { result: decodedTensor, duration: decodeTime } = await measureTime(async () => {
        return await decodeImageBuffer(imageBuffer);
      });
      tensor = decodedTensor;

      // Run prediction
      const { result: predictions, duration: inferenceTime } = await measureTime(async () => {
        return await this.model.classify(tensor);
      });

      const scores: Record<string, number> = {};
      predictions.forEach((p: any) => {
        scores[p.className] = p.probability;
      });

      // Map class probabilities to standard criteria:
      // Adult = Porn + Hentai
      const adultScore = (scores['Porn'] || 0) + (scores['Hentai'] || 0);
      const racyScore = scores['Sexy'] || 0;
      const violenceScore = 0; // NSFWJS does not check for physical violence

      // Determine top matching category confidence
      let confidence = 0;
      predictions.forEach((p: any) => {
        if (p.probability > confidence) {
          confidence = p.probability;
        }
      });

      return {
        provider: this.name,
        adultScore,
        violenceScore,
        racyScore,
        confidence,
        rawLabels: scores,
        processingTime: decodeTime + inferenceTime,
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
        error: err.message || 'Unknown error occurred in NSFWJS provider.',
      };
    } finally {
      // CRITICAL: Prevent memory leaks in tfjs by disposing of the tensor
      if (tensor) {
        tensor.dispose();
      }
    }
  }
}
export default NsfwProvider;
