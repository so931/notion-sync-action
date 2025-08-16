import { Document } from '../../domain/entities/Document';
import { Page } from '../../domain/entities/Page';
import { DocumentRepository } from '../ports/DocumentRepository';
import { PageRepository } from '../ports/PageRepository';
import { LinkUpdater } from './LinkUpdater';

export class BidirectionalLinkUpdater implements LinkUpdater {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly pageRepo: PageRepository,
    private readonly githubToken: string
  ) {}

  async updateLinks(document: Document, page: Page): Promise<void> {
    // Update the document with the Notion URL
    if (!document.hasNotionUrl()) {
      const notionUrl = `https://notion.so/${page.getId()}`;
      const updatedDocument = document
        .withNotionUrl(notionUrl)
        .withUpdatedFrontmatter({
          last_synced: new Date().toISOString()
        });
      
      await this.documentRepo.save(updatedDocument);
    }

    // Update the page with the GitHub link
    if (!page.getMetadata().githubUrl) {
      const githubUrl = this.buildGitHubUrl(document.getPath());
      const updatedPage = page.withGitHubLink(githubUrl);
      await this.pageRepo.update(updatedPage);
    }
  }

  private buildGitHubUrl(filePath: string): string {
    // In a real implementation, this would use the GitHub context
    // to build the correct URL
    const repo = process.env.GITHUB_REPOSITORY || 'owner/repo';
    const branch = process.env.GITHUB_REF_NAME || 'main';
    return `https://github.com/${repo}/blob/${branch}/${filePath}`;
  }
}