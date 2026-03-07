import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params; // validate route param exists
  const body = await req.json();
  const result = await prisma.result.create({
    data: {
      name: body.name,
      metrics: body.metrics ? JSON.stringify(body.metrics) : null,
      notes: body.notes,
      status: body.status,
      experimentId: body.experimentId,
    },
  });
  return NextResponse.json(result, { status: 201 });
}
