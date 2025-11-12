import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- Secure Supabase client for server-side usage ---
// Use the service role key to bypass RLS safely (never expose to browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Type definitions ---
type Row = {
  id: string;
  amount: number | string;
  currency: string;
  merchant: string;
  category: string;
  user_note: string | null;
  created_at: string;
};

// --- Utility: convert DB snake_case to camelCase for frontend ---
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
// Fetch recent transactions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase GET error:", error.message);
      return NextResponse.json(
        { error: "Failed to load transactions" },
        { status: 500 }
      );
    }

    const formatted = (data ?? []).map(toCamel);
    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- POST /api/transactions ---
// Insert new transaction
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate payload
    if (!body.amount || !body.merchant) {
      return NextResponse.json(
        { error: "Amount and merchant are required" },
        { status: 400 }
      );
    }

    const insert = {
      amount: Number(body.amount),
      currency: body.currency ?? "INR",
      merchant: String(body.merchant).toLowerCase(),
      category: body.category ?? "Other",
      user_note: body.userNote ?? null,
      created_at: body.dateISO ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert([insert])
      .select("*")
      .single();

    if (error) {
      console.error("Supabase POST error:", error.message);
      return NextResponse.json(
        { error: "Failed to save transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(toCamel(data as Row), { status: 201 });
  } catch (err) {
    console.error("POST /api/transactions error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
