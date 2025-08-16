import { Client } from '@notionhq/client';
import { Page } from '../../domain/entities/Page';
import { PageRepository } from '../../application/ports/PageRepository';
import { PagePermissions } from '../../domain/valueObjects/PagePermissions';
import { Block } from '../../domain/valueObjects/Block';

export class NotionGateway implements PageRepository {
  constructor(private readonly client: Client) {}

  async findById(id: string): Promise<Page | null> {
    try {
      const response = await this.client.pages.retrieve({ page_id: id });
      return this.mapToPage(response);
    } catch (error: any) {
      if (error?.status === 404) return null;
      throw new Error(`Failed to retrieve page: ${error?.message}`);
    }
  }

  async create(page: Page): Promise<Page> {
    // In a real implementation, this would create the page in Notion
    // For now, return a page with a generated ID
    const createdPage = new Page(
      this.generateId(),
      page.getTitle(),
      page.getBlocks(),
      page.getMetadata(),
      page.getPermissions()
    );
    
    return createdPage;
  }

  async update(page: Page): Promise<Page> {
    // In a real implementation, this would update the page in Notion
    return page;
  }

  private mapToPage(notionPage: any): Page {
    // Simplified mapping - in a real implementation, this would
    // properly map Notion API response to our domain model
    return new Page(
      notionPage.id,
      'Title', // Would extract from properties
      [], // Would convert blocks
      {},
      new PagePermissions('none')
    );
  }

  private generateId(): string {
    // Generate a UUID-like ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}