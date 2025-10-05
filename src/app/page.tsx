"use client"; //use Client makes sure that the state function that are typically used to call information from the server will now instead refer to the browser instead of the server.

/*not sure what useState does exactly but I think it is to do with momentarily storing data, like the string data that was entered in the
  form field is shown in the transaction history because the state is carrying that information somehow down to history */

import { useState, useEffect } from "react";

import Counter1 from "@/components/Counter";
import Counter2 from "@/components/Counter2";
import SumCount from "@/components/SumCounter";

// this function is using regex to parse the input from what will eventually be the prompt for chatgpt and converting it into the amount spent and the name of the merchant.
function parseInput(raw: string) {
  const s = raw.trim();
  if (!s)
    return { amount: null as number | null, merchant: null as string | null };

  const numMatch = s.match(/\d+(?:\.\d{1,2})?/);
  const amount = numMatch ? parseFloat(numMatch[0]) : null;

  const merchant =
    s
      .replace(numMatch ? numMatch[0] : "", "")
      .replace(/[^a-zA-Z\s]/g, "")
      .trim()
      .toLowerCase() || null;

  return { amount, merchant };
}

export default function Home() {
  const [raw, setRaw] = useState("");

  const [transactions, setTransactions] = useState<
  {
    id: string;
    amount: number | string;   // ← allow string or number
    currency: string;
    merchant: string;
    category: string;
    createdAt: string;
  }[]
>([]);


  type ParsedResult = {
    amount: number | null;
    currency: string | null;
    merchant: string | null;
    category: string | null;
    dateISO: string | null;
    confidence: number | null;
  };

  const [pending, setPending] = useState<ParsedResult | null>(null);
  const [pendingSource, setPendingSource] = useState<
    "AI" | "local" | "fallback" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const categories = [
    "Food & Dining",
    "Groceries",
    "Utilities",
    "Transport",
    "Shopping",
    "Entertainment",
    "Rent",
    "Salary",
    "Refund",
    "Other",
  ];

  const [draft, setDraft] = useState<ParsedResult | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("expensey:transactions");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // basic validation: ensure it's an array
      if (Array.isArray(parsed)) {
        setTransactions(parsed);
      }
    } catch (e) {
      console.error("Failed to load transactions from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (!pending) {
      setDraft(null);
      return;
    }
    // seed editable draft with pending result, default currency/date
    setDraft({
      amount: pending.amount ?? null,
      currency: pending.currency ?? "INR",
      merchant: pending.merchant ?? "",
      category: pending.category ?? "Other",
      dateISO: pending.dateISO ?? new Date().toISOString().slice(0, 10),
      confidence: pending.confidence ?? null,
    });
  }, [pending]);

  // save to localStorage whenever transactions change
  useEffect(() => {
    loadFromServer();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      // data: { source: "ai"|"local"|"fallback", result: { ...parsed fields... } }
      setPending(data.result);
      setPendingSource(data.source);
      setRaw("");
    } catch (err: any) {
      setSubmitErr(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function updateDraft<K extends keyof ParsedResult>(
    key: K,
    value: ParsedResult[K]
  ) {
    setDraft((d) => (d ? ({ ...d, [key]: value } as ParsedResult) : d));
  }

  function cancelPending() {
    setPending(null);
    setPendingSource(null);
    setDraft(null);
  }

  async function confirmSave() {
    // 1) Narrow 'draft' so TS knows it's not null
    if (!draft) {
      alert("Nothing to save yet.");
      return;
    }
    const d = draft; // d: ParsedResult

    // 2) Validate required fields
    if (d.amount == null || !d.merchant || !d.category) {
      alert("Please fill amount, merchant, and category before saving.");
      return;
    }

    const payload = {
      amount: Number(d.amount),
      currency: d.currency ?? "INR",
      merchant: String(d.merchant),
      category: String(d.category),
      userNote: pendingSource ? `source:${pendingSource}` : undefined,
      dateISO: d.dateISO ?? new Date().toISOString(),
    };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      alert("Save failed: " + error);
      return;
    }

    await loadFromServer(); // refresh list from DB
    cancelPending(); // clear confirm panel
  }

  async function loadFromServer() {
    const res = await fetch("/api/transactions", { cache: "no-store" });
    const data = await res.json();
    setTransactions(data);
  }
  function formatAmount(a: number | string) {
  const n = typeof a === "number" ? a : parseFloat(a);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

  // const [count1, setCount1] = useState(0);
  // const [count2, setCount2] = useState(0);
  // const total = count1 + count2;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Expense Tracker</h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          type="text"
          placeholder="e.g. 200 swiggy"
          className="flex-grow border rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {submitting ? "Parsing..." : "Add"}
        </button>
      </form>
      {pending && draft && (
        <div className="mb-6 rounded border p-4">
          <div className="mb-3 text-sm text-gray-600">
            Parsed by <span className="font-medium">{pendingSource}</span>
            {typeof draft.confidence === "number" && (
              <> · confidence {Math.round(draft.confidence * 100)}%</>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Amount
              <input
                type="number"
                step="0.01"
                value={draft.amount ?? ""}
                onChange={(e) =>
                  updateDraft(
                    "amount",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>

            <label className="text-sm">
              Merchant
              <input
                type="text"
                value={draft.merchant ?? ""}
                onChange={(e) => updateDraft("merchant", e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>

            <label className="text-sm">
              Category
              <select
                value={draft.category ?? "Other"}
                onChange={(e) => updateDraft("category", e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Date
              <input
                type="date"
                value={(draft.dateISO ?? "").slice(0, 10)}
                onChange={(e) =>
                  updateDraft(
                    "dateISO",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null
                  )
                }
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={confirmSave}
              className="rounded bg-black px-4 py-2 text-white"
            >
              Save
            </button>
            <button
              onClick={cancelPending}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {transactions.map((t) => (
          <li key={t.id} className="flex justify-between border rounded p-3">
            <div>
              <div className="font-medium">{t.merchant}</div>
              <div className="text-xs text-gray-500">
                {new Date(t.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="font-semibold">₹ {formatAmount(t.amount)}</div>
          </li>
        ))}
        {transactions.length === 0 && (
          <div className="text-sm text-gray-500">No transactions yet.</div>
        )}
      </ul>
    </main>
  );
}
