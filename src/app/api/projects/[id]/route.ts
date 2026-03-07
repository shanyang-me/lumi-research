import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      hypotheses: { orderBy: { updatedAt: "desc" } },
      datasets: { orderBy: { updatedAt: "desc" } },
      models: { orderBy: { updatedAt: "desc" } },
      experiments: {
        include: {
          hypothesis: true,
          datasets: { include: { dataset: true } },
          models: { include: { model: true } },
          results: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      papers: {
        include: {
          hypotheses: { include: { hypothesis: true } },
          results: { include: { result: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
