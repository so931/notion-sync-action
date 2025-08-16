# TypeScript TDD Guide for Notion Sync

## TDD Process Overview

Following Test-Driven Development with the AAA (Arrange-Act-Assert) pattern using Jest for TypeScript.

### Red-Green-Refactor Cycle
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code while keeping tests green

## AAA Pattern Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do expected behavior when given specific input', () => {
      // Arrange
      const input = 'test';
      const expected = 'result';
      
      // Act
      const actual = component.method(input);
      
      // Assert
      expect(actual).toBe(expected);
    });
  });
});
```

## Test Organization

```
tests/
├── unit/                    
│   ├── domain/             
│   │   ├── entities/
│   │   └── valueObjects/
│   ├── application/        
│   │   └── useCases/
│   └── adapters/          
│       ├── controllers/
│       └── repositories/
├── integration/            
├── fixtures/
└── setup.ts
```

## Example: TDD for Document Entity

### Step 1: Write Failing Test (Red)

```typescript
// tests/unit/domain/entities/Document.test.ts
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
    });
  });
});
```

### Step 2: Implement Entity (Green)

```typescript
// src/domain/entities/Document.ts
export class Document {
  constructor(
    private readonly path: string,
    private readonly content: string,
    private readonly frontmatter: Record<string, any>,
    private readonly checksum: string
  ) {}

  getPath(): string {
    return this.path;
  }

  getContent(): string {
    return this.content;
  }

  getFrontmatter(): Record<string, any> {
    return this.frontmatter;
  }

  getChecksum(): string {
    return this.checksum;
  }

  getTitle(): string {
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
    const filename = this.path.split('/').pop() || '';
    return filename.replace('.md', '');
  }
}
```

## Testing Value Objects

```typescript
// tests/unit/domain/valueObjects/PagePermissions.test.ts
import { PagePermissions } from '../../../../src/domain/valueObjects/PagePermissions';

describe('PagePermissions', () => {
  describe('isReadOnly', () => {
    it('should return true when edit access is none', () => {
      // Arrange
      const permissions = new PagePermissions('none');
      
      // Act
      const isReadOnly = permissions.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(true);
    });

    it('should return false when edit access is allowed', () => {
      // Arrange
      const permissions = new PagePermissions('full');
      
      // Act
      const isReadOnly = permissions.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(false);
    });
  });
});
```

## Testing Use Cases with Mocks

```typescript
// tests/unit/application/useCases/SyncPageUseCase.test.ts
import { SyncPageUseCaseImpl } from '../../../../src/application/useCases/SyncPageUseCase';
import { DocumentRepository } from '../../../../src/application/ports/DocumentRepository';
import { PageRepository } from '../../../../src/application/ports/PageRepository';
import { PageMappingRepository } from '../../../../src/application/ports/PageMappingRepository';
import { Document } from '../../../../src/domain/entities/Document';
import { Page } from '../../../../src/domain/entities/Page';
import { PageMapping } from '../../../../src/domain/entities/PageMapping';

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
      save: jest.fn()
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

      // Act
      const result = await syncPageUseCase.execute({ filePath });

      // Assert
      expect(result.status).toBe('created');
      expect(result.pageId).toBe('new-page-id');
      expect(mockPageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test'
        })
      );
      expect(mockMappingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: filePath,
          pageId: 'new-page-id'
        })
      );
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

      // Act
      const result = await syncPageUseCase.execute({ filePath });

      // Assert
      expect(result.status).toBe('updated');
      expect(result.pageId).toBe('existing-page-id');
      expect(mockPageRepo.update).toHaveBeenCalled();
      expect(mockPageRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when document not found', async () => {
      // Arrange
      const filePath = 'non-existent.md';
      mockDocumentRepo.findByPath.mockResolvedValue(null);

      // Act & Assert
      await expect(syncPageUseCase.execute({ filePath }))
        .rejects
        .toThrow('Document not found: non-existent.md');
    });
  });
});
```

## Testing Controllers

```typescript
// tests/unit/adapters/controllers/GitHubActionController.test.ts
import { GitHubActionController } from '../../../../src/adapters/controllers/GitHubActionController';
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

    controller = new GitHubActionController(mockSyncPageUseCase, {
      notionToken: 'test-token',
      dryRun: false,
      filesPattern: '**/*.md'
    });
  });

  describe('run', () => {
    it('should sync changed markdown files', async () => {
      // Arrange
      const changedFiles = ['docs/test.md', 'blog/post.md', 'src/code.js'];
      const syncResults = [
        { status: 'created', pageId: 'page-1', notionUrl: 'https://notion.so/page-1' },
        { status: 'updated', pageId: 'page-2', notionUrl: 'https://notion.so/page-2' }
      ];

      jest.spyOn(controller as any, 'getChangedFiles').mockResolvedValue(changedFiles);
      mockSyncPageUseCase.execute
        .mockResolvedValueOnce(syncResults[0])
        .mockResolvedValueOnce(syncResults[1]);

      // Act
      await controller.run();

      // Assert
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledWith({ filePath: 'docs/test.md', dryRun: false });
      expect(mockSyncPageUseCase.execute).toHaveBeenCalledWith({ filePath: 'blog/post.md', dryRun: false });
      expect(mockCore.setOutput).toHaveBeenCalledWith('synced-count', 2);
      expect(mockCore.setOutput).toHaveBeenCalledWith('page-urls', expect.any(String));
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
  });
});
```

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/infrastructure/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

## Test Setup

```typescript
// tests/setup.ts
import 'jest-extended';

