import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { hypothesisIds, resultIds, ...data } = body;
  const paper = await prisma.paper.create({
    data: {
      ...data,
      projectId: id,
      hypotheses: hypothesisIds?.length
        ? { create: hypothesisIds.map((hid: string) => ({ hypothesisId: hid })) }
        : undefined,
      results: resultIds?.length
        ? { create: resultIds.map((rid: string) => ({ resultId: rid })) }
        : undefined,
    },
  });
  return NextResponse.json(paper, { status: 201 });
}
