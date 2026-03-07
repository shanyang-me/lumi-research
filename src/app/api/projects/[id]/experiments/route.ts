import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { datasetIds, modelIds, ...data } = body;
  const experiment = await prisma.experiment.create({
    data: {
      ...data,
      projectId: id,
      datasets: datasetIds?.length
        ? { create: datasetIds.map((did: string) => ({ datasetId: did })) }
        : undefined,
      models: modelIds?.length
        ? { create: modelIds.map((mid: string) => ({ modelId: mid })) }
        : undefined,
    },
    include: {
      hypothesis: true,
      datasets: { include: { dataset: true } },
      models: { include: { model: true } },
      results: true,
    },
  });
  return NextResponse.json(experiment, { status: 201 });
}
