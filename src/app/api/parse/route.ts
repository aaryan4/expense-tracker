import { NextResponse } from "next/server";
import { z } from "zod";


//token and billing usage tracker 

let totalPromptTokens = 0;
let totalCompletionTokens = 0;
let totalCostUSD = 0;
let totalCostINR = 0;

/**
 * Request/response schemas
 */
const ParseRequest = z.object({
  text: z.string().min(1),
});

const ParseResponseSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().nullable().default("INR"),
  merchant: z.string().nullable(),
  category: z.string().nullable(),
  dateISO: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});

type ParseResult = z.infer<typeof ParseResponseSchema>;

/**
 * Local fallback parser (same simple heuristic you've used client-side)
 */
function localParse(text: string): ParseResult {
  const s = text.trim();
  const numMatch = s.match(/\d+(?:\.\d{1,2})?/);
  const amount = numMatch ? parseFloat(numMatch[0]) : null;
  const merchant =
    s
      .replace(numMatch ? numMatch[0] : "", "")
      .replace(/[^a-zA-Z\s]/g, "")
      .trim()
      .toLowerCase() || null;

  // naive category guesses
  const CATEGORY_GUESS: Record<string, string> = {
    swiggy: "Food & Dining",
    zomato: "Food & Dining",
    blinkit: "Groceries",
    zepto: "Groceries",
    bigbasket: "Groceries",
    uber: "Transport",
    ola: "Transport",
    amazon: "Shopping",
    flipkart: "Shopping",
    jio: "Utilities",
    airtel: "Utilities",
  };

  const lowerMerchant = merchant ?? "";
  const category =
    Object.keys(CATEGORY_GUESS).find((k) => lowerMerchant.includes(k)) ?? null;

  return {
    amount: amount ?? null,
    currency: "INR",
    merchant,
    category,
    dateISO: new Date().toISOString(),
    confidence: 0.6,
  };
}

/**
 * Helper to call OpenAI Chat Completions (server-side)
 */
async function callOpenAI(text: string): Promise<ParseResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  // Prompt asking model to respond with strict JSON matching our schema.
  const todayISO = new Date().toISOString().slice(0, 10);
  const system = `You are a JSON-only parser for an expense-tracking web app.
Users send short, messy entries like "200 swiggy", "lunch 120", "paid rent 5th Sep 25000", "refund -300 amazon".
Return ONLY valid JSON (no prose, no markdown) with exactly:
{
  "amount": number | null,
  "currency": string | null,
  "merchant": string | null,
  "category": string | null,
  "dateISO": string | null,
  "confidence": number | null
}

Rules:
1) Parse numeric amount if present. Currency (₹, Rs, INR, $, etc.) → set currency. If ambiguous, use null and lower confidence.
2) Merchant: best short name (lowercase ok). If unclear, null.
3) Category ∈ {Food & Dining, Groceries, Utilities, Transport, Shopping, Entertainment, Rent, Salary, Refund, Other}. If unsure: "Other" with lower confidence.
4) dateISO: ISO date (YYYY-MM-DD or full ISO). If absent, use today's date ${todayISO}.
5) confidence: 0.0-1.0 reflecting overall parsing certainty.
6) No extra fields. amount/confidence must be numbers, not strings. Use null when unknown.
7) If multiple expenses are present, parse only the first.

Examples:
Input: "200 swiggy"
Output: { "amount": 200, "currency": "INR", "merchant": "swiggy", "category": "Food & Dining", "dateISO": "${todayISO}", "confidence": 0.95 }

Input: "paid rent 5th Sep 2024 25000"
Output: { "amount": 25000, "currency": "INR", "merchant": "rent", "category": "Rent", "dateISO": "2024-09-05", "confidence": 0.95 }

Input: "refund -300 amazon"
Output: { "amount": -300, "currency": "INR", "merchant": "amazon", "category": "Refund", "dateISO": "${todayISO}", "confidence": 0.9 }

Input: "spent 500"
Output: { "amount": 500, "currency": null, "merchant": null, "category": "Other", "dateISO": "${todayISO}", "confidence": 0.3 }`;

  const user = `Parse this expense: "${text}"`;

  const payload = {
    model: "gpt-4o-mini", // can be adjusted if you prefer another available model
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 300,
    temperature: 0.0,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const j = await res.json();

  // Usage info (tokens + cost estimate)
const usage = j?.usage;
if (usage) {
  const { prompt_tokens, completion_tokens, total_tokens } = usage;

  // pricing for gpt-4o-mini
  const inputRate = 0.15 / 1_000_000;   // $0.15 per 1M input tokens
  const outputRate = 0.60 / 1_000_000;  // $0.60 per 1M output tokens
  const fxRate = 83; // adjust INR conversion if needed

  const inputCost = prompt_tokens * inputRate;
  const outputCost = completion_tokens * outputRate;
  const requestCostUSD = inputCost + outputCost;
  const requestCostINR = requestCostUSD * fxRate;

  // 🔹 Update running totals
  totalPromptTokens += prompt_tokens;
  totalCompletionTokens += completion_tokens;
  totalCostUSD += requestCostUSD;
  totalCostINR += requestCostINR;

  // Logs
  console.log(
    `Request usage: prompt=${prompt_tokens}, completion=${completion_tokens}, total=${total_tokens}, cost≈ $${requestCostUSD.toFixed(
      6
    )} (~₹${requestCostINR.toFixed(4)})`
  );

  console.log(
    `Cumulative usage: prompt=${totalPromptTokens}, completion=${totalCompletionTokens}, total≈ $${totalCostUSD.toFixed(
      4
    )} (~₹${totalCostINR.toFixed(2)})`
  );
}


  // The assistant message text should be JSON
  const assistant = j?.choices?.[0]?.message?.content;
  if (!assistant) throw new Error("No assistant content returned");

  // Try to parse assistant output as JSON (guard against stray text)
  // Some models may produce code fences — strip them if present.
  const cleaned = assistant
    .trim()
    .replace(/^```(json)?\n/, "")
    .replace(/\n```$/, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("OpenAI returned non-JSON output: " + String(e));
  }

  // Validate and coerce using zod
  const validated = ParseResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("OpenAI returned JSON that does not match schema");
  }

  return validated.data;
}

/**
 * The Next.js server route
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedReq = ParseRequest.parse(body);

    // If there is an API key, try OpenAI; otherwise fallback to local parse
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResult = await callOpenAI(parsedReq.text);
        return NextResponse.json({ source: "ai", result: aiResult });
      } catch (aiErr: unknown) {
        console.error("AI parse failed, falling back to local parse:", aiErr);
        const fallback = localParse(parsedReq.text);

        const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);

        return NextResponse.json({
          source: "fallback",
          error: errMsg,
          result: fallback,
        });
      }
    } else {
      // no key — local parse
      const fallback = localParse(parsedReq.text);
      return NextResponse.json({ source: "local", result: fallback });
    }
  } catch (err: unknown) {
    console.error("Parse route error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}
