import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionEngine } from '../decisionEngine';
import { ModerationService } from '../moderationService';
import { GoogleVisionProvider } from '../providers/googleVisionProvider';
import { NsfwProvider } from '../providers/nsfwProvider';
import { CredentialLoader } from '../config/credentialLoader';
import { moderationConfig } from '../../../config/moderation.config';
import fs from 'fs';

// Mock fs to simulate credentials verification checks
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

// Mock Google Cloud Vision SDK annotator client
vi.mock('@google-cloud/vision', () => {
  return {
    ImageAnnotatorClient: class {
      async safeSearchDetection() {
        return [
          {
            safeSearchAnnotation: {
              adult: 'VERY_UNLIKELY',
              spoof: 'VERY_UNLIKELY',
              medical: 'VERY_UNLIKELY',
              violence: 'VERY_UNLIKELY',
              racy: 'VERY_UNLIKELY',
            },
          },
        ];
      }
    },
  };
});

// Mock NSFWJS classification model loading
vi.mock('nsfwjs', () => {
  return {
    load: vi.fn().mockResolvedValue({
      classify: vi.fn().mockResolvedValue([
        { className: 'Neutral', probability: 0.95 },
        { className: 'Sexy', probability: 0.02 },
        { className: 'Porn', probability: 0.01 },
        { className: 'Hentai', probability: 0.01 },
        { className: 'Drawing', probability: 0.01 },
      ]),
    }),
  };
});

// Mock TensorFlow core functions
vi.mock('@tensorflow/tfjs', () => {
  return {
    tensor3d: vi.fn().mockReturnValue({
      dispose: vi.fn(),
    }),
  };
});

// Mock Sharp image library
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockReturnValue({
      removeAlpha: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue({
        data: Buffer.alloc(10),
        info: { width: 100, height: 100, channels: 3 },
      }),
    }),
  };
});

describe('Decision Engine', () => {
  beforeEach(() => {
    vi.stubEnv('AUTO_APPROVE_THRESHOLD', '0.3');
    vi.stubEnv('AUTO_REJECT_THRESHOLD', '0.7');
  });

  it('approves safe images', () => {
    const engine = new DecisionEngine();
    const results = [
      {
        provider: 'mock',
        adultScore: 0.1,
        violenceScore: 0.1,
        racyScore: 0.2,
        confidence: 0.8,
        rawLabels: {},
        processingTime: 5,
        status: 'success' as const,
      },
    ];
    expect(engine.decide(results)).toBe('APPROVED');
  });

  it('rejects NSFW images', () => {
    const engine = new DecisionEngine();
    const results = [
      {
        provider: 'mock',
        adultScore: 0.8,
        violenceScore: 0.1,
        racyScore: 0.2,
        confidence: 0.9,
        rawLabels: {},
        processingTime: 5,
        status: 'success' as const,
      },
    ];
    expect(engine.decide(results)).toBe('REJECTED');
  });

  it('marks borderline images for manual review', () => {
    const engine = new DecisionEngine();
    const results = [
      {
        provider: 'mock',
        adultScore: 0.5,
        violenceScore: 0.1,
        racyScore: 0.2,
        confidence: 0.8,
        rawLabels: {},
        processingTime: 5,
        status: 'success' as const,
      },
    ];
    expect(engine.decide(results)).toBe('PENDING_REVIEW');
  });
});

