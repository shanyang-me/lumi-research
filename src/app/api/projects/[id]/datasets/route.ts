import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const dataset = await prisma.dataset.create({
    data: { ...body, projectId: id },
  });
  return NextResponse.json(dataset, { status: 201 });
}
