import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { DEFAULT_TASKS } from "@/lib/pipeline";

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

  return NextResponse.json(project, { status: 201 });
}
