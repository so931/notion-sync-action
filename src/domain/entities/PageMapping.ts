export class PageMapping {
  constructor(
    private readonly filePath: string,
    private readonly pageId: string,
    private readonly checksum: string,
    private readonly lastSynced?: Date
  ) {}

  getFilePath(): string {
    return this.filePath;
  }

  getPageId(): string {
    return this.pageId;
  }

  getChecksum(): string {
    return this.checksum;
  }

  getLastSynced(): Date | undefined {
    return this.lastSynced;
  }

  needsSync(newChecksum: string): boolean {
    return this.checksum !== newChecksum;
  }

  withUpdatedSync(checksum: string, syncTime: Date): PageMapping {
    return new PageMapping(
      this.filePath,
      this.pageId,
      checksum,
      syncTime
    );
  }
}