import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

type Row = {
  id: string;
  amount: number | string;
  currency: string;
  merchant: string;
  category: string;
  user_note: string | null;
  created_at: string;
};

function toCamel(r: Row) {
  return {
    id: r.id,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    currency: r.currency,
    merchant: r.merchant,
    category: r.category,
    userNote: r.user_note,
    createdAt: r.created_at,
  };
}

export async function GET() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: String(error.message) }, { status: 400 });
  }

  const out = (data ?? []).map(toCamel);
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const insert = {
      amount: body.amount,
      currency: body.currency ?? "INR",
      merchant: String(body.merchant).toLowerCase(),
      category: body.category ?? "Other",
      user_note: body.userNote ?? null,
      created_at: body.dateISO ?? null,
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert([insert])
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(toCamel(data as Row), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
