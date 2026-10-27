import fs from 'fs';
import path from 'path';

export interface StandardizedCredentials {
  mode: 'Development' | 'Production';
  source: 'GOOGLE_SERVICE_ACCOUNT_JSON' | 'GOOGLE_APPLICATION_CREDENTIALS' | 'DEFAULT_FILE';
  clientConfig: {
    credentials?: {
      client_email: string;
      private_key: string;
      project_id?: string;
    };
    keyFilename?: string;
    projectId?: string;
  };
}

export class CredentialLoader {
  static load(): StandardizedCredentials {
    // Priority 1: GOOGLE_SERVICE_ACCOUNT_JSON (Production Mode string from env)
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        if (!credentials.client_email || !credentials.private_key) {
          throw new Error("Missing client_email or private_key fields.");
        }
        return {
          mode: 'Production',
          source: 'GOOGLE_SERVICE_ACCOUNT_JSON',
          clientConfig: {
            credentials: {
              client_email: credentials.client_email,
              private_key: credentials.private_key,
              project_id: credentials.project_id,
            },
            projectId: credentials.project_id,
          },
        };
      } catch (err: any) {
        throw new Error(
          `Invalid GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}. ` +
          `Verify that the Render Environment Variable is a complete stringified JSON credentials object from Google Cloud.`
        );
      }
    }

    // Priority 2: GOOGLE_APPLICATION_CREDENTIALS (Custom file path)
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credsPath) {
      if (!fs.existsSync(credsPath)) {
        throw new Error(
          `Google Application Credentials file not found at: ${credsPath}. ` +
          `Verify that your GOOGLE_APPLICATION_CREDENTIALS environment variable points to a valid file path.`
        );
      }
      return {
        mode: 'Development',
        source: 'GOOGLE_APPLICATION_CREDENTIALS',
        clientConfig: {
          keyFilename: credsPath,
        },
      };
    }

    // Priority 3: Fallback local key file (Default path fallback)
    const defaultLocalPath = path.resolve(process.cwd(), 'credentials/google-vision-key.json');
    if (fs.existsSync(defaultLocalPath)) {
      return {
        mode: 'Development',
        source: 'DEFAULT_FILE',
        clientConfig: {
          keyFilename: defaultLocalPath,
        },
      };
    }

    throw new Error(
      "Google Cloud Vision credentials are not configured. To resolve: " +
      "1. For local development, place your JSON key file at credentials/google-vision-key.json or set the GOOGLE_APPLICATION_CREDENTIALS environment variable. " +
      "2. For production platforms like Render, add the GOOGLE_SERVICE_ACCOUNT_JSON environment variable with the key file content."
    );
  }
}
export default CredentialLoader;