// Global test setup
beforeAll(() => {
  // Setup test environment
});

afterAll(() => {
  // Cleanup
});

// Custom matchers
expect.extend({
  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
});
```

## Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:debug": "node --inspect-brk ./node_modules/.bin/jest --runInBand"
  }
}
```

## Testing Best Practices

### 1. Test Naming Convention
```typescript
describe('Component', () => {
  it('should [expected behavior] when [condition]', () => {
    // Test implementation
  });
});
```

### 2. Use Test Builders for Complex Objects
```typescript
// tests/builders/DocumentBuilder.ts
export class DocumentBuilder {
  private path = 'test.md';
  private content = '';
  private frontmatter = {};
  private checksum = 'abc123';

  withPath(path: string): this {
    this.path = path;
    return this;
  }

  withFrontmatter(frontmatter: Record<string, any>): this {
    this.frontmatter = frontmatter;
    return this;
  }

  build(): Document {
    return new Document(this.path, this.content, this.frontmatter, this.checksum);
  }
}

// Usage in tests
const document = new DocumentBuilder()
  .withPath('docs/test.md')
  .withFrontmatter({ title: 'Test' })
  .build();
```

### 3. Group Related Tests
```typescript
describe('PagePermissions', () => {
  describe('when created with none access', () => {
    const permissions = new PagePermissions('none');

    it('should be read-only', () => {
      expect(permissions.isReadOnly()).toBe(true);
    });

    it('should not allow edits', () => {
      expect(permissions.canEdit()).toBe(false);
    });
  });
});
```

### 4. Use Parameterized Tests
```typescript
describe('PagePermissions', () => {
  it.each([
    ['none', true],
    ['read', false],
    ['comment', false],
    ['edit', false],
    ['full', false],
  ])('should return %s for isReadOnly when access is %s', (access, expected) => {
    // Arrange
    const permissions = new PagePermissions(access);
    
    // Act
    const result = permissions.isReadOnly();
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Integration Testing

```typescript
// tests/integration/NotionSync.test.ts
import { DIContainer } from '../../src/infrastructure/config/DIContainer';
import { GitHubActionController } from '../../src/adapters/controllers/GitHubActionController';

describe('Notion Sync Integration', () => {
  let container: DIContainer;
  let controller: GitHubActionController;

  beforeEach(() => {
    container = new DIContainer();
    controller = container.get<GitHubActionController>('actionController');
  });

  it('should sync markdown file to Notion', async () => {
    // This test would use a test Notion workspace
    // and verify the complete flow works end-to-end
  });
});
```