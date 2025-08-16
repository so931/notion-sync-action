import * as core from '@actions/core';
import * as github from '@actions/github';
import { SyncPageUseCase } from '../../application/useCases/SyncPageUseCase';

export interface ActionConfig {
  notionToken: string;
  githubToken: string;
  databaseId?: string;
  parentPageId?: string;
  filesPattern: string;
  configFile?: string;
  dryRun: boolean;
  enableBidirectionalLinks: boolean;
  linkStyle: string;
}

interface SyncResult {
  file: string;
  status: string;
  pageId: string;
  notionUrl?: string;
  error?: string;
}

export class GitHubActionController {
  constructor(
    private readonly syncPageUseCase: SyncPageUseCase,
    private readonly config: ActionConfig
  ) {}

  async run(): Promise<void> {
    try {
      core.info('Starting Notion sync...');
      
      const files = await this.getChangedFiles();
      const markdownFiles = files.filter(file => this.shouldSync(file));
      
      core.info(`Found ${markdownFiles.length} markdown files to sync`);
      
      const results: SyncResult[] = [];
      
      for (const file of markdownFiles) {
        try {
          core.info(`Syncing ${file}...`);
          
          const result = await this.syncPageUseCase.execute({
            filePath: file,
            dryRun: this.config.dryRun
          });
          
          results.push({
            file,
            status: result.status,
            pageId: result.pageId,
            notionUrl: result.notionUrl
          });
          
          core.info(`✓ ${file}: ${result.status}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          core.warning(`✗ ${file}: ${errorMessage}`);
          
          results.push({
            file,
            status: 'error',
            pageId: '',
            error: errorMessage
          });
        }
      }
      
      this.setOutputs(results);
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(error.message);
      } else {
        core.setFailed('Unknown error occurred');
      }
    }
  }

  private async getChangedFiles(): Promise<string[]> {
    // In a real implementation, this would use the GitHub API to get changed files
    // For now, we'll use a simple glob pattern
    const glob = await import('glob');
    return glob.glob(this.config.filesPattern);
  }

  private shouldSync(file: string): boolean {
    return file.endsWith('.md');
  }

  private setOutputs(results: SyncResult[]): void {
    const successCount = results.filter(r => r.status !== 'error').length;
    
    core.setOutput('synced-count', successCount.toString());
    core.setOutput('page-urls', JSON.stringify(
      results
        .filter(r => r.notionUrl)
        .map(r => ({ file: r.file, url: r.notionUrl }))
    ));
    core.setOutput('sync-report', this.generateReport(results));
  }

  private generateReport(results: SyncResult[]): string {
    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const unchanged = results.filter(r => r.status === 'unchanged').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    const report = {
      total: results.length,
      created,
      updated,
      unchanged,
      errors,
      details: results
    };
    
    return JSON.stringify(report, null, 2);
  }
}