describe('Google Vision Provider - Credential Infrastructure', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_GOOGLE_MODERATION', 'true');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '');
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '');
    vi.mocked(fs.existsSync).mockReset();
    
    // Sync configuration state with mocked environment
    moderationConfig.enableGoogleModeration = true;
  });

  it('detects production mode when GOOGLE_SERVICE_ACCOUNT_JSON is set', () => {
    const fakeKey = JSON.stringify({
      type: 'service_account',
      project_id: 'fake-project-id',
      private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
      client_email: 'vision@fake-project.iam.gserviceaccount.com',
    });
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', fakeKey);

    const creds = CredentialLoader.load();
    expect(creds.mode).toBe('Production');
    expect(creds.source).toBe('GOOGLE_SERVICE_ACCOUNT_JSON');
    expect(creds.clientConfig.credentials).toBeDefined();
    expect(creds.clientConfig.projectId).toBe('fake-project-id');
  });

  it('throws descriptive error if GOOGLE_SERVICE_ACCOUNT_JSON format is invalid JSON', () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '{invalid-json');
    expect(() => CredentialLoader.load()).toThrow(/Invalid GOOGLE_SERVICE_ACCOUNT_JSON/);
  });

  it('throws descriptive error if GOOGLE_SERVICE_ACCOUNT_JSON is missing critical fields', () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify({ client_email: 'only-email@test.com' }));
    expect(() => CredentialLoader.load()).toThrow(/Missing client_email or private_key fields/);
  });

  it('detects local mode path when GOOGLE_APPLICATION_CREDENTIALS is set', () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/path/to/key.json');
    vi.mocked(fs.existsSync).mockImplementation((p) => p === '/path/to/key.json');

    const creds = CredentialLoader.load();
    expect(creds.mode).toBe('Development');
    expect(creds.source).toBe('GOOGLE_APPLICATION_CREDENTIALS');
    expect(creds.clientConfig.keyFilename).toBe('/path/to/key.json');
  });

  it('falls back to default server/credentials path if env variables are empty', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return typeof p === 'string' && p.endsWith('google-vision-key.json');
    });

    const creds = CredentialLoader.load();
    expect(creds.mode).toBe('Development');
    expect(creds.source).toBe('DEFAULT_FILE');
    expect(creds.clientConfig.keyFilename).toContain('google-vision-key.json');
  });

  it('throws error if credentials are completely missing across env and local file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => CredentialLoader.load()).toThrow(/Google Cloud Vision credentials are not configured/);
  });

  it('throws error in provider initialize if Google Vision moderation is explicitly disabled', async () => {
    moderationConfig.enableGoogleModeration = false;
    const provider = new GoogleVisionProvider();
    await expect(provider.initialize()).rejects.toThrow(/Google Vision moderation is disabled/);
  });
});

describe('NSFWJS Provider', () => {
  it('successfully loads model and predicts raw buffer', async () => {
    const provider = new NsfwProvider();
    await provider.initialize();
    const result = await provider.moderate(Buffer.alloc(100));
    expect(result.status).toBe('success');
    expect(result.adultScore).toBeLessThan(0.1);
  });
});

describe('Moderation Service', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_GOOGLE_MODERATION', 'true');
    vi.stubEnv('ENABLE_NSFWJS', 'true');
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/path/to/creds.json');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    moderationConfig.enableGoogleModeration = true;
    moderationConfig.enableNsfwjs = true;
  });

  it('aggregates multiple active providers and returns decisions', async () => {
    const service = new ModerationService();
    await service.initialize();
    const res = await service.moderateImage(Buffer.alloc(100));
    expect(res.decision).toBeDefined();
    expect(res.providerResults.length).toBe(2);
  });

  it('falls back gracefully to NSFWJS if Google Vision fails', async () => {
    const service = new ModerationService();
    await service.initialize();

    // Spying and forcing google provider moderate method to fail
    const googleProv = service['providers'].find(p => p.name === 'google_vision')!;
    vi.spyOn(googleProv, 'moderate').mockResolvedValue({
      provider: 'google_vision',
      adultScore: 0,
      violenceScore: 0,
      racyScore: 0,
      confidence: 0,
      rawLabels: {},
      processingTime: 0,
      status: 'failed' as const,
      error: 'Google Vision API Connection Error',
    });

    const res = await service.moderateImage(Buffer.alloc(100));
    // Should proceed using NSFWJS provider successfully
    expect(res.providerResults.find(r => r.provider === 'nsfwjs')?.status).toBe('success');
    expect(res.providerResults.find(r => r.provider === 'google_vision')?.status).toBe('failed');
    expect(res.decision).toBe('APPROVED');
  });
});
