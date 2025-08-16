import { PageMapping } from '../../domain/entities/PageMapping';

export interface PageMappingRepository {
  findByPath(path: string): Promise<PageMapping | null>;
  save(mapping: PageMapping): Promise<void>;
  delete(path: string): Promise<void>;
  findAll(): Promise<PageMapping[]>;
}