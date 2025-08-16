import matter from 'gray-matter';

export interface ParsedMarkdown {
  frontmatter: Record<string, any>;
  body: string;
}

export class MarkdownParser {
  parse(content: string): ParsedMarkdown {
    const { data, content: body } = matter(content);
    return {
      frontmatter: data,
      body
    };
  }

  serialize(frontmatter: Record<string, any>, body: string): string {
    return matter.stringify(body, frontmatter);
  }
}