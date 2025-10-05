import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  amount: z.number().finite(),
  currency: z.string().min(1).default("INR"),
  merchant: z.string().min(1),
  category: z.string().min(1),
  userNote: z.string().optional(),
  dateISO: z.string().optional(), // optional override
});

export async function GET() {
  const items = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.parse(body);

    const created = await prisma.transaction.create({
      data: {
        amount: parsed.amount, // Prisma Decimal from number
        currency: parsed.currency || "INR",
        merchant: parsed.merchant.toLowerCase(),
        category: parsed.category,
        userNote: parsed.userNote ?? null,
        createdAt: parsed.dateISO ? new Date(parsed.dateISO) : undefined,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 400 });
}
}
