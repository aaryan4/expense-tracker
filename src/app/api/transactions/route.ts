import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- Server-only Supabase client (service role key) ---
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

// --- Types ---
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

// --- Utils ---
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

// --- GET /api/transactions ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
    }

    const out = (data ?? []).map(toCamel);
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("GET /api/transactions unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- POST /api/transactions ---
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Missing JSON body" }, { status: 400 });
    }

    // Parse + validate
    const amount = Number(body.amount);
    const merchant = typeof body.merchant === "string" ? body.merchant.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "Other";
    const currency = typeof body.currency === "string" ? body.currency.trim() : "INR";
    const userNote = body.userNote ?? null;
    const dateISO = body.dateISO ?? null;

    if (!Number.isFinite(amount) || amount <= 0 || !merchant) {
      return NextResponse.json(
        { error: "Invalid payload: amount (positive number) and merchant (non-empty) required" },
        { status: 400 }
      );
    }

    const insert: Record<string, any> = {
      amount,
      currency,
      merchant: merchant.toLowerCase(),
      category,
      user_note: userNote,
      created_at: dateISO ?? new Date().toISOString(),
    };

    if (dateISO) {
      const parsed = Date.parse(dateISO);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: "Invalid dateISO" }, { status: 400 });
      }
      insert.created_at = new Date(parsed).toISOString();
    }

    const { data, error } = await supabase
      .from<Row>("transactions")
      .insert([insert])
      .select("*")
      .single();

    if (error) {
      console.error("Supabase POST error:", error);
      return NextResponse.json({ error: "Failed to save transaction" }, { status: 500 });
    }

    return NextResponse.json(toCamel(data as Row), { status: 201 });
  } catch (err) {
    console.error("POST /api/transactions unexpected error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
