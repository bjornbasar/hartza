"use client";
import { useState } from "react";

type ItemType = "INCOME" | "EXPENSE";
type Frequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

export default function BitPage() {
    const [type, setType] = useState<ItemType>("EXPENSE");
    const [frequency, setFrequency] = useState<Frequency>("WEEKLY");

    async function onSubmit(formData: FormData) {
        const payload: any = {
            type,
            name: String(formData.get("name")),
            amountCents: Math.round(parseFloat(String(formData.get("amount"))) * 100),
            frequency,
            startDate: String(formData.get("startDate")),
            endDate: String(formData.get("endDate")) || null,
        };
        if (frequency === "WEEKLY")
            payload.weeklyDay = Number(formData.get("weeklyDay"));
        if (frequency === "FORTNIGHTLY")
            payload.fortnightAnchor = String(formData.get("fortnightAnchor"));
        if (frequency === "MONTHLY")
            payload.monthDay = Number(formData.get("monthDay"));

        await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        window.location.href = "/bits";
    }

    return (
        <form action={onSubmit} className="p-6 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Add Item</h1>

            <div className="flex gap-2">
                <select
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as ItemType)}
                    className="border p-2 rounded"
                >
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                </select>
                <input
                    name="name"
                    placeholder="Name"
                    className="border p-2 rounded flex-1"
                    required
                />
                <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="Amount (NZD)"
                    className="border p-2 rounded w-40"
                    required
                />
            </div>

            <div className="flex gap-2">
                <select
                    name="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="border p-2 rounded"
                >
                    <option>WEEKLY</option>
                    <option>FORTNIGHTLY</option>
                    <option>MONTHLY</option>
                </select>
                <input
                    type="date"
                    name="startDate"
                    className="border p-2 rounded"
                    required
                />
                <input
                    type="date"
                    name="endDate"
                    className="border p-2 rounded"
                    placeholder="Optional"
                />
            </div>

            {frequency === "WEEKLY" && (
                <div>
                    <label className="block text-sm">Day of week</label>
                    <select name="weeklyDay" className="border p-2 rounded">
                        <option value={1}>Mon</option>
                        <option value={2}>Tue</option>
                        <option value={3}>Wed</option>
                        <option value={4}>Thu</option>
                        <option value={5}>Fri</option>
                        <option value={6}>Sat</option>
                        <option value={0}>Sun</option>
                    </select>
                </div>
            )}

            {frequency === "FORTNIGHTLY" && (
                <div>
                    <label className="block text-sm">Start date (anchor)</label>
                    <input
                        type="date"
                        name="fortnightAnchor"
                        className="border p-2 rounded"
                        required
                    />
                </div>
            )}

            {frequency === "MONTHLY" && (
                <div>
                    <label className="block text-sm">Day of month</label>
                    <input
                        type="number"
                        name="monthDay"
                        min={1}
                        max={31}
                        className="border p-2 rounded"
                        required
                    />
                </div>
            )}

            <button className="px-4 py-2 border rounded">Save</button>
        </form>
    );
}
