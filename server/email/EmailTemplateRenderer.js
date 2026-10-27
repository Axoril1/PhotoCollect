import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailTemplateRenderer {
  constructor() {
    this.templatesDir = path.join(__dirname, "templates");
  }

  /**
   * Render HTML and plain-text versions of a template
   * @param {string} templateName - Name of the template file (e.g. 'welcome')
   * @param {Object} data - Context data for placeholders
   * @returns {{ html: string, text: string }}
   */
  render(templateName, data = {}) {
    const htmlPath = path.join(this.templatesDir, `${templateName}.html`);
    const textPath = path.join(this.templatesDir, `${templateName}.txt`);

    let htmlContent = "";
    let textContent = "";

    try {
      if (fs.existsSync(htmlPath)) {
        htmlContent = fs.readFileSync(htmlPath, "utf8");
      } else {
        htmlContent = this._getDefaultHtmlTemplate(templateName);
      }
    } catch (err) {
      console.error(`Failed to read HTML template ${templateName}:`, err.message);
      htmlContent = this._getDefaultHtmlTemplate(templateName);
    }

    try {
      if (fs.existsSync(textPath)) {
        textContent = fs.readFileSync(textPath, "utf8");
      } else {
        textContent = this._getDefaultTextTemplate(templateName);
      }
    } catch (err) {
      console.error(`Failed to read Text template ${templateName}:`, err.message);
      textContent = this._getDefaultTextTemplate(templateName);
    }

    // Add global template variables
    const renderData = {
      ...data,
      year: new Date().getFullYear(),
      appUrl: process.env.APP_URL || "http://localhost:5173",
    };

    // Replace all instances of {{ placeholderName }}
    const replacePlaceholders = (template, replacements) => {
      let result = template;
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        result = result.replace(regex, value !== undefined && value !== null ? value : "");
      }
      return result;
    };

    return {
      html: replacePlaceholders(htmlContent, renderData),
      text: replacePlaceholders(textContent, renderData),
    };
  }

  _getDefaultHtmlTemplate(name) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PhotoCollect</title>
</head>
<body style="font-family: sans-serif; background-color: #f9f9f9; padding: 20px; margin: 0;">
  <div style="max-width: 600px; background-color: #ffffff; padding: 30px; border-radius: 8px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #6366f1;">PhotoCollect</h2>
    <p>Essential System Notification: <strong>${name}</strong></p>
    <p>Please refer to the application for complete details.</p>
  </div>
</body>
</html>`;
  }

  _getDefaultTextTemplate(name) {
    return `PhotoCollect Notification\n\nTemplate: ${name}\n\nPlease check the application for updates.`;
  }
}

export const templateRenderer = new EmailTemplateRenderer();
export default templateRenderer;
