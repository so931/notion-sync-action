export class Document {
  constructor(
    private readonly path: string,
    private readonly content: string,
    private readonly frontmatter: Record<string, any>,
    private readonly checksum: string
  ) {}

  getPath(): string {
    return this.path;
  }

  getContent(): string {
    return this.content;
  }

  getFrontmatter(): Record<string, any> {
    return this.frontmatter;
  }

  getChecksum(): string {
    return this.checksum;
  }

  getTitle(): string {
    return this.frontmatter.title || this.extractTitleFromPath();
  }

  hasNotionUrl(): boolean {
    return !!this.frontmatter.notion_url;
  }

  withNotionUrl(url: string): Document {
    return new Document(
      this.path,
      this.content,
      { ...this.frontmatter, notion_url: url },
      this.checksum
    );
  }

  withUpdatedFrontmatter(updates: Record<string, any>): Document {
    return new Document(
      this.path,
      this.content,
      { ...this.frontmatter, ...updates },
      this.checksum
    );
  }

  private extractTitleFromPath(): string {
    const filename = this.path.split('/').pop() || '';
    return filename.replace('.md', '');
  }
}