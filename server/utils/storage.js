import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

export const ensureUploadDirs = () => {
  const dirs = [
    path.join(UPLOAD_DIR, "originals"),
    path.join(UPLOAD_DIR, "thumbnails"),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

export const getPublicUrl = (req, type, filename) => {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${type}/${filename}`;
};

export const UPLOAD_PATHS = {
  originals: path.join(UPLOAD_DIR, "originals"),
  thumbnails: path.join(UPLOAD_DIR, "thumbnails"),
};