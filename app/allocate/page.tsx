// app/allocate/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
    id: string;
    date: string;
    description: string;
    amountCents: number;
    category: string | null;
    isAllocated: boolean;
    isOnTheDay: boolean;
    budgetItemId: string | null;
    budgetItem?: {
        id: string;
        name: string;
        type: string;
    };
};

type BudgetItem = {
    id: string;
    name: string;
    type: string;
    amountCents: number;
    frequency: string;
};

export default function AllocationPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<"all" | "allocated" | "unallocated" | "on-the-day">("all");
    const [loading, setLoading] = useState(true);
    const [allocationSummary, setAllocationSummary] = useState<any>(null);

    async function loadData() {
        setLoading(true);
        try {
            const [txRes, itemsRes, summaryRes] = await Promise.all([
                fetch("/api/transactions"),
                fetch("/api/items"),
                fetch("/api/transactions/allocate")
            ]);
            
            const txData = await txRes.json();
            const itemsData = await itemsRes.json();
            const summaryData = await summaryRes.json();
            
            setTransactions(txData.transactions || []);
            setBudgetItems(itemsData.items || []);
            setAllocationSummary(summaryData);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const filteredTransactions = transactions.filter(tx => {
        switch (filter) {
            case "allocated": return tx.isAllocated;
            case "unallocated": return !tx.isAllocated && !tx.isOnTheDay;
            case "on-the-day": return tx.isOnTheDay;
            default: return true;
        }
    });

    async function allocateTransactions(budgetItemId: string | null) {
        if (selectedTransactions.size === 0) return;
        
        try {
            const response = await fetch("/api/transactions/allocate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionIds: Array.from(selectedTransactions),
                    isAllocated: true,
                    budgetItemId
                })
            });
            
            if (response.ok) {
                setSelectedTransactions(new Set());
                await loadData();
            }
        } catch (error) {
            console.error("Error allocating transactions:", error);
        }
    }

    async function deallocateTransactions() {
        if (selectedTransactions.size === 0) return;
        
        try {
            const response = await fetch("/api/transactions/allocate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionIds: Array.from(selectedTransactions),
                    isAllocated: false
                })
            });
            
            if (response.ok) {
                setSelectedTransactions(new Set());
                await loadData();
            }
        } catch (error) {
            console.error("Error deallocating transactions:", error);
        }
    }

    async function markAsOnTheDay() {
        if (selectedTransactions.size === 0) return;
        
        try {
            // Update each transaction individually since we need to set isOnTheDay
            const promises = Array.from(selectedTransactions).map(id =>
                fetch(`/api/transactions/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        isOnTheDay: true,
                        isAllocated: false,
                        budgetItemId: null
                    })
                })
            );
            
            await Promise.all(promises);
            setSelectedTransactions(new Set());
            await loadData();
        } catch (error) {
            console.error("Error marking transactions as on-the-day:", error);
        }
    }

    const toggleTransaction = (id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    const cents = (n: number) => (n / 100).toLocaleString(undefined, {
        style: "currency",
        currency: "NZD",
    });

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Budget Allocation</h1>
                <Link href="/beat" className="px-4 py-2 bg-blue-600 text-white rounded">
                    Back to Dashboard
                </Link>
            </div>

            {/* Allocation Summary */}
            {allocationSummary && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <div className="text-sm text-blue-600">Allocated</div>
                        <div className="text-xl font-semibold">{cents(allocationSummary.allocated.amountCents)}</div>
                        <div className="text-sm opacity-70">{allocationSummary.allocated.count} transactions</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded p-4">
                        <div className="text-sm text-orange-600">On-the-day</div>
                        <div className="text-xl font-semibold">{cents(allocationSummary.onTheDay.amountCents)}</div>
                        <div className="text-sm opacity-70">{allocationSummary.onTheDay.count} transactions</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4">
                        <div className="text-sm text-gray-600">Unallocated</div>
                        <div className="text-xl font-semibold">{cents(allocationSummary.unallocated.amountCents)}</div>
                        <div className="text-sm opacity-70">{allocationSummary.unallocated.count} transactions</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="text-sm text-green-600">Available Balance</div>
                        <div className="text-xl font-semibold">{cents(allocationSummary.remainingAfterAllocation)}</div>
                        <div className="text-sm opacity-70">After allocation</div>
                    </div>
                </div>
            )}

            {/* Filter and Actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-3 py-2 rounded ${filter === "all" ? "bg-black text-white" : "bg-gray-100"}`}
                    >
                        All ({transactions.length})
                    </button>
                    <button
                        onClick={() => setFilter("unallocated")}
                        className={`px-3 py-2 rounded ${filter === "unallocated" ? "bg-black text-white" : "bg-gray-100"}`}
                    >
                        Unallocated ({transactions.filter(t => !t.isAllocated && !t.isOnTheDay).length})
                    </button>
                    <button
                        onClick={() => setFilter("allocated")}
                        className={`px-3 py-2 rounded ${filter === "allocated" ? "bg-black text-white" : "bg-gray-100"}`}
                    >
                        Allocated ({transactions.filter(t => t.isAllocated).length})
                    </button>
                    <button
                        onClick={() => setFilter("on-the-day")}
                        className={`px-3 py-2 rounded ${filter === "on-the-day" ? "bg-black text-white" : "bg-gray-100"}`}
                    >
                        On-the-day ({transactions.filter(t => t.isOnTheDay).length})
                    </button>
                </div>

                {selectedTransactions.size > 0 && (
                    <div className="flex gap-2">
                        <select
                            onChange={(e) => e.target.value && allocateTransactions(e.target.value)}
                            className="px-3 py-2 border rounded"
                            defaultValue=""
                        >
                            <option value="">Allocate to...</option>
                            {budgetItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.type})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={markAsOnTheDay}
                            className="px-3 py-2 bg-orange-600 text-white rounded"
                        >
                            Mark On-the-day
                        </button>
                        <button
                            onClick={deallocateTransactions}
                            className="px-3 py-2 bg-red-600 text-white rounded"
                        >
                            Deallocate
                        </button>
                        <span className="px-3 py-2 bg-gray-100 rounded">
                            {selectedTransactions.size} selected
                        </span>
                    </div>
                )}
            </div>

            {/* Transactions List */}
            <div className="bg-white border rounded">
                {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No transactions found for the selected filter.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedTransactions.has(tx.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedTransactions(new Set(filteredTransactions.map(tx => tx.id)));
                                                } else {
                                                    setSelectedTransactions(new Set());
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-left">Description</th>
                                    <th className="p-3 text-left">Amount</th>
                                    <th className="p-3 text-left">Status</th>
                                    <th className="p-3 text-left">Budget Item</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredTransactions.map(tx => (
                                    <tr key={tx.id} className={selectedTransactions.has(tx.id) ? "bg-blue-50" : ""}>
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedTransactions.has(tx.id)}
                                                onChange={() => toggleTransaction(tx.id)}
                                            />
                                        </td>
                                        <td className="p-3 text-sm">
                                            {new Date(tx.date).toDateString()}
                                        </td>
                                        <td className="p-3">
                                            <div>
                                                <div className="font-medium">{tx.description}</div>
                                                {tx.category && (
                                                    <div className="text-xs text-gray-500">{tx.category}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={tx.amountCents >= 0 ? "text-green-600" : "text-red-600"}>
                                                {tx.amountCents >= 0 ? "+" : ""}{cents(tx.amountCents)}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {tx.isAllocated && (
                                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                    Allocated
                                                </span>
                                            )}
                                            {tx.isOnTheDay && (
                                                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                                    On-the-day
                                                </span>
                                            )}
                                            {!tx.isAllocated && !tx.isOnTheDay && (
                                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                                    Unallocated
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-sm">
                                            {tx.budgetItem ? tx.budgetItem.name : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}