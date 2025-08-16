import { GitHubActionController } from '../../../../src/adapters/controllers/GitHubActionController';
import { SyncPageUseCase } from '../../../../src/application/useCases/SyncPageUseCase';
import * as core from '@actions/core';
import * as github from '@actions/github';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('GitHubActionController', () => {
  let controller: GitHubActionController;
  let mockSyncPageUseCase: jest.Mocked<SyncPageUseCase>;
  let mockCore: jest.Mocked<typeof core>;

  beforeEach(() => {
    // Arrange
    mockSyncPageUseCase = {
      execute: jest.fn()
    };
    mockCore = core as jest.Mocked<typeof core>;
    mockCore.getInput = jest.fn();
    mockCore.setOutput = jest.fn();
    mockCore.setFailed = jest.fn();
    mockCore.info = jest.fn();
    mockCore.warning = jest.fn();

    controller = new GitHubActionController(mockSyncPageUseCase, {
      notionToken: 'test-token',
      githubToken: 'github-token',
      dryRun: false,
      filesPattern: '**/*.md',
      enableBidirectionalLinks: true
    });
  });

  describe('run', () => {
    it('should sync changed markdown files', async () => {
      // Arrange
      const changedFiles = ['docs/test.md', 'blog/post.md', 'src/code.js'];
      const syncResults = [
        { status: 'created' as const, pageId: 'page-1', notionUrl: 'https://notion.so/page-1' },
        { status: 'updated' as const, pageId: 'page-2', notionUrl: 'https://notion.so/page-2' }
      ];

      jest.spyOn(controller as any, 'getChangedFiles').mockResolvedValue(changedFiles);
      mockSyncPageUseCase.execute
        .mockResolvedValueOnce(syncResults[0])
        .mockResolvedValueOnce(syncResults[1]);

      // Act
      await controller.run();

      // Assert
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledWith({ 
        filePath: 'docs/test.md', 
        dryRun: false 
      });
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledWith({ 
        filePath: 'blog/post.md', 
        dryRun: false 
      });
      expect(mockCore.setOutput).toHaveBeenCalledWith('synced-count', '2');
      expect(mockCore.setOutput).toHaveBeenCalledWith('page-urls', expect.any(String));
    });

    it('should skip non-markdown files', async () => {
      // Arrange
      const changedFiles = ['src/code.js', 'README.txt', 'docs/test.md'];
      jest.spyOn(controller as any, 'getChangedFiles').mockResolvedValue(changedFiles);
      mockSyncPageUseCase.execute.mockResolvedValue({
        status: 'created',
        pageId: 'page-1',
        notionUrl: 'https://notion.so/page-1'
      });

      // Act
      await controller.run();

      // Assert
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledWith({ 
        filePath: 'docs/test.md', 
        dryRun: false 
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Sync failed');
      jest.spyOn(controller as any, 'getChangedFiles').mockRejectedValue(error);

      // Act
      await controller.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('Sync failed');
    });

    it('should generate sync report', async () => {
      // Arrange
      const changedFiles = ['docs/test.md'];
      const syncResult = {
        status: 'created' as const,
        pageId: 'page-1',
        notionUrl: 'https://notion.so/page-1'
      };

      jest.spyOn(controller as any, 'getChangedFiles').mockResolvedValue(changedFiles);
      mockSyncPageUseCase.execute.mockResolvedValue(syncResult);

      // Act
      await controller.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'sync-report',
        expect.stringContaining('created')
      );
    });
  });
});