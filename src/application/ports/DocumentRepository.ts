import { Document } from '../../domain/entities/Document';

export interface DocumentRepository {
  findByPath(path: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
}