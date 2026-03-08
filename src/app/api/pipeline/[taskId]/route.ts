import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const body = await req.json();
  const task = await prisma.pipelineTask.update({
    where: { id: taskId },
    data: body,
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  await prisma.pipelineTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
