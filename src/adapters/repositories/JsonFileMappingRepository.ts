import { promises as fs } from 'fs';
import { PageMapping } from '../../domain/entities/PageMapping';
import { PageMappingRepository } from '../../application/ports/PageMappingRepository';

interface MappingData {
  version: string;
  mappings: {
    [filePath: string]: {
      page_id: string;
      last_synced: string;
      checksum: string;
    };
  };
}

export class JsonFileMappingRepository implements PageMappingRepository {
  constructor(private readonly filePath: string) {}

  async findByPath(path: string): Promise<PageMapping | null> {
    const data = await this.loadData();
    const mapping = data.mappings[path];
    
    if (!mapping) return null;
    
    return new PageMapping(
      path,
      mapping.page_id,
      mapping.checksum,
      new Date(mapping.last_synced)
    );
  }

  async save(mapping: PageMapping): Promise<void> {
    const data = await this.loadData();
    
    data.mappings[mapping.getFilePath()] = {
      page_id: mapping.getPageId(),
      checksum: mapping.getChecksum(),
      last_synced: mapping.getLastSynced()?.toISOString() || new Date().toISOString()
    };
    
    await this.saveData(data);
  }

  async delete(path: string): Promise<void> {
    const data = await this.loadData();
    delete data.mappings[path];
    await this.saveData(data);
  }

  async findAll(): Promise<PageMapping[]> {
    const data = await this.loadData();
    
    return Object.entries(data.mappings).map(([path, mapping]) =>
      new PageMapping(
        path,
        mapping.page_id,
        mapping.checksum,
        new Date(mapping.last_synced)
      )
    );
  }

  private async loadData(): Promise<MappingData> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // File doesn't exist, return empty data
      return {
        version: '1.0',
        mappings: {}
      };
    }
  }

  private async saveData(data: MappingData): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, content, 'utf-8');
  }
}