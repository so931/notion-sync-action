# Notion Sync GitHub Action

Automatically sync your markdown documents to Notion pages with bidirectional links.

## Features

- 📝 Sync markdown files to Notion pages
- 🔗 Bidirectional links between GitHub and Notion
- 🔒 Read-only pages in Notion
- 🆔 Preserve page IDs across syncs
- 📊 Detailed sync reports
- 🔧 Configurable sync options

## Usage

### Basic Usage

```yaml
name: Sync to Notion
on:
  push:
    branches: [main]
    paths:
      - '**.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Sync to Notion
        uses: your-username/notion-sync@v1
        with:
          notion-token: ${{ secrets.NOTION_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Sync to Notion
  uses: your-username/notion-sync@v1
  with:
    notion-token: ${{ secrets.NOTION_TOKEN }}
    github-token: ${{ github.token }}
    database-id: 'your-database-id'
    files-pattern: 'docs/**/*.md'
    enable-bidirectional-links: true
    link-style: 'yaml,callout'
    dry-run: false
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `notion-token` | Notion Integration Token | Yes | - |
| `github-token` | GitHub Token for updating markdown files | No | `${{ github.token }}` |
| `database-id` | Notion Database ID for syncing | No | - |
| `parent-page-id` | Parent page ID for standalone pages | No | - |
| `files-pattern` | Glob pattern for markdown files | No | `**/*.md` |
| `config-file` | Path to sync configuration file | No | `.notion-sync.yml` |
| `dry-run` | Preview changes without syncing | No | `false` |
| `enable-bidirectional-links` | Add Notion URLs to markdown and GitHub URLs to Notion | No | `true` |
| `link-style` | Style for links (yaml\|comment for markdown, callout\|property for Notion) | No | `yaml,callout` |

## Outputs

| Output | Description |
|--------|-------------|
| `synced-count` | Number of pages synced |
| `page-urls` | JSON array of synced page URLs |
| `sync-report` | Detailed sync report |

## Bidirectional Links

### Markdown Header

The action automatically adds Notion page URLs to your markdown files:

```markdown
---
title: "My Document"
notion_url: "https://notion.so/My-Document-abc123"
last_synced: "2024-01-15T10:30:00Z"
---
```

### Notion Page

Each synced Notion page includes a link back to the GitHub source:

```
📄 View source on GitHub
https://github.com/owner/repo/blob/main/docs/my-document.md
```

## Configuration File

Create a `.notion-sync.yml` file for advanced configuration:

```yaml
version: 1
sync:
  strategy: update  # update or replace
  preserve_page_ids: true
  id_mapping_file: ".notion-page-ids.json"
  
mappings:
  - source: "docs/**/*.md"
    target:
      database_id: "xxx-xxx-xxx"
      permissions: "read-only"
      
  - source: "blog/*.md"
    target:
      parent_page_id: "xxx-xxx-xxx"
      
exclude:
  - "**/_*.md"
  - "**/README.md"
```

## Setup

### 1. Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name and select your workspace
4. Copy the Internal Integration Token

### 2. Add Integration to Pages/Databases

1. Open the Notion page or database you want to sync to
2. Click "..." menu → "Connections" → "Add connections"
3. Select your integration

### 3. Add Token to GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to Secrets and variables → Actions
3. Add a new secret named `NOTION_TOKEN` with your integration token

## Development

### Clean Architecture

This project follows clean architecture principles with clear separation of concerns:

- **Domain Layer**: Business entities and rules
- **Application Layer**: Use cases and business logic
- **Infrastructure Layer**: External services and frameworks
- **Adapters Layer**: Interface implementations

### Testing

```bash
npm test        # Run all tests
npm run test:unit    # Run unit tests
npm run test:integration  # Run integration tests
npm run test:coverage    # Generate coverage report
```

### Building

```bash
npm run build   # Compile TypeScript
npm run package # Package for GitHub Action
```

## License

MIT
