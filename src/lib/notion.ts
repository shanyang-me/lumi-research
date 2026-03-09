import { Client } from "@notionhq/client";

let _notion: Client | null = null;

export function getNotionClient(): Client | null {
  if (!process.env.NOTION_API_KEY) return null;
  if (!_notion) {
    _notion = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return _notion;
}

// Convert markdown-ish text to Notion blocks (simplified)
export function markdownToBlocks(md: string) {
  const lines = md.split("\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] },
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] },
      });
    } else if (line.startsWith("- ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] },
      });
    } else if (line.startsWith("---")) {
      blocks.push({ object: "block", type: "divider", divider: {} });
    } else if (line.trim()) {
      // Truncate to 2000 chars (Notion limit per rich_text segment)
      const content = line.slice(0, 2000);
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content } }] },
      });
    }
  }

  return blocks;
}
