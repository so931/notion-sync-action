# TypeScript Clean Architecture for Notion Sync

## Architecture Overview

Following Uncle Bob's Clean Architecture principles with TypeScript, ensuring clear separation of concerns and dependency inversion.

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │   GitHub    │  │   Notion    │  │    File System        │ │
│  │   Action    │  │    API      │  │    (Markdown)         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬─────────────┘ │
└─────────┼────────────────┼──────────────────┼──────────────────┘
          │                │                  │
┌─────────┼────────────────┼──────────────────┼──────────────────┐
│         │         Interface Adapters         │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼────────────┐    │
│  │   Action    │  │   Notion    │  │    Markdown        │    │
│  │  Controller │  │   Gateway   │  │    Repository      │    │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬─────────┘    │
└─────────┼────────────────┼──────────────────┼──────────────────┘
          │                │                  │
┌─────────┼────────────────┼──────────────────┼──────────────────┐
│         │          Application Layer         │                  │
│  ┌──────▼────────────────▼──────────────────▼────────────┐    │
│  │                    Use Cases                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │    │
│  │  │ SyncPage │  │UpdateLink│  │ ManagePageMapping │  │    │
│  │  └──────────┘  └──────────┘  └───────────────────┘  │    │
│  └───────────────────────┬───────────────────────────────┘    │
└──────────────────────────┼─────────────────────────────────────┘
                          │
┌──────────────────────────▼─────────────────────────────────────┐
│                     Domain Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Document │  │   Page   │  │   Link   │  │  PageMapping│  │
│  │  Entity  │  │  Entity  │  │  Value   │  │    Entity   │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
notion-sync/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Document.ts
│   │   │   ├── Page.ts
│   │   │   └── PageMapping.ts
│   │   ├── valueObjects/
│   │   │   ├── Link.ts
│   │   │   ├── Block.ts
│   │   │   └── PagePermissions.ts
│   │   └── errors/
│   │       └── DomainErrors.ts
│   ├── application/
│   │   ├── useCases/
│   │   │   ├── SyncPageUseCase.ts
│   │   │   └── UpdateLinksUseCase.ts
│   │   ├── ports/
│   │   │   ├── DocumentRepository.ts
│   │   │   ├── PageRepository.ts
│   │   │   └── PageMappingRepository.ts
│   │   └── services/
│   │       └── LinkUpdater.ts
│   ├── adapters/
│   │   ├── controllers/
│   │   │   └── GitHubActionController.ts
│   │   ├── gateways/
│   │   │   └── NotionGateway.ts
│   │   └── repositories/
│   │       ├── FileSystemMarkdownRepository.ts
│   │       └── JsonFileMappingRepository.ts
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── DIContainer.ts
│   │   ├── parsers/
│   │   │   └── MarkdownParser.ts
│   │   └── clients/
│   │       └── NotionClient.ts
│   └── main.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── action.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Layer Responsibilities

### 1. Domain Layer (Enterprise Business Rules)

Pure business logic with no external dependencies.

```typescript
// domain/entities/Document.ts
export class Document {
  constructor(
    private readonly path: string,
    private readonly content: string,
    private readonly frontmatter: Record<string, any>,
    private readonly checksum: string
  ) {}

  get title(): string {
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

  private extractTitleFromPath(): string {
    return this.path.split('/').pop()?.replace('.md', '') || 'Untitled';
  }
}

// domain/entities/Page.ts
export class Page {
  constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly blocks: Block[],
    private readonly metadata: PageMetadata,
    private readonly permissions: PagePermissions
  ) {}

  isReadOnly(): boolean {
    return this.permissions.editAccess === 'none';
  }

  withGitHubLink(url: string): Page {
    const linkBlock = new CalloutBlock('📄 View source on GitHub', url);
    return new Page(
      this.id,
      this.title,
      [linkBlock, ...this.blocks],
      { ...this.metadata, githubUrl: url },
      this.permissions
    );
  }
}

// domain/valueObjects/Link.ts
export class Link {
  constructor(
    private readonly url: string,
    private readonly type: 'notion' | 'github'
  ) {
    if (!this.isValid()) {
      throw new Error(`Invalid ${type} link: ${url}`);
    }
  }

  private isValid(): boolean {
    try {
      new URL(this.url);
      return true;
    } catch {
      return false;
    }
  }

  toString(): string {
    return this.url;
  }
}
```

