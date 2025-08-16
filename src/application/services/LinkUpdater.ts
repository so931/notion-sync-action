import { Document } from '../../domain/entities/Document';
import { Page } from '../../domain/entities/Page';

export interface LinkUpdater {
  updateLinks(document: Document, page: Page): Promise<void>;
}