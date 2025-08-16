import { Page } from '../../../../src/domain/entities/Page';
import { PagePermissions } from '../../../../src/domain/valueObjects/PagePermissions';
import { Block, CalloutBlock } from '../../../../src/domain/valueObjects/Block';

describe('Page', () => {
  describe('constructor', () => {
    it('should create a page with provided values', () => {
      // Arrange
      const id = 'page-123';
      const title = 'Test Page';
      const blocks: Block[] = [];
      const metadata = { sourceFile: 'test.md' };
      const permissions = new PagePermissions('none');
      
      // Act
      const page = new Page(id, title, blocks, metadata, permissions);
      
      // Assert
      expect(page.getId()).toBe(id);
      expect(page.getTitle()).toBe(title);
      expect(page.getBlocks()).toEqual(blocks);
      expect(page.getMetadata()).toEqual(metadata);
      expect(page.getPermissions()).toBe(permissions);
    });
  });

  describe('isReadOnly', () => {
    it('should return true when permissions are read-only', () => {
      // Arrange
      const permissions = new PagePermissions('none');
      const page = new Page('id', 'title', [], {}, permissions);
      
      // Act
      const isReadOnly = page.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(true);
    });

    it('should return false when permissions allow editing', () => {
      // Arrange
      const permissions = new PagePermissions('full');
      const page = new Page('id', 'title', [], {}, permissions);
      
      // Act
      const isReadOnly = page.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(false);
    });
  });

  describe('withGitHubLink', () => {
    it('should prepend GitHub link block to existing blocks', () => {
      // Arrange
      const existingBlock = new Block('paragraph', { text: 'Content' });
      const page = new Page('id', 'title', [existingBlock], {}, new PagePermissions('none'));
      const githubUrl = 'https://github.com/user/repo/blob/main/test.md';
      
      // Act
      const updated = page.withGitHubLink(githubUrl);
      
      // Assert
      const blocks = updated.getBlocks();
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toBeInstanceOf(CalloutBlock);
      expect(blocks[0].getContent().text).toContain('View source on GitHub');
      expect(blocks[0].getContent().text).toContain(githubUrl);
      expect(blocks[1]).toBe(existingBlock);
    });

    it('should update metadata with GitHub URL', () => {
      // Arrange
      const page = new Page('id', 'title', [], { existing: 'data' }, new PagePermissions('none'));
      const githubUrl = 'https://github.com/user/repo/blob/main/test.md';
      
      // Act
      const updated = page.withGitHubLink(githubUrl);
      
      // Assert
      expect(updated.getMetadata()).toEqual({
        existing: 'data',
        githubUrl: githubUrl
      });
    });

    it('should return a new Page instance', () => {
      // Arrange
      const page = new Page('id', 'title', [], {}, new PagePermissions('none'));
      const githubUrl = 'https://github.com/user/repo/blob/main/test.md';
      
      // Act
      const updated = page.withGitHubLink(githubUrl);
      
      // Assert
      expect(updated).not.toBe(page);
      expect(updated.getId()).toBe(page.getId());
      expect(updated.getTitle()).toBe(page.getTitle());
    });
  });

  describe('withBlocks', () => {
    it('should replace all blocks', () => {
      // Arrange
      const oldBlock = new Block('paragraph', { text: 'old' });
      const newBlock = new Block('paragraph', { text: 'new' });
      const page = new Page('id', 'title', [oldBlock], {}, new PagePermissions('none'));
      
      // Act
      const updated = page.withBlocks([newBlock]);
      
      // Assert
      expect(updated.getBlocks()).toEqual([newBlock]);
      expect(updated).not.toBe(page);
    });
  });
});