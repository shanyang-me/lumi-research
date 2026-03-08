import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { DEFAULT_TASKS } from "@/lib/pipeline";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasks = await prisma.pipelineTask.findMany({
    where: { projectId: id },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // If action=init, create default pipeline tasks
  if (body.action === "init") {
    const existing = await prisma.pipelineTask.count({ where: { projectId: id } });
    if (existing > 0) {
      return NextResponse.json({ message: "Pipeline already initialized" });
    }
    await prisma.pipelineTask.createMany({
      data: DEFAULT_TASKS.map((t) => ({
        ...t,
        projectId: id,
      })),
    });
    const tasks = await prisma.pipelineTask.findMany({
      where: { projectId: id },
      orderBy: [{ stage: "asc" }, { order: "asc" }],
    });
    return NextResponse.json(tasks, { status: 201 });
  }

  // Otherwise create a single task
  const task = await prisma.pipelineTask.create({
    data: {
      title: body.title,
      description: body.description,
      stage: body.stage,
      status: body.status || "todo",
      type: body.type || "manual",
      agentRole: body.agentRole,
      order: body.order || 0,
      projectId: id,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
