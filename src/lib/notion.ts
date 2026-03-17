import { Client } from "@notionhq/client";

let _notion: Client | null = null;

export function getNotionClient(): Client | null {
  if (!process.env.NOTION_API_KEY) return null;
  if (!_notion) {
    _notion = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return _notion;
}

// Find the Notion page ID for a project by its [Lumi] title
export async function findProjectPage(projectName: string): Promise<string | null> {
  const notion = getNotionClient();
  if (!notion) return null;

  const searchTitle = `[Lumi] ${projectName}`;
  try {
    const search = await notion.search({
      query: searchTitle,
      filter: { property: "object", value: "page" },
      page_size: 5,
    });

    for (const result of search.results) {
      if (result.object === "page" && "properties" in result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const titleProp = (result.properties as any).title;
        if (titleProp?.title?.[0]?.plain_text === searchTitle) {
          return result.id;
        }
      }
    }
  } catch (e) {
    console.error(`[notion] Failed to find page for "${projectName}":`, e);
  }
  return null;
}

// Find or create a sub-page under a parent page by title
async function findOrCreateSubPage(notion: Client, parentPageId: string, title: string): Promise<string> {
  // List children of the parent page to find existing sub-page
  const children = await notion.blocks.children.list({ block_id: parentPageId, page_size: 100 });

  for (const block of children.results) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = block as any;
    if (b.type === "child_page" && b.child_page?.title === title) {
      return b.id;
    }
  }

  // Not found — create it
  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `Activity log for ${title}. Each run is appended below.` }, annotations: { italic: true, color: "gray" } }],
        },
      },
    ],
  });

  return page.id;
}

// Build Notion blocks from agent output
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOutputBlocks(output: Record<string, any>, timestamp: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ type: "text", text: { content: timestamp } }] },
    },
  ];

  for (const [key, value] of Object.entries(output)) {
    if (key === "raw_output") {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: String(value).slice(0, 2000) } }] },
      });
    } else if (Array.isArray(value)) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `${key}:` }, annotations: { bold: true } }],
        },
      });
      for (const item of value) {
        const text = typeof item === "string"
          ? item
          : (item as Record<string, string>).title
            || (item as Record<string, string>).name
            || (item as Record<string, string>).task
            || JSON.stringify(item);
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ type: "text", text: { content: String(text).slice(0, 2000) } }] },
        });
      }
    } else if (typeof value === "string") {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: `${key}: ` }, annotations: { bold: true } },
            { type: "text", text: { content: value.slice(0, 1900) } },
          ],
        },
      });
    } else if (typeof value === "object" && value !== null) {
      // Handle nested objects (e.g., data_preparation, golden_testset, resource_estimates)
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `${key}:` }, annotations: { bold: true } }],
        },
      });
      for (const [subKey, subVal] of Object.entries(value)) {
        if (Array.isArray(subVal)) {
          for (const item of subVal) {
            const text = typeof item === "string"
              ? item
              : (item as Record<string, string>).name
                || (item as Record<string, string>).title
                || JSON.stringify(item);
            blocks.push({
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: { rich_text: [{ type: "text", text: { content: `${subKey}: ${String(text).slice(0, 1900)}` } }] },
            });
          }
        } else if (typeof subVal === "string") {
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ type: "text", text: { content: `${subKey}: ${subVal.slice(0, 1900)}` } }] },
          });
        } else if (subVal != null) {
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ type: "text", text: { content: `${subKey}: ${JSON.stringify(subVal).slice(0, 1900)}` } }] },
          });
        }
      }
    }
  }

  return blocks;
}

// Append agent progress to a sub-page under the project's Notion page
export async function appendAgentProgress(
  projectName: string,
  agentName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: Record<string, any>,
) {
  const notion = getNotionClient();
  if (!notion) return;

  const projectPageId = await findProjectPage(projectName);
  if (!projectPageId) return;

  const timestamp = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  try {
    // Find or create the agent's sub-page under the project page
    const subPageId = await findOrCreateSubPage(notion, projectPageId, agentName);

    const blocks = buildOutputBlocks(output, timestamp);

    // Append in batches of 100
    for (let i = 0; i < blocks.length; i += 100) {
      await notion.blocks.children.append({
        block_id: subPageId,
        children: blocks.slice(i, i + 100),
      });
    }
    console.log(`[notion] Appended ${agentName} progress to "${projectName}/${agentName}"`);
  } catch (e) {
    console.error(`[notion] Failed to append progress:`, e);
  }
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
