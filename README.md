# Lumi Research Manager

A pixel-art research project management tool with AI-powered agent teams. Manage hypotheses, datasets, experiments, papers, and more through an interactive office scene where AI agents collaborate on your research.

## Features

- **Pixel Office** -- Interactive canvas with agents that walk, work, and attend meetings
- **AI Agent Team** -- Built-in specialist agents (Scout, Theorist, Architect, Coder, Data Smith, Documenter, Commander) powered by Claude CLI
- **Meeting Room** -- Multi-agent discussions where agents debate research topics in rounds
- **Blackboard** -- Pinnable notes organized by category (machine, dataset, cloud, credentials)
- **Pipeline Tracking** -- Stage-based research pipeline (survey, hypotheses, experiment design, implementation, data, evaluation, writing)
- **Notion Sync** -- Automatic project documentation to Notion
- **Console** -- Real-time terminal showing behind-the-scenes agent activity
- **MCP Server** -- Model Context Protocol server for Claude Code integration
- **Custom Agents** -- Create your own specialist agents with custom prompts

## Prerequisites

- **Node.js** 18+
- **Claude CLI** -- Install from [claude.ai/download](https://claude.ai/download) (required for AI agents)

## Quick Start

```bash
# Install dependencies
npm install

# Set up the database
npx prisma migrate deploy

# Copy environment config
cp .env.example .env
# Edit .env and set DATABASE_URL (default works for local SQLite)

# Build and run
npm run build
npm start -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

## Notion Integration (Optional)

The Documenter agent can sync full project documentation to Notion. When a new project is created, a corresponding Notion page is automatically generated.

### Setup

1. **Create a Notion internal integration**
   - Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
   - Click **"+ New integration"**
   - Name it (e.g., "Lumi Research")
   - Select your workspace
   - Click **Save**
   - Copy the **Internal Integration Secret** (starts with `ntn_`)

2. **Create a parent page in Notion**
   - Create a new page in Notion (e.g., "Lumi Research Projects")
   - This page will hold all your project documentation
   - Copy the page ID from the URL: `notion.so/<page-id>`
     - The page ID is the 32-character hex string at the end of the URL
     - Example: `https://notion.so/Lumi-Research-Projects-31ea585468f881f09576f9c465bfcc5e` -> ID is `31ea5854-68f8-81f0-9576-f9c465bfcc5e`

3. **Share the page with your integration**
   - Open the parent page in Notion
   - Click the **"..."** menu (top right)
   - Click **"Connect to"** (or "Connections")
   - Search for and select your integration (e.g., "Lumi Research")
   - **This step is required** -- without it, the API cannot access the page

4. **Configure environment variables**
   Add to your `.env` file:
   ```
   NOTION_API_KEY="ntn_your_token_here"
   NOTION_DOC_PAGE_ID="your-parent-page-id"
   ```

5. **Rebuild and restart**
   ```bash
   npm run build
   npm start -- -p 3001
   ```

### How it works

- **On project creation**: A `[Lumi] <project name>` page is automatically created under your parent page
- **Documenter agent**: Click SUMMON on the Documenter in the team roster to sync the full project state (overview, pipeline progress, hypotheses, experiments, meetings, etc.) to the Notion page
- **Updates**: Each sync replaces the page content with the latest project data

### Troubleshooting

If Notion pages are not being created:
- Verify your `NOTION_API_KEY` is correct (starts with `ntn_`)
- Make sure the parent page is **shared with your integration** (Step 3 above)
- Check the server console for `[notion]` error messages
- The `NOTION_DOC_PAGE_ID` must be the ID of a page the integration has access to

## MCP Server

Lumi includes an MCP server for direct Claude Code integration. It provides tools to manage projects, hypotheses, datasets, models, experiments, results, and papers from within Claude Code.

```bash
claude mcp add lumi-research -- npx tsx mcp-server.ts
```

Available tools: `list_projects`, `get_project`, `create_project`, `update_project`, `add_hypothesis`, `add_dataset`, `add_model`, `add_experiment`, `add_result`, `add_paper`, `update_entity`, `delete_entity`, `search_entities`.

## AI Agents

Agents are powered by the `claude` CLI (runs `claude -p` with specialized prompts). Each agent has a role:

| Agent | Role | Specialty |
|-------|------|-----------|
| Scout | Literature Research | Papers, trends, research gaps |
| Theorist | Hypothesis Generation | Formulating testable hypotheses |
| Architect | Experiment Design | Experiments, baselines, metrics |
| Coder | Implementation | Code architecture, libraries |
| Data Smith | Dataset Engineering | Data collection, preprocessing |
| Documenter | Documentation | Notion sync, project state tracking |
| Commander | Coordination | Priorities, bottlenecks, planning |

You can also create **custom agents** with your own system prompts via the "Hire Agent" button.

### Meetings

Click the meeting table in the pixel office to start a multi-agent meeting. Select 2+ agents, set a topic and number of rounds, and watch them discuss in real time. Agents physically walk to the meeting table during sessions.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: SQLite via Prisma
- **AI**: Claude CLI (`claude -p`)
- **Styling**: Tailwind CSS with pixel-art theme
- **Notion**: `@notionhq/client`

## Project Structure

```
src/
  app/
    api/              # API routes
      agents/         # Agent execution endpoints
      projects/[id]/  # Project CRUD + meetings, doc-sync, pipeline
  components/
    PixelWorld.tsx     # Canvas pixel art scene
    ProjectView.tsx    # Main project view (arena, quest, inventory)
    MeetingRoom.tsx    # Multi-agent meeting UI
    ConsolePanel.tsx   # Terminal-style activity log
    Blackboard.tsx     # Pinnable notes board
    Dashboard.tsx      # Headquarters / project list
  lib/
    pipeline.ts        # Agent roles and pipeline stage definitions
    notion.ts          # Notion client and markdown converter
    db.ts              # Prisma client singleton
prisma/
  schema.prisma        # Database schema
mcp-server.ts          # MCP server for Claude Code integration
```

## License

MIT
