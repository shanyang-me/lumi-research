import { prisma } from "@/lib/db";
import { findProjectPage } from "@/lib/notion";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  if (!project) return NextResponse.json({ url: null });

  const pageId = await findProjectPage(project.name);
  if (!pageId) return NextResponse.json({ url: null });

  const cleanId = pageId.replace(/-/g, "");
  return NextResponse.json({ url: `https://notion.so/${cleanId}` });
}
