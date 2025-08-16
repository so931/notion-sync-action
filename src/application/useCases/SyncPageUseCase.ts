import { Document } from '../../domain/entities/Document';
import { Page } from '../../domain/entities/Page';
import { PageMapping } from '../../domain/entities/PageMapping';
import { PagePermissions } from '../../domain/valueObjects/PagePermissions';
import { Block } from '../../domain/valueObjects/Block';
import { DocumentNotFoundError } from '../../domain/errors/DomainErrors';
import { DocumentRepository } from '../ports/DocumentRepository';
import { PageRepository } from '../ports/PageRepository';
import { PageMappingRepository } from '../ports/PageMappingRepository';
import { LinkUpdater } from '../services/LinkUpdater';

export interface SyncPageRequest {
  filePath: string;
  dryRun?: boolean;
}

export interface SyncPageResponse {
  status: 'created' | 'updated' | 'unchanged';
  pageId: string;
  notionUrl?: string;
}

export interface SyncPageUseCase {
  execute(request: SyncPageRequest): Promise<SyncPageResponse>;
}

export class SyncPageUseCaseImpl implements SyncPageUseCase {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly pageRepo: PageRepository,
    private readonly mappingRepo: PageMappingRepository,
    private readonly linkUpdater: LinkUpdater
  ) {}

  async execute(request: SyncPageRequest): Promise<SyncPageResponse> {
    // 1. Load document
    const document = await this.documentRepo.findByPath(request.filePath);
    if (!document) {
      throw new DocumentNotFoundError(request.filePath);
    }

    // 2. Check existing mapping
    const mapping = await this.mappingRepo.findByPath(request.filePath);
    
    // 3. Check if sync is needed
    if (mapping && !mapping.needsSync(document.getChecksum())) {
      return {
        status: 'unchanged',
        pageId: mapping.getPageId()
      };
    }

    // 4. Handle dry run
    if (request.dryRun) {
      return {
        status: mapping ? 'updated' : 'created',
        pageId: 'dry-run'
      };
    }

    // 5. Create or update page
    let page: Page;
    if (mapping) {
      const existingPage = await this.pageRepo.findById(mapping.getPageId());
      if (!existingPage) {
        // Page was deleted in Notion, recreate it
        page = await this.createPage(document);
      } else {
        page = await this.updatePage(existingPage, document);
      }
    } else {
      page = await this.createPage(document);
    }

    // 6. Save or update mapping
    const newMapping = new PageMapping(
      request.filePath,
      page.getId(),
      document.getChecksum(),
      new Date()
    );
    await this.mappingRepo.save(newMapping);

    // 7. Update bidirectional links
    await this.linkUpdater.updateLinks(document, page);

    return {
      status: mapping ? 'updated' : 'created',
      pageId: page.getId(),
      notionUrl: this.generateNotionUrl(page.getId())
    };
  }

  private async createPage(document: Document): Promise<Page> {
    const blocks = await this.convertToBlocks(document);
    const page = new Page(
      '', // ID will be assigned by Notion
      document.getTitle(),
      blocks,
      { sourceFile: document.getPath() },
      new PagePermissions('none')
    );
    return this.pageRepo.create(page);
  }

  private async updatePage(existingPage: Page, document: Document): Promise<Page> {
    const blocks = await this.convertToBlocks(document);
    const updatedPage = existingPage
      .withBlocks(blocks);
    return this.pageRepo.update(updatedPage);
  }

  private async convertToBlocks(document: Document): Promise<Block[]> {
    // This is a simplified version - in a real implementation,
    // you would parse the markdown content and convert it to Notion blocks
    const blocks: Block[] = [];
    
    // Add content as a single paragraph block for now
    blocks.push(new Block('paragraph', { 
      text: document.getContent() 
    }));
    
    return blocks;
  }

  private generateNotionUrl(pageId: string): string {
    // In a real implementation, this would use the actual workspace URL
    return `https://notion.so/${pageId}`;
  }
}