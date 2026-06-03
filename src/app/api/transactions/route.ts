import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

type Row = {
  id: string;
  amount: number | string;
  currency: string;
  merchant: string;
  category: string;
  createdAt: string;
};

function toCamel(r: Row) {
  return {
    id: r.id,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    currency: r.currency,
    merchant: r.merchant,
    category: r.category,
    createdAt: r.createdAt,
  };
}

export async function GET() {
  try {
    const data = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error("GET TRANSACTIONS ERROR:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 400 }
    );
  }
}

/** Types for the incoming payload and the row we insert */
type IncomingBody = {
  amount: number;
  currency?: string;
  merchant?: string;
  category?: string;
  userNote?: string | null;
  dateISO?: string | null;
};

type InsertRow = {
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  createdAt?: string;
};

export async function POST(req: Request) {
  try {
    const body: IncomingBody = await req.json();

    const insert: InsertRow = {
      amount: Number(body.amount),
      currency: body.currency ?? "INR",
      merchant: String(body.merchant ?? "Unknown").toLowerCase(),
      category: body.category ?? "Other",
    };

    if (body.dateISO && !Number.isNaN(Date.parse(body.dateISO))) {
      insert.createdAt = new Date(body.dateISO).toISOString();
    }

    const data = await prisma.transaction.create({
      data: {
        amount: insert.amount,
        currency: insert.currency,
        merchant: insert.merchant,
        category: insert.category,
        ...(insert.createdAt ? { createdAt: new Date(insert.createdAt) } : {}),
      },
    });

    return NextResponse.json(data, { status: 201 });
 } catch (e) {

  console.error("TRANSACTION ERROR:", e);

  return NextResponse.json(

    {

      error:

        e instanceof Error

          ? e.message

          : JSON.stringify(e, null, 2),

    },

    { status: 400 }

  );

}
}