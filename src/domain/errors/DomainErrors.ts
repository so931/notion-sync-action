export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DocumentNotFoundError extends DomainError {
  constructor(public readonly path: string) {
    super(`Document not found: ${path}`);
  }
}

export class PageNotFoundError extends DomainError {
  constructor(public readonly pageId: string) {
    super(`Page not found: ${pageId}`);
  }
}

export class InvalidConfigurationError extends DomainError {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
  }
}

export class SyncError extends DomainError {
  constructor(message: string, public readonly cause?: Error) {
    super(`Sync failed: ${message}`);
  }
}