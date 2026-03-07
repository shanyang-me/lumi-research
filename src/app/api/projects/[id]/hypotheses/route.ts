import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const hypothesis = await prisma.hypothesis.create({
    data: { ...body, projectId: id },
  });
  return NextResponse.json(hypothesis, { status: 201 });
}
