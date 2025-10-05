"use client";


//total = counter 1 state + counter 2 state
//both counter states are already available in page.tsx
//so I just need to write the layout of the component in SumCounter.tsx and then use the sum in the page.tsx is my guess
type SumCounterProps = {
    count1:number,
    count2:number
}
export default function SumCount ({count1, count2}:SumCounterProps){
const total = count1 + count2
    return (
        <div>Total = {total}</div>
    )
}