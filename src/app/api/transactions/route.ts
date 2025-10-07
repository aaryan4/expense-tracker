import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Create a Supabase client that forwards the user's Authorization header */
function serverClient(req: Request) {
  const headers: Record<string, string> = {};
  const auth = req.headers.get("Authorization");
  if (auth) headers["Authorization"] = auth;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    { global: { headers } }
  );
}

type Row = {
  id: string;
  amount: number | string;
  currency: string;
  merchant: string;
  category: string;
  user_note: string | null;
  created_at: string;
  user_id?: string | null;
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

export async function GET(req: Request) {
  const supabase = serverClient(req);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: String(error.message) }, { status: 400 });
  }

  return NextResponse.json((data ?? []).map(toCamel));
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
  user_note: string | null;
  user_id: string;
  created_at?: string; // only when a valid date is provided
};

export async function POST(req: Request) {
  try {
    const supabase = serverClient(req);

    // Get the authenticated user (required by RLS + to set user_id)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: IncomingBody = await req.json();

    const insert: InsertRow = {
      amount: Number(body.amount),
      currency: body.currency ?? "INR",
      merchant: String(body.merchant ?? "").toLowerCase(),
      category: body.category ?? "Other",
      user_note: body.userNote ?? null,
      user_id: auth.user.id,
    };

    if (body.dateISO && !Number.isNaN(Date.parse(body.dateISO))) {
      insert.created_at = new Date(body.dateISO).toISOString();
    }

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