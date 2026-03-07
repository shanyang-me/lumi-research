import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const modelMap: Record<string, string> = {
  hypotheses: "hypothesis",
  datasets: "dataset",
  models: "model",
  experiments: "experiment",
  results: "result",
  papers: "paper",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const modelName = modelMap[type];
  if (!modelName) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any)[modelName].update({
    where: { id },
    data: body,
  });
  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const modelName = modelMap[type];
  if (!modelName) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any)[modelName].delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
