import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  await prisma.meeting.delete({ where: { id: meetingId } });
  return NextResponse.json({ ok: true });
}
