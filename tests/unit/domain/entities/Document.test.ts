import { Document } from '../../../../src/domain/entities/Document';

describe('Document', () => {
  describe('constructor', () => {
    it('should create a document with provided values', () => {
      // Arrange
      const path = 'docs/test.md';
      const content = '# Test\nContent';
      const frontmatter = { title: 'Test Document' };
      const checksum = 'abc123';
      
      // Act
      const document = new Document(path, content, frontmatter, checksum);
      
      // Assert
      expect(document.getPath()).toBe(path);
      expect(document.getContent()).toBe(content);
      expect(document.getFrontmatter()).toEqual(frontmatter);
      expect(document.getChecksum()).toBe(checksum);
    });
  });

  describe('title', () => {
    it('should return title from frontmatter when available', () => {
      // Arrange
      const frontmatter = { title: 'My Title' };
      const document = new Document('test.md', '', frontmatter, 'abc');
      
      // Act
      const title = document.getTitle();
      
      // Assert
      expect(title).toBe('My Title');
    });

    it('should extract title from file path when frontmatter title is missing', () => {
      // Arrange
      const path = 'docs/getting-started.md';
      const document = new Document(path, '', {}, 'abc');
      
      // Act
      const title = document.getTitle();
      
      // Assert
      expect(title).toBe('getting-started');
    });

    it('should handle nested paths correctly', () => {
      // Arrange
      const path = 'docs/guides/advanced/configuration.md';
      const document = new Document(path, '', {}, 'abc');
      
      // Act
      const title = document.getTitle();
      
      // Assert
      expect(title).toBe('configuration');
    });
  });

  describe('hasNotionUrl', () => {
    it('should return true when notion_url exists in frontmatter', () => {
      // Arrange
      const frontmatter = { notion_url: 'https://notion.so/page-123' };
      const document = new Document('test.md', '', frontmatter, 'abc');
      
      // Act
      const hasUrl = document.hasNotionUrl();
      
      // Assert
      expect(hasUrl).toBe(true);
    });

    it('should return false when notion_url is missing', () => {
      // Arrange
      const document = new Document('test.md', '', {}, 'abc');
      
      // Act
      const hasUrl = document.hasNotionUrl();
      
      // Assert
      expect(hasUrl).toBe(false);
    });
  });

  describe('withNotionUrl', () => {
    it('should return new document with notion_url added to frontmatter', () => {
      // Arrange
      const original = new Document('test.md', 'content', { title: 'Test' }, 'abc');
      const notionUrl = 'https://notion.so/page-456';
      
      // Act
      const updated = original.withNotionUrl(notionUrl);
      
      // Assert
      expect(updated).not.toBe(original); // New instance
      expect(updated.getFrontmatter()).toEqual({
        title: 'Test',
        notion_url: notionUrl
      });
      expect(updated.getPath()).toBe(original.getPath());
      expect(updated.getContent()).toBe(original.getContent());
      expect(updated.getChecksum()).toBe(original.getChecksum());
    });

    it('should preserve existing frontmatter properties', () => {
      // Arrange
      const original = new Document('test.md', 'content', { 
        title: 'Test',
        tags: ['doc', 'guide'],
        author: 'John'
      }, 'abc');
      const notionUrl = 'https://notion.so/page-789';
      
      // Act
      const updated = original.withNotionUrl(notionUrl);
      
      // Assert
      expect(updated.getFrontmatter()).toEqual({
        title: 'Test',
        tags: ['doc', 'guide'],
        author: 'John',
        notion_url: notionUrl
      });
    });
  });

  describe('withUpdatedFrontmatter', () => {
    it('should update last_synced timestamp', () => {
      // Arrange
      const original = new Document('test.md', 'content', { title: 'Test' }, 'abc');
      const timestamp = '2024-01-15T10:30:00Z';
      
      // Act
      const updated = original.withUpdatedFrontmatter({ last_synced: timestamp });
      
      // Assert
      expect(updated.getFrontmatter().last_synced).toBe(timestamp);
    });
  });
});