import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          amount: body.amount,
          currency: body.currency,
          merchant: body.merchant,
          category: body.category,
          created_at: body.dateISO,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: String(error) }, { status: 400 });
  return NextResponse.json(data);
}