### 2. Application Layer (Application Business Rules)

Use cases that orchestrate the flow of data to and from entities.

```typescript
// application/useCases/SyncPageUseCase.ts
export interface SyncPageUseCase {
  execute(request: SyncPageRequest): Promise<SyncPageResponse>;
}

export class SyncPageUseCaseImpl implements SyncPageUseCase {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly pageRepo: PageRepository,
    private readonly mappingRepo: PageMappingRepository,
    private readonly linkUpdater: LinkUpdater
  ) {}

  async execute(request: SyncPageRequest): Promise<SyncPageResponse> {
    // 1. Load document
    const document = await this.documentRepo.findByPath(request.filePath);
    if (!document) {
      throw new DocumentNotFoundError(request.filePath);
    }

    // 2. Check existing mapping
    const mapping = await this.mappingRepo.findByPath(request.filePath);
    
    // 3. Create or update page
    let page: Page;
    if (mapping) {
      const existingPage = await this.pageRepo.findById(mapping.pageId);
      page = await this.updatePage(existingPage, document);
    } else {
      page = await this.createPage(document);
      await this.mappingRepo.save(new PageMapping(
        request.filePath,
        page.id,
        document.checksum
      ));
    }

    // 4. Update bidirectional links
    await this.linkUpdater.updateLinks(document, page);

    return {
      status: mapping ? 'updated' : 'created',
      pageId: page.id,
      notionUrl: page.url
    };
  }

  private async createPage(document: Document): Promise<Page> {
    const blocks = await this.convertToBlocks(document);
    const page = new Page(
      generateId(),
      document.title,
      blocks,
      { sourceFile: document.path },
      { editAccess: 'none' }
    );
    return this.pageRepo.create(page);
  }

  private async updatePage(page: Page, document: Document): Promise<Page> {
    const blocks = await this.convertToBlocks(document);
    const updatedPage = page.withBlocks(blocks);
    return this.pageRepo.update(updatedPage);
  }
}

// application/ports/repositories.ts
export interface DocumentRepository {
  findByPath(path: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
}

export interface PageRepository {
  findById(id: string): Promise<Page | null>;
  create(page: Page): Promise<Page>;
  update(page: Page): Promise<Page>;
}

export interface PageMappingRepository {
  findByPath(path: string): Promise<PageMapping | null>;
  save(mapping: PageMapping): Promise<void>;
}
```

### 3. Interface Adapters Layer

Converts data between the format most convenient for use cases and entities, and the format most convenient for external agencies.

```typescript
// adapters/controllers/GitHubActionController.ts
export class GitHubActionController {
  constructor(
    private readonly syncPageUseCase: SyncPageUseCase,
    private readonly config: ActionConfig
  ) {}

  async run(): Promise<void> {
    try {
      const files = await this.getChangedFiles();
      const results = [];

      for (const file of files) {
        if (this.shouldSync(file)) {
          const result = await this.syncPageUseCase.execute({
            filePath: file,
            dryRun: this.config.dryRun
          });
          results.push(result);
        }
      }

      this.setOutputs(results);
    } catch (error) {
      core.setFailed(error.message);
    }
  }

  private shouldSync(file: string): boolean {
    return file.endsWith('.md') && !this.config.excludes.includes(file);
  }

  private setOutputs(results: SyncPageResponse[]): void {
    core.setOutput('synced-count', results.length);
    core.setOutput('page-urls', JSON.stringify(
      results.map(r => ({ file: r.filePath, url: r.notionUrl }))
    ));
  }
}

// adapters/gateways/NotionGateway.ts
export class NotionGateway implements PageRepository {
  constructor(private readonly client: NotionClient) {}

  async findById(id: string): Promise<Page | null> {
    try {
      const response = await this.client.pages.retrieve({ page_id: id });
      return this.mapToPage(response);
    } catch (error) {
      if (error.status === 404) return null;
      throw new NotionApiError('Failed to retrieve page', error);
    }
  }

  async create(page: Page): Promise<Page> {
    const request = this.mapToNotionRequest(page);
    const response = await this.client.pages.create(request);
    
    // Set permissions to read-only
    await this.setPagePermissions(response.id, 'read-only');
    
    return this.mapToPage(response);
  }

  private mapToPage(notionPage: any): Page {
    // Convert Notion API response to domain Page entity
  }

  private mapToNotionRequest(page: Page): any {
    // Convert domain Page to Notion API request
  }
}

// adapters/repositories/FileSystemMarkdownRepository.ts
export class FileSystemMarkdownRepository implements DocumentRepository {
  constructor(
    private readonly basePath: string,
    private readonly parser: MarkdownParser
  ) {}

  async findByPath(path: string): Promise<Document | null> {
    const fullPath = join(this.basePath, path);
    
    if (!await this.exists(fullPath)) {
      return null;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const { frontmatter, body } = this.parser.parse(content);
    const checksum = this.calculateChecksum(content);

    return new Document(path, body, frontmatter, checksum);
  }

  async save(document: Document): Promise<void> {
    const fullPath = join(this.basePath, document.path);
    const content = this.parser.serialize(document);
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}
```

