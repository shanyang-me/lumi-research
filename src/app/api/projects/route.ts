import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { DEFAULT_TASKS } from "@/lib/pipeline";
import { getNotionClient } from "@/lib/notion";

const NOTION_PARENT_PAGE_ID = process.env.NOTION_DOC_PAGE_ID || "";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          hypotheses: true,
          datasets: true,
          models: true,
          experiments: true,
          papers: true,
          pipelineTasks: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      problem: body.problem,
      successCriteria: body.successCriteria,
      motivation: body.motivation,
      approach: body.approach,
      timeline: body.timeline,
      status: body.status || "active",
    },
  });

  // Auto-initialize pipeline tasks
  await prisma.pipelineTask.createMany({
    data: DEFAULT_TASKS.map((t) => ({
      ...t,
      projectId: project.id,
    })),
  });

  // Create Notion page in background (fire and forget)
  const notion = getNotionClient();
  if (notion && NOTION_PARENT_PAGE_ID) {
    const pageTitle = `[Lumi] ${project.name}`;
    const content = body.description
      ? `## Overview\n${body.description}\n\n---\n*Page created automatically by Lumi Research Manager.*`
      : `*Page created automatically by Lumi Research Manager. Use the Documenter agent to sync full project data.*`;

    notion.pages.create({
      parent: { page_id: NOTION_PARENT_PAGE_ID },
      properties: {
        title: { title: [{ text: { content: pageTitle } }] },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content } }] },
        },
      ],
    }).then(() => {
      console.log(`[notion] Created page: ${pageTitle}`);
    }).catch((err) => {
      console.error(`[notion] Failed to create page: ${err}`);
    });
  }

  return NextResponse.json(project, { status: 201 });
}
