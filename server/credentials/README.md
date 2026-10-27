# Google Cloud Vision Credential Infrastructure

This directory is reserved for hosting Google Cloud service account keys during local development.

> [!CAUTION]
> **NEVER commit credential files to Git.** The `.gitignore` file has been configured to ignore `*.json` inside this directory to prevent leaks.

---

## 1. Environment Variables

Configure the following variables in your `.env` file (local) or your hosting platform (production):

| Variable | Description | Location / Mode |
| --- | --- | --- |
| `ENABLE_GOOGLE_MODERATION` | Toggle Google Vision SafeSearch (`true`/`false`). | Both |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Stringified JSON of the service account key. | Production (Render, Heroku) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the local JSON credentials file. | Local Development |

---

## 2. Configuration & Resolution Flow

The moderation engine initializes Google Vision by resolving credentials in the following order:

```
                  ┌─────────────────────────────────────┐
                  │ Check GOOGLE_SERVICE_ACCOUNT_JSON   │
                  │ (Stringified JSON in environment)   │
                  └──────────────────┬──────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
             [Yes]  ▼                               ▼  [No]
         Parse & Initialize                 ┌───────────────────────────────┐
         (Zero disk write)                  │ Check GOOGLE_APP_CREDENTIALS  │
                                            │ (Filepath in environment)     │
                                            └───────────────┬───────────────┘
                                                            │
                                             ┌──────────────┴───────────────┐
                                     [Yes]  ▼                               ▼  [No]
                                 Load filepath                  ┌───────────────────────┐
                                                                │ Check default local:  │
                                                                │ credentials/          │
                                                                │ google-vision-key.json│
                                                                └───────────┬───────────┘
                                                                            │
                                                             ┌──────────────┴───────────────┐
                                                     [Yes]  ▼                               ▼  [No]
                                                 Load filepath                         Throw Error
                                                                                    (Graceful skip)
```

---

## 3. Local Development Setup

To configure Google Vision locally:

1.  Create a Google Cloud service account with the **Cloud Vision API User** role.
2.  Generate a service account key in **JSON** format.
3.  Rename the downloaded file to `google-vision-key.json`.
4.  Place it inside this directory: `server/credentials/google-vision-key.json`.
5.  Set the following in `server/.env`:
    ```env
    ENABLE_GOOGLE_MODERATION=true
    ```

---

## 4. Production Setup (e.g. Render)

To avoid writing secret files to the container's disk:

1.  Open the JSON key file on your computer and copy its entire text content.
2.  In the Render dashboard under your Web Service environment settings, add an environment variable:
    *   **Key**: `GOOGLE_SERVICE_ACCOUNT_JSON`
    *   **Value**: Paste the copied JSON string (e.g. `{"type": "service_account", ...}`).
3.  Set `ENABLE_GOOGLE_MODERATION=true`.

---

## 5. Security Recommendations

*   **Least Privilege**: The service account should **only** be granted the `roles/vision.imageAnnotatorUser` role. Never grant project editor or owner permissions.
*   **Rotation**: Rotate keys every 90 days.
*   **Audit**: Enable Cloud Audit Logs for the Vision API to trace usage metadata.
