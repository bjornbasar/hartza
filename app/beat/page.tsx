// app/beat/page.tsx
"use client";
import { useEffect, useState } from "react";
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
			<h1 className="text-2xl font-bold">Dashboard (Beat)</h1>

			<div className="flex flex-wrap gap-2 items-center filter-selection">
				<select
					className="border p-2 rounded"
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
						◀ Prev
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
						Next ▶
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
					<div className="grid grid-cols-4 gap-3">
						<Stat label="Opening" value={cents(data.openingBalanceCents)} />
						<Stat label="Income" value={cents(data.totals.incomeCents)} />
						<Stat label="Expenses" value={cents(data.totals.expenseCents)} />
						<Stat label="Closing" value={cents(data.closingBalanceCents)} />
					</div>

					<ul className="divide-y">
						{data.events.map((e: any) => (
							<li key={e.id} className="py-2 flex justify-between">
								<span>
									{new Date(e.date).toDateString()} — {e.name}
									{e.source === "FORECAST" ? (
										<em className="ml-2 text-xs opacity-60">(forecast)</em>
									) : null}
								</span>
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

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="border rounded p-4">
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
