import * as core from '@actions/core';
import { Client } from '@notionhq/client';
import { SyncPageUseCaseImpl } from '../../application/useCases/SyncPageUseCase';
import { GitHubActionController, ActionConfig } from '../../adapters/controllers/GitHubActionController';
import { FileSystemMarkdownRepository } from '../../adapters/repositories/FileSystemMarkdownRepository';
import { NotionGateway } from '../../adapters/gateways/NotionGateway';
import { JsonFileMappingRepository } from '../../adapters/repositories/JsonFileMappingRepository';
import { BidirectionalLinkUpdater } from '../../application/services/BidirectionalLinkUpdater';
import { MarkdownParser } from '../parsers/MarkdownParser';

export class DIContainer {
  private readonly container = new Map<string, any>();

  constructor() {
    this.registerDependencies();
  }

  private registerDependencies(): void {
    // Get configuration from GitHub Action inputs
    const config = this.loadConfig();
    
    // Infrastructure
    const notionClient = new Client({ 
      auth: config.notionToken 
    });
    const markdownParser = new MarkdownParser();
    
    // Repositories
    const documentRepo = new FileSystemMarkdownRepository(
      process.cwd(),
      markdownParser
    );
    const pageRepo = new NotionGateway(notionClient);
    const mappingRepo = new JsonFileMappingRepository('.notion-page-ids.json');
    
    // Services
    const linkUpdater = new BidirectionalLinkUpdater(
      documentRepo,
      pageRepo,
      config.githubToken
    );
    
    // Use Cases
    const syncPageUseCase = new SyncPageUseCaseImpl(
      documentRepo,
      pageRepo,
      mappingRepo,
      linkUpdater
    );
    
    // Controllers
    const actionController = new GitHubActionController(
      syncPageUseCase,
      config
    );
    
    this.container.set('actionController', actionController);
  }

  get<T>(key: string): T {
    const dependency = this.container.get(key);
    if (!dependency) {
      throw new Error(`Dependency not found: ${key}`);
    }
    return dependency;
  }

  private loadConfig(): ActionConfig {
    return {
      notionToken: core.getInput('notion-token', { required: true }),
      githubToken: core.getInput('github-token') || process.env.GITHUB_TOKEN || '',
      databaseId: core.getInput('database-id') || undefined,
      parentPageId: core.getInput('parent-page-id') || undefined,
      filesPattern: core.getInput('files-pattern') || '**/*.md',
      configFile: core.getInput('config-file') || '.notion-sync.yml',
      dryRun: core.getBooleanInput('dry-run'),
      enableBidirectionalLinks: core.getBooleanInput('enable-bidirectional-links'),
      linkStyle: core.getInput('link-style') || 'yaml,callout'
    };
  }
}