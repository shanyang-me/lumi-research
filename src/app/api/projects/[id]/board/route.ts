import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await prisma.boardNote.findMany({
    where: { projectId: id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(notes);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const note = await prisma.boardNote.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category || "general",
      pinned: body.pinned || false,
      projectId: id,
    },
  });
  return NextResponse.json(note, { status: 201 });
}
