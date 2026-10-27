import mongoose from "mongoose";

const SLUG_PATTERN = /^[A-Za-z0-9_-]{8,21}$/;

export const validateObjectId = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ error: `Invalid ${paramName} format` });
  }
  next();
};

export const validateSlug = (paramName = "slug") => (req, res, next) => {
  const value = req.params[paramName];
  if (!value || !SLUG_PATTERN.test(value)) {
    return res.status(400).json({ error: `Invalid ${paramName} format` });
  }
  next();
};

export const validateCreateEvent = (req, res, next) => {
  const name = String(req.body.name || "").trim();
  const organizerName = String(req.body.organizerName || "").trim();
  const password = String(req.body.password || "");
  const expiresInDays = req.body.expiresInDays;

  if (!name) {
    return res.status(400).json({ error: "Event name is required" });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: "Event name must be 100 characters or less" });
  }
  if (organizerName.length > 100) {
    return res.status(400).json({ error: "Organizer name must be 100 characters or less" });
  }
  
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const days = Number(expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: "Expiry must be between 1 and 365 days" });
    }
  }

  req.body.name = name;
  req.body.organizerName = organizerName;
  req.body.password = password;
  next();
};

export const validateVerifyPassword = (req, res, next) => {
  req.body.password = String(req.body.password || "");
  next();
};

export const validateDownloadSelected = (req, res, next) => {
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: "photoIds array is required and must not be empty" });
  }

  for (const id of photoIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid photoId format: ${id}` });
    }
  }
  next();
};
