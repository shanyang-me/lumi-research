import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await req.json();
  const agent = await prisma.customAgent.update({
    where: { id: agentId },
    data: body,
  });
  return NextResponse.json(agent);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  await prisma.customAgent.delete({ where: { id: agentId } });
  return NextResponse.json({ ok: true });
}
