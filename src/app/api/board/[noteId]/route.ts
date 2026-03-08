import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  const body = await req.json();
  const note = await prisma.boardNote.update({
    where: { id: noteId },
    data: body,
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  await prisma.boardNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
