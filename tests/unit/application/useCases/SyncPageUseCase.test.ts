import { SyncPageUseCaseImpl, SyncPageRequest, SyncPageResponse } from '../../../../src/application/useCases/SyncPageUseCase';
import { DocumentRepository } from '../../../../src/application/ports/DocumentRepository';
import { PageRepository } from '../../../../src/application/ports/PageRepository';
import { PageMappingRepository } from '../../../../src/application/ports/PageMappingRepository';
import { LinkUpdater } from '../../../../src/application/services/LinkUpdater';
import { Document } from '../../../../src/domain/entities/Document';
import { Page } from '../../../../src/domain/entities/Page';
import { PageMapping } from '../../../../src/domain/entities/PageMapping';
import { PagePermissions } from '../../../../src/domain/valueObjects/PagePermissions';
import { DocumentNotFoundError } from '../../../../src/domain/errors/DomainErrors';

describe('SyncPageUseCase', () => {
  let syncPageUseCase: SyncPageUseCaseImpl;
  let mockDocumentRepo: jest.Mocked<DocumentRepository>;
  let mockPageRepo: jest.Mocked<PageRepository>;
  let mockMappingRepo: jest.Mocked<PageMappingRepository>;
  let mockLinkUpdater: jest.Mocked<LinkUpdater>;

  beforeEach(() => {
    // Arrange - Setup mocks
    mockDocumentRepo = {
      findByPath: jest.fn(),
      save: jest.fn()
    };
    mockPageRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    mockMappingRepo = {
      findByPath: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };
    mockLinkUpdater = {
      updateLinks: jest.fn()
    };

    syncPageUseCase = new SyncPageUseCaseImpl(
      mockDocumentRepo,
      mockPageRepo,
      mockMappingRepo,
      mockLinkUpdater
    );
  });

  describe('execute', () => {
    it('should create new page when no mapping exists', async () => {
      // Arrange
      const filePath = 'docs/test.md';
      const document = new Document(filePath, 'content', { title: 'Test' }, 'checksum');
      const createdPage = new Page('new-page-id', 'Test', [], {}, new PagePermissions('none'));
      
      mockDocumentRepo.findByPath.mockResolvedValue(document);
      mockMappingRepo.findByPath.mockResolvedValue(null);
      mockPageRepo.create.mockResolvedValue(createdPage);
      mockMappingRepo.save.mockResolvedValue(undefined);
      mockLinkUpdater.updateLinks.mockResolvedValue(undefined);

      const request: SyncPageRequest = { filePath };

      // Act
      const result = await syncPageUseCase.execute(request);

      // Assert
      expect(result.status).toBe('created');
      expect(result.pageId).toBe('new-page-id');
      expect(mockPageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          getTitle: expect.any(Function)
        })
      );
      expect(mockMappingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getFilePath: expect.any(Function),
          getPageId: expect.any(Function)
        })
      );
      expect(mockLinkUpdater.updateLinks).toHaveBeenCalledWith(document, createdPage);
    });

    it('should update existing page when mapping exists', async () => {
      // Arrange
      const filePath = 'docs/test.md';
      const document = new Document(filePath, 'updated content', { title: 'Test' }, 'new-checksum');
      const mapping = new PageMapping(filePath, 'existing-page-id', 'old-checksum');
      const existingPage = new Page('existing-page-id', 'Old Title', [], {}, new PagePermissions('none'));
      const updatedPage = new Page('existing-page-id', 'Test', [], {}, new PagePermissions('none'));
      
      mockDocumentRepo.findByPath.mockResolvedValue(document);
      mockMappingRepo.findByPath.mockResolvedValue(mapping);
      mockPageRepo.findById.mockResolvedValue(existingPage);
      mockPageRepo.update.mockResolvedValue(updatedPage);
      mockMappingRepo.save.mockResolvedValue(undefined);
      mockLinkUpdater.updateLinks.mockResolvedValue(undefined);

      const request: SyncPageRequest = { filePath };

      // Act
      const result = await syncPageUseCase.execute(request);

      // Assert
      expect(result.status).toBe('updated');
      expect(result.pageId).toBe('existing-page-id');
      expect(mockPageRepo.update).toHaveBeenCalled();
      expect(mockPageRepo.create).not.toHaveBeenCalled();
      expect(mockMappingRepo.save).toHaveBeenCalled();
    });

    it('should skip sync when checksums match', async () => {
      // Arrange
      const filePath = 'docs/test.md';
      const checksum = 'same-checksum';
      const document = new Document(filePath, 'content', { title: 'Test' }, checksum);
      const mapping = new PageMapping(filePath, 'page-id', checksum);
      
      mockDocumentRepo.findByPath.mockResolvedValue(document);
      mockMappingRepo.findByPath.mockResolvedValue(mapping);

      const request: SyncPageRequest = { filePath };

      // Act
      const result = await syncPageUseCase.execute(request);

      // Assert
      expect(result.status).toBe('unchanged');
      expect(result.pageId).toBe('page-id');
      expect(mockPageRepo.create).not.toHaveBeenCalled();
      expect(mockPageRepo.update).not.toHaveBeenCalled();
      expect(mockLinkUpdater.updateLinks).not.toHaveBeenCalled();
    });

    it('should throw error when document not found', async () => {
      // Arrange
      const filePath = 'non-existent.md';
      mockDocumentRepo.findByPath.mockResolvedValue(null);

      const request: SyncPageRequest = { filePath };

      // Act & Assert
      await expect(syncPageUseCase.execute(request))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('should handle dry run without making changes', async () => {
      // Arrange
      const filePath = 'docs/test.md';
      const document = new Document(filePath, 'content', { title: 'Test' }, 'checksum');
      
      mockDocumentRepo.findByPath.mockResolvedValue(document);
      mockMappingRepo.findByPath.mockResolvedValue(null);

      const request: SyncPageRequest = { filePath, dryRun: true };

      // Act
      const result = await syncPageUseCase.execute(request);

      // Assert
      expect(result.status).toBe('created');
      expect(result.pageId).toBe('dry-run');
      expect(mockPageRepo.create).not.toHaveBeenCalled();
      expect(mockMappingRepo.save).not.toHaveBeenCalled();
      expect(mockLinkUpdater.updateLinks).not.toHaveBeenCalled();
    });
  });
});