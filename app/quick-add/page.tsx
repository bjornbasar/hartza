// app/quick-add/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QuickAddPage() {
    const router = useRouter();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [isIncome, setIsIncome] = useState(false);
    const [isOnTheDay, setIsOnTheDay] = useState(true);
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!description || !amount) return;

        setLoading(true);
        try {
            const amountCents = Math.round(parseFloat(amount) * 100);
            const finalAmount = isIncome ? amountCents : -amountCents;

            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date().toISOString(),
                    description,
                    amountCents: finalAmount,
                    category: category || null,
                    isOnTheDay: isOnTheDay,
                    isAllocated: false,
                    source: "manual-quick"
                })
            });

            if (response.ok) {
                router.push("/beat");
            } else {
                alert("Error adding transaction");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error adding transaction");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Quick Add Transaction</h1>
                <Link href="/beat" className="text-blue-600 underline">
                    Cancel
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 border rounded"
                        placeholder="Coffee, groceries, salary..."
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Amount (NZD)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 border rounded"
                        placeholder="0.00"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <div className="flex gap-3">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                checked={!isIncome}
                                onChange={() => setIsIncome(false)}
                                className="mr-2"
                            />
                            Expense
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                checked={isIncome}
                                onChange={() => setIsIncome(true)}
                                className="mr-2"
                            />
                            Income
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category (Optional)</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border rounded"
                        placeholder="Food, transport, entertainment..."
                    />
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isOnTheDay}
                            onChange={(e) => setIsOnTheDay(e.target.checked)}
                            className="mr-2"
                        />
                        <span className="text-sm">
                            <strong>Mark as "On-the-day" transaction</strong>
                            <div className="text-xs text-gray-600 mt-1">
                                These are out-of-budget items that don't count towards your regular allocation.
                                Uncheck to create a regular transaction that needs allocation.
                            </div>
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading || !description || !amount}
                    className="w-full p-3 bg-green-600 text-white rounded disabled:opacity-50"
                >
                    {loading ? "Adding..." : `Add ${isOnTheDay ? "On-the-day" : "Regular"} Transaction`}
                </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-medium mb-2">Transaction Types:</h3>
                <ul className="text-sm space-y-1">
                    <li><strong>Regular:</strong> Goes into your budget allocation system</li>
                    <li><strong>On-the-day:</strong> Out-of-budget tracking for impulse purchases</li>
                </ul>
            </div>
        </div>
    );
}