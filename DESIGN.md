# Notion Sync GitHub Action Design

## Overview
A GitHub Action that automatically synchronizes markdown documents from a repository to Notion pages, maintaining structure and formatting.

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Markdown   │  │   Workflow   │  │  Configuration  │  │
│  │  Documents  │  │   Trigger    │  │     File        │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼──────────────────┼──────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Action Runner                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Notion Sync Action                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │   │
│  │  │  Parser  │  │  Mapper  │  │   Sync Engine   │  │   │
│  │  │  Module  │  │  Module  │  │     Module      │  │   │
│  │  └─────┬────┘  └────┬─────┘  └────────┬────────┘  │   │
│  └────────┼────────────┼─────────────────┼────────────┘   │
└──────────┼────────────┼─────────────────┼─────────────────┘
           │            │                 │
           ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Notion API                             │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │    Pages     │  │   Databases   │  │     Blocks     │  │
│  └──────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Module Descriptions

1. **Parser Module**
   - Parses markdown files using a markdown AST parser
   - Extracts frontmatter metadata
   - Identifies document structure and content blocks

2. **Mapper Module**
   - Maps markdown elements to Notion block types
   - Handles conversion of:
     - Headers → Notion headings
     - Lists → Notion lists
     - Code blocks → Notion code blocks
     - Images → Notion images
     - Tables → Notion tables
     - Links → Notion links

3. **Sync Engine Module**
   - Manages page creation/updates
   - Handles content diffing
   - Implements retry logic
   - Manages rate limiting

## API Design

### Action Inputs

```yaml
inputs:
  notion-token:
    description: 'Notion Integration Token'
    required: true
  
  database-id:
    description: 'Notion Database ID for syncing'
    required: false
  
  parent-page-id:
    description: 'Parent page ID for standalone pages'
    required: false
  
  files-pattern:
    description: 'Glob pattern for markdown files'
    default: '**/*.md'
    required: false
  
  config-file:
    description: 'Path to sync configuration file'
    default: '.notion-sync.yml'
    required: false
  
  dry-run:
    description: 'Preview changes without syncing'
    default: 'false'
    required: false
  
  preserve-notion-ids:
    description: 'Maintain stable Notion page IDs across syncs'
    default: 'true'
    required: false
  
  page-permissions:
    description: 'Permission level for synced pages'
    default: 'read-only'
    required: false
```

### Configuration File Schema

```yaml
# .notion-sync.yml
version: 1
sync:
  # Global settings
  strategy: update | replace  # update: edit existing pages, replace: recreate pages
  delete_removed: false       # Never delete Notion pages
  preserve_page_ids: true     # Maintain stable page IDs
  
  # Page ID mapping storage
  id_mapping_file: ".notion-page-ids.json"  # Store page IDs for persistence
  
  # Mapping rules
  mappings:
    - source: "docs/**/*.md"
      target:
        database_id: "xxx-xxx-xxx"
        properties:
          title: "$.frontmatter.title || $.filename"
          tags: "$.frontmatter.tags"
          category: "$.frontmatter.category"
          github_source: "$.github_url"  # Auto-populated
          
    - source: "blog/*.md"
      target:
        parent_page_id: "xxx-xxx-xxx"
        permissions: "read-only"  # Ensure read-only
        
  # Transformation rules
  transforms:
    - type: "link"
      pattern: "\\[([^\\]]+)\\]\\(([^)]+)\\.md\\)"
      replacement: "[$1](notion://{{page_id}})"
      
  # Exclusions
  exclude:
    - "**/_*.md"
    - "**/README.md"
    
  # Page settings
  page_settings:
    permissions: "read-only"
    allow_comments: false
    allow_edits: false
```

### Page ID Mapping File

```json
// .notion-page-ids.json
{
  "version": "1.0",
  "mappings": {
    "docs/getting-started.md": {
      "page_id": "abc-123-def-456",
      "last_synced": "2024-01-15T10:30:00Z",
      "checksum": "sha256:abcdef123456"
    },
    "blog/hello-world.md": {
      "page_id": "ghi-789-jkl-012",
      "last_synced": "2024-01-14T15:45:00Z",
      "checksum": "sha256:789012abcdef"
    }
  }
}
```

## Data Models

### Internal Document Model

