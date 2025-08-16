import { Block, CalloutBlock } from '../valueObjects/Block';
import { PagePermissions } from '../valueObjects/PagePermissions';

export interface PageMetadata {
  sourceFile?: string;
  githubUrl?: string;
  notionUrl?: string;
  lastCommit?: string;
  [key: string]: any;
}

export class Page {
  constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly blocks: Block[],
    private readonly metadata: PageMetadata,
    private readonly permissions: PagePermissions
  ) {}

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getBlocks(): Block[] {
    return this.blocks;
  }

  getMetadata(): PageMetadata {
    return this.metadata;
  }

  getPermissions(): PagePermissions {
    return this.permissions;
  }

  isReadOnly(): boolean {
    return this.permissions.isReadOnly();
  }

  withGitHubLink(url: string): Page {
    const linkText = `📄 View source on GitHub\n${url}`;
    const linkBlock = new CalloutBlock(linkText);
    
    const newBlocks = [linkBlock, ...this.blocks];
    const newMetadata = { ...this.metadata, githubUrl: url };
    
    return new Page(
      this.id,
      this.title,
      newBlocks,
      newMetadata,
      this.permissions
    );
  }

  withBlocks(blocks: Block[]): Page {
    return new Page(
      this.id,
      this.title,
      blocks,
      this.metadata,
      this.permissions
    );
  }
}