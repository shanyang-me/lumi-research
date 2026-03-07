import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          hypotheses: true,
          datasets: true,
          models: true,
          experiments: true,
          papers: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      status: body.status || "active",
    },
  });
  return NextResponse.json(project, { status: 201 });
}
