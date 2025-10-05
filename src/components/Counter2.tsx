"use client";

type CounterProps = {
    count2: number;
    onChange: (newCount:number) => void;
}

export default function Counter2 ({count2, onChange}:CounterProps){

return (

    <div className="p-4 border rounded-md inline-block">
      <div className="mb-2 font-medium">Counter 2</div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(count2 - 1)}
          className="px-3 py-1 border rounded"
        >
          -
        </button>
        <div className="min-w-[48px] text-center">{count2}</div>
        <button
          onClick={() => onChange(count2 + 1)}
          className="px-3 py-1 border rounded"
        >
          +
        </button>
      </div>
    </div>
)
}