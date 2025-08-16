export class Block {
  constructor(
    private readonly type: string,
    private readonly content: Record<string, any>
  ) {}

  getType(): string {
    return this.type;
  }

  getContent(): Record<string, any> {
    return this.content;
  }

  equals(other: Block): boolean {
    return (
      this.type === other.type &&
      JSON.stringify(this.content) === JSON.stringify(other.content)
    );
  }
}

export class CalloutBlock extends Block {
  constructor(text: string, icon: string = '📄') {
    super('callout', {
      text,
      icon
    });
  }
}