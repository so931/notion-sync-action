import { Block, CalloutBlock } from '../../../../src/domain/valueObjects/Block';

describe('Block', () => {
  describe('constructor', () => {
    it('should create a block with type and content', () => {
      // Arrange
      const blockType = 'paragraph';
      const content = { text: 'Hello, world!' };
      
      // Act
      const block = new Block(blockType, content);
      
      // Assert
      expect(block.getType()).toBe(blockType);
      expect(block.getContent()).toEqual(content);
    });
  });

  describe('equality', () => {
    it('should consider blocks with same data as equal', () => {
      // Arrange
      const block1 = new Block('paragraph', { text: 'Same' });
      const block2 = new Block('paragraph', { text: 'Same' });
      
      // Act & Assert
      expect(block1.equals(block2)).toBe(true);
    });

    it('should consider blocks with different types as not equal', () => {
      // Arrange
      const block1 = new Block('paragraph', { text: 'Same' });
      const block2 = new Block('heading_1', { text: 'Same' });
      
      // Act & Assert
      expect(block1.equals(block2)).toBe(false);
    });

    it('should consider blocks with different content as not equal', () => {
      // Arrange
      const block1 = new Block('paragraph', { text: 'Text 1' });
      const block2 = new Block('paragraph', { text: 'Text 2' });
      
      // Act & Assert
      expect(block1.equals(block2)).toBe(false);
    });
  });
});

describe('CalloutBlock', () => {
  describe('constructor', () => {
    it('should create a callout block with text and default icon', () => {
      // Arrange
      const text = '📄 Important message';
      
      // Act
      const block = new CalloutBlock(text);
      
      // Assert
      expect(block.getType()).toBe('callout');
      expect(block.getContent()).toEqual({
        text: text,
        icon: '📄'
      });
    });

    it('should create a callout block with custom icon', () => {
      // Arrange
      const text = 'Warning message';
      const icon = '⚠️';
      
      // Act
      const block = new CalloutBlock(text, icon);
      
      // Assert
      expect(block.getType()).toBe('callout');
      expect(block.getContent()).toEqual({
        text: text,
        icon: icon
      });
    });
  });

  describe('inheritance', () => {
    it('should be an instance of Block', () => {
      // Arrange & Act
      const callout = new CalloutBlock('Test');
      
      // Assert
      expect(callout instanceof Block).toBe(true);
    });
  });
});