import { Page } from '../../domain/entities/Page';

export interface PageRepository {
  findById(id: string): Promise<Page | null>;
  create(page: Page): Promise<Page>;
  update(page: Page): Promise<Page>;
}