```typescript
interface MarkdownDocument {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  ast: MarkdownAST;
  checksum: string;
  lastModified: Date;
  githubUrl: string;  // Full GitHub URL to the markdown file
}

interface NotionPage {
  id: string;
  parentId: string;
  properties: Record<string, any>;
  content: NotionBlock[];
  lastSynced: Date;
  sourceChecksum: string;
  metadata: {
    sourceFile: string;     // Relative path in repo
    githubUrl: string;      // Full GitHub URL
    notionUrl: string;      // Public Notion page URL
    lastCommit: string;     // Git commit hash
  };
}

interface SyncResult {
  status: 'created' | 'updated' | 'unchanged' | 'error';
  pageId?: string;
  notionUrl?: string;
  error?: Error;
  changes?: Change[];
}

interface BiDirectionalLinks {
  markdown: {
    header: string;     // Notion page link in markdown header
    format: 'yaml' | 'comment';
  };
  notion: {
    position: 'top' | 'bottom' | 'property';
    style: 'callout' | 'link' | 'database_property';
  };
}
```

### Notion Block Mappings

```typescript
type BlockMapping = {
  'heading_1': { markdown: 'h1', notion: 'heading_1' },
  'heading_2': { markdown: 'h2', notion: 'heading_2' },
  'heading_3': { markdown: 'h3', notion: 'heading_3' },
  'paragraph': { markdown: 'p', notion: 'paragraph' },
  'code': { markdown: 'code', notion: 'code' },
  'bulleted_list': { markdown: 'ul', notion: 'bulleted_list_item' },
  'numbered_list': { markdown: 'ol', notion: 'numbered_list_item' },
  'quote': { markdown: 'blockquote', notion: 'quote' },
  'image': { markdown: 'img', notion: 'image' },
  'table': { markdown: 'table', notion: 'table' }
};
```

## Implementation Flow

### 1. Initialization Phase
```
1. Load configuration file
2. Validate inputs and configuration
3. Initialize Notion client
4. Set up file watchers (if in watch mode)
```

### 2. Discovery Phase
```
1. Find all markdown files matching patterns
2. Parse frontmatter and content
3. Generate checksums for change detection
4. Query existing Notion pages
```

### 3. Sync Phase
```
For each document:
  1. Check if page exists in Notion (using stored page ID or unique identifier)
  2. Compare checksums for changes
  3. If new: 
     - Create page with content
     - Set page permissions to read-only
     - Store page ID mapping
  4. If changed: 
     - Update existing page content (preserve page ID)
     - Maintain read-only permissions
  5. If unchanged: Skip
  6. Record sync metadata and page mappings
```

### 4. Cleanup Phase
```
1. Handle deleted files (if configured)
2. Generate sync report
3. Update action outputs
4. Clean up temporary resources
```

## Error Handling

### Retry Strategy
```typescript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 10000,
  retryableErrors: [
    'rate_limited',
    'internal_server_error',
    'gateway_timeout'
  ]
};
```

### Error Types
1. **Configuration Errors**: Invalid config, missing required fields
2. **Authentication Errors**: Invalid token, insufficient permissions
3. **API Errors**: Rate limits, server errors, invalid requests
4. **Content Errors**: Unsupported markdown features, size limits
5. **Network Errors**: Timeouts, connection issues

## Performance Optimizations

1. **Batch Operations**
   - Group API calls where possible
   - Use bulk create/update endpoints

2. **Caching**
   - Cache page lookups
   - Store checksums for change detection
   - Cache Notion API responses

3. **Parallelization**
   - Process multiple files concurrently
   - Limit concurrent API calls to respect rate limits

4. **Incremental Sync**
   - Only sync changed files
   - Track last sync timestamps
   - Use checksums for change detection

## Security Considerations

1. **Token Management**
   - Use GitHub Secrets for Notion token
   - Never log sensitive information
   - Validate token permissions

2. **Input Validation**
   - Sanitize file paths
   - Validate configuration schema
   - Limit file sizes

3. **API Security**
   - Use HTTPS for all API calls
   - Implement request signing if available
   - Handle token rotation

## Testing Strategy

1. **Unit Tests**
   - Parser module tests
   - Mapper module tests
   - Utility function tests

2. **Integration Tests**
   - Notion API mock tests
   - End-to-end sync tests
   - Error handling tests

3. **E2E Tests**
   - Real Notion workspace tests
   - Various markdown format tests
   - Configuration variation tests

## Monitoring and Logging

