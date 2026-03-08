import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agents = await prisma.customAgent.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(agents);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const agent = await prisma.customAgent.create({
    data: {
      name: body.name,
      title: body.title,
      description: body.description,
      color: body.color || "#8b5cf6",
      systemPrompt: body.systemPrompt,
      stage: body.stage || null,
      projectId: id,
    },
  });
  return NextResponse.json(agent, { status: 201 });
}
