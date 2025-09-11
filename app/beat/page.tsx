// app/beat/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CycleTrend } from "../components/CycleTrend";

type Mode = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
type View = "ACTUALS" | "FORECAST";

export default function BeatPage() {
	const [mode, setMode] = useState<Mode>("WEEKLY");
	const [offset, setOffset] = useState(0);
	const [view, setView] = useState<View>("ACTUALS");
	const [data, setData] = useState<any>(null);

	async function load() {
		const res = await fetch("/api/dashboard", {
			method: "POST",
			body: JSON.stringify({ mode, offset, view }),
		});
		const json = await res.json();
		setData(json);
	}
	useEffect(() => {
		load();
	}, [mode, offset, view]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Dashboard (Beat)</h1>
				<div className="flex gap-2">
					<Link href="/quick-add" className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
						+ Quick Add
					</Link>
					<Link href="/allocate" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
						Allocate
					</Link>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 items-center filter-selection">
				<select
					className="border p-2 rounded cursor-pointer"
					value={mode}
					onChange={(e) => setMode(e.target.value as Mode)}
				>
					<option>WEEKLY</option>
					<option>FORTNIGHTLY</option>
					<option>MONTHLY</option>
				</select>
				<div className="ml-2 inline-flex rounded border overflow-hidden">
					<button
						className={`px-3 py-2 ${
							view === "ACTUALS" ? "bg-black text-white" : ""
						}`}
						onClick={() => setView("ACTUALS")}
					>
						Actuals
					</button>
					<button
						className={`px-3 py-2 ${
							view === "FORECAST" ? "bg-black text-white" : ""
						}`}
						onClick={() => setView("FORECAST")}
					>
						Forecast
					</button>
				</div>
				<div className="ml-auto flex gap-2">
					<button
						className="px-3 py-2 border rounded"
						onClick={() => setOffset((o) => o - 1)}
					>
						{"< Prev"}
					</button>
					<button
						className="px-3 py-2 border rounded"
						onClick={() => setOffset(0)}
					>
						Today
					</button>
					<button
						className="px-3 py-2 border rounded"
						onClick={() => setOffset((o) => o + 1)}
					>
						{"Next >"}
					</button>
				</div>
			</div>

			<CycleTrend mode={mode} view={view} offset={offset} />

			{data && (
				<div className="space-y-3">
					<div className="text-sm opacity-70">
						Period: {new Date(data.period.start).toDateString()} —{" "}
						{new Date(data.period.end).toDateString()}
					</div>

					{/* Opening / Totals / Closing */}
					<div className="grid grid-cols-5 gap-3">
						<Stat label="Opening" value={cents(data.openingBalanceCents)} />
						<Stat label="Income" value={cents(data.totals.incomeCents)} />
						<Stat label="Expenses" value={cents(data.totals.expenseCents)} />
						<Stat label="Closing" value={cents(data.closingBalanceCents)} />
						<Stat 
							label="Available" 
							value={cents(data.remainingBalanceCents || data.closingBalanceCents)} 
							className="bg-green-50 border-green-200"
						/>
					</div>

					{/* Allocation Summary */}
					{view === "ACTUALS" && data.totals && (
						<div className="grid grid-cols-3 gap-3 pt-2 border-t">
							<Stat 
								label="Allocated" 
								value={cents(data.totals.allocatedCents || 0)}
								className="bg-blue-50 border-blue-200"
							/>
							<Stat 
								label="On-the-day" 
								value={cents(data.totals.onTheDayCents || 0)}
								className="bg-orange-50 border-orange-200"
							/>
							<Stat 
								label="Unallocated" 
								value={cents(data.totals.unallocatedCents || 0)}
								className="bg-gray-50 border-gray-200"
							/>
						</div>
					)}

					<ul className="divide-y">
						{data.events.map((e: any) => (
							<li key={e.id} className="py-2 flex justify-between items-center">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span>{new Date(e.date).toDateString()} — {e.name}</span>
										{e.source === "FORECAST" && (
											<em className="text-xs opacity-60">(forecast)</em>
										)}
										{e.isAllocated && (
											<span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Allocated</span>
										)}
										{e.isOnTheDay && (
											<span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">On-the-day</span>
										)}
									</div>
								</div>
								<span
									className={
										e.type === "EXPENSE" ? "text-red-600" : "text-green-700"
									}
								>
									{e.type === "EXPENSE" ? "-" : "+"}
									{cents(e.amountCents)}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
	return (
		<div className={`border rounded p-4 ${className}`}>
			<div className="text-sm opacity-70">{label}</div>
			<div className="text-xl font-semibold">{value}</div>
		</div>
	);
}
function cents(n: number) {
	return (n / 100).toLocaleString(undefined, {
		style: "currency",
		currency: "NZD",
	});
}
