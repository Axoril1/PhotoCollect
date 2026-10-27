export class StorageError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(message = "Storage service is currently unavailable", originalError = null) {
    super(message, 503);
    this.originalError = originalError;
  }
}

export class UploadFailedError extends StorageError {
  constructor(message = "Failed to upload file to storage", originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

export class DeleteFailedError extends StorageError {
  constructor(message = "Failed to delete file from storage", originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

export class FileNotFoundError extends StorageError {
  constructor(message = "Requested file was not found", originalError = null) {
    super(message, 404);
    this.originalError = originalError;
  }
}

export class ProviderConfigurationError extends StorageError {
  constructor(message = "Storage provider configuration is invalid or incomplete", originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}
