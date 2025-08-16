import { PageMapping } from '../../../../src/domain/entities/PageMapping';

describe('PageMapping', () => {
  describe('constructor', () => {
    it('should create a page mapping with provided values', () => {
      // Arrange
      const filePath = 'docs/test.md';
      const pageId = 'page-123';
      const checksum = 'abc123';
      const lastSynced = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const mapping = new PageMapping(filePath, pageId, checksum, lastSynced);
      
      // Assert
      expect(mapping.getFilePath()).toBe(filePath);
      expect(mapping.getPageId()).toBe(pageId);
      expect(mapping.getChecksum()).toBe(checksum);
      expect(mapping.getLastSynced()).toEqual(lastSynced);
    });

    it('should create a page mapping without lastSynced', () => {
      // Arrange
      const filePath = 'docs/test.md';
      const pageId = 'page-123';
      const checksum = 'abc123';
      
      // Act
      const mapping = new PageMapping(filePath, pageId, checksum);
      
      // Assert
      expect(mapping.getFilePath()).toBe(filePath);
      expect(mapping.getPageId()).toBe(pageId);
      expect(mapping.getChecksum()).toBe(checksum);
      expect(mapping.getLastSynced()).toBeUndefined();
    });
  });

  describe('needsSync', () => {
    it('should return true when checksums differ', () => {
      // Arrange
      const mapping = new PageMapping('test.md', 'page-123', 'old-checksum');
      const newChecksum = 'new-checksum';
      
      // Act
      const needsSync = mapping.needsSync(newChecksum);
      
      // Assert
      expect(needsSync).toBe(true);
    });

    it('should return false when checksums match', () => {
      // Arrange
      const checksum = 'same-checksum';
      const mapping = new PageMapping('test.md', 'page-123', checksum);
      
      // Act
      const needsSync = mapping.needsSync(checksum);
      
      // Assert
      expect(needsSync).toBe(false);
    });
  });

  describe('withUpdatedSync', () => {
    it('should return new mapping with updated checksum and timestamp', () => {
      // Arrange
      const originalTime = new Date('2024-01-01T00:00:00Z');
      const mapping = new PageMapping('test.md', 'page-123', 'old', originalTime);
      const newChecksum = 'new-checksum';
      const newTime = new Date('2024-01-15T10:30:00Z');
      
      // Act
      const updated = mapping.withUpdatedSync(newChecksum, newTime);
      
      // Assert
      expect(updated.getChecksum()).toBe(newChecksum);
      expect(updated.getLastSynced()).toEqual(newTime);
      expect(updated.getFilePath()).toBe(mapping.getFilePath());
      expect(updated.getPageId()).toBe(mapping.getPageId());
      expect(updated).not.toBe(mapping); // New instance
    });
  });
});