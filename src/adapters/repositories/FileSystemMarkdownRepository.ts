import { promises as fs } from 'fs';
import { join } from 'path';
import { Document } from '../../domain/entities/Document';
import { DocumentRepository } from '../../application/ports/DocumentRepository';
import { MarkdownParser } from '../../infrastructure/parsers/MarkdownParser';
import { createHash } from 'crypto';

export class FileSystemMarkdownRepository implements DocumentRepository {
  constructor(
    private readonly basePath: string,
    private readonly parser: MarkdownParser
  ) {}

  async findByPath(path: string): Promise<Document | null> {
    const fullPath = join(this.basePath, path);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const { frontmatter, body } = this.parser.parse(content);
      const checksum = this.calculateChecksum(content);
      
      return new Document(path, body, frontmatter, checksum);
    } catch (error) {
      // File doesn't exist
      return null;
    }
  }

  async save(document: Document): Promise<void> {
    const fullPath = join(this.basePath, document.getPath());
    const content = this.parser.serialize(
      document.getFrontmatter(),
      document.getContent()
    );
    
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}