### 4. Frameworks & Drivers Layer

The outermost layer containing frameworks and tools.

```typescript
// infrastructure/config/DIContainer.ts
export class DIContainer {
  private readonly container = new Map<string, any>();

  constructor() {
    this.registerDependencies();
  }

  private registerDependencies(): void {
    // Infrastructure
    const notionClient = new Client({ auth: process.env.NOTION_TOKEN });
    const markdownParser = new RemarkParser();

    // Repositories
    const documentRepo = new FileSystemMarkdownRepository(
      process.cwd(),
      markdownParser
    );
    const pageRepo = new NotionGateway(notionClient);
    const mappingRepo = new JsonFileMappingRepository('.notion-page-ids.json');

    // Use Cases
    const linkUpdater = new BidirectionalLinkUpdater(documentRepo, pageRepo);
    const syncPageUseCase = new SyncPageUseCaseImpl(
      documentRepo,
      pageRepo,
      mappingRepo,
      linkUpdater
    );

    // Controllers
    const actionController = new GitHubActionController(
      syncPageUseCase,
      this.loadConfig()
    );

    this.container.set('actionController', actionController);
  }

  get<T>(key: string): T {
    return this.container.get(key);
  }
}

// infrastructure/parsers/RemarkParser.ts
export class RemarkParser implements MarkdownParser {
  parse(content: string): ParsedMarkdown {
    const { data, content: body } = matter(content);
    const ast = remark().parse(body);
    return { frontmatter: data, body, ast };
  }

  serialize(document: Document): string {
    return matter.stringify(document.content, document.frontmatter);
  }
}

// main.ts - Entry point
async function main() {
  const container = new DIContainer();
  const controller = container.get<GitHubActionController>('actionController');
  await controller.run();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
```

## Clean Code Principles Applied

### 1. Single Responsibility Principle
Each class has one reason to change:
- `Document`: Manages document data
- `Page`: Manages page data
- `SyncPageUseCase`: Orchestrates page synchronization
- `NotionGateway`: Handles Notion API communication

### 2. Open/Closed Principle
- Use interfaces for all dependencies
- Easy to extend with new repositories or parsers
- New features don't require modifying existing code

### 3. Dependency Inversion Principle
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Abstractions don't depend on details

### 4. Interface Segregation Principle
- Small, focused interfaces
- Clients only depend on methods they use
- Repository interfaces are specific to their domain

### 5. Don't Repeat Yourself (DRY)
- Common logic extracted to shared utilities
- Reusable value objects for validation
- Consistent error handling patterns

### 6. YAGNI (You Aren't Gonna Need It)
- Only implement required features
- No speculative generalization
- Focus on current requirements

## Dependencies

```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.14",
    "@actions/core": "^1.10.1",
    "@actions/github": "^6.0.0",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.1",
    "remark-parse": "^11.0.0",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/jest": "^29.5.11",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```