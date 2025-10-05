"use client";

type CounterProps = {
    count1: number;
    onChange: (newCount:number) => void;
}

export default function Counter1 ({count1, onChange}:CounterProps){

return (

    <div className="p-4 border rounded-md inline-block">
      <div className="mb-2 font-medium">Counter 1</div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(count1 - 1)}
          className="px-3 py-1 border rounded"
        >
          -
        </button>
        <div className="min-w-[48px] text-center">{count1}</div>
        <button
          onClick={() => onChange(count1 + 1)}
          className="px-3 py-1 border rounded"
        >
          +
        </button>
      </div>
    </div>
)
}