### Metrics
- Files processed
- Pages created/updated
- API calls made
- Sync duration
- Error counts

### Logs
- Info: Sync progress, file counts
- Warning: Skipped files, non-critical errors
- Error: Failed syncs, API errors
- Debug: Detailed operation logs

## Bidirectional Link Implementation

### Markdown Header Enhancement

When syncing, the action will automatically update the markdown file header with the Notion page link:

```markdown
---
title: "My Document"
notion_url: "https://notion.so/workspace/My-Document-abc123"
last_synced: "2024-01-15T10:30:00Z"
---

# My Document

Content here...
```

Alternative HTML comment format for compatibility:
```markdown
<!-- notion-sync
url: https://notion.so/workspace/My-Document-abc123
last_synced: 2024-01-15T10:30:00Z
-->

# My Document
```

### Notion Page GitHub Link

The action will add a GitHub source link to every Notion page:

1. **As a Callout Block** (default):
```
📄 View source on GitHub
https://github.com/owner/repo/blob/main/docs/my-document.md
Last updated: 2024-01-15 • Commit: abc123
```

2. **As a Database Property**:
- Property Name: "GitHub Source"
- Property Type: URL
- Value: Full GitHub URL

3. **As Page Metadata**:
- Added to page properties
- Accessible via Notion API
- Displayed in page info

## GitHub Marketplace Preparation

### Action Metadata (action.yml)

```yaml
name: 'Notion Sync'
description: 'Sync markdown documents to Notion with bidirectional links'
author: 'Your Name'
branding:
  icon: 'upload-cloud'
  color: 'blue'

inputs:
  notion-token:
    description: 'Notion Integration Token'
    required: true
  
  github-token:
    description: 'GitHub Token for updating markdown files'
    default: ${{ github.token }}
    required: false
  
  enable-bidirectional-links:
    description: 'Add Notion URLs to markdown and GitHub URLs to Notion'
    default: 'true'
    required: false
    
  link-style:
    description: 'Style for links (yaml|comment for markdown, callout|property for Notion)'
    default: 'yaml,callout'
    required: false

outputs:
  synced-pages:
    description: 'Number of pages synced'
  
  page-urls:
    description: 'JSON array of synced page URLs'
  
  sync-report:
    description: 'Detailed sync report'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### Marketplace Requirements

1. **Documentation**
   - Comprehensive README with examples
   - CONTRIBUTING.md for open source guidelines
   - SECURITY.md for security policies
   - LICENSE file (MIT recommended)

2. **Examples**
   ```yaml
   # .github/workflows/notion-sync.yml
   name: Sync to Notion
   on:
     push:
       branches: [main]
       paths:
         - 'docs/**/*.md'
         - 'blog/**/*.md'
   
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Sync to Notion
           uses: your-username/notion-sync@v1
           with:
             notion-token: ${{ secrets.NOTION_TOKEN }}
             github-token: ${{ github.token }}
             enable-bidirectional-links: true
             config-file: .notion-sync.yml
   ```

3. **Pricing Model**
   - Free for public repositories
   - Usage-based pricing for private repos
   - Enterprise tier with priority support

4. **Security & Compliance**
   - SOC 2 compliance statement
   - Data handling documentation
   - Token permission requirements
   - GDPR compliance notes

### Release Process

1. **Pre-release Checklist**
   - [ ] All tests passing
   - [ ] Security scan completed
   - [ ] Documentation reviewed
   - [ ] Examples tested
   - [ ] Performance benchmarked

2. **Version Strategy**
   - Follow semantic versioning
   - Tag releases properly
   - Maintain CHANGELOG.md
   - Create GitHub releases

3. **Marketplace Submission**
   - Fill marketplace listing form
   - Add screenshots/demos
   - Set up billing (if applicable)
   - Submit for review

## Future Enhancements

1. **Bidirectional Sync**
   - Pull changes from Notion back to markdown
   - Conflict resolution strategies
   - Merge strategies

2. **Advanced Mappings**
   - Custom block types
   - Embedded content
   - Database views
   - Synced blocks

3. **Webhook Support**
   - Real-time sync triggers
   - Notion webhook integration
   - GitHub webhook handlers

4. **CLI Tool**
   - Standalone CLI for local development
   - Interactive sync management
   - Dry-run capabilities

5. **Enterprise Features**
   - Multi-workspace support
   - Advanced permissions
   - Audit logging
   - Custom integrations