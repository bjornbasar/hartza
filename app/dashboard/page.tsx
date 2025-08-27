"use client";
import { useEffect, useState } from "react";

type Mode = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

export default function Dashboard() {
	const [mode, setMode] = useState<Mode>("WEEKLY");
	const [offset, setOffset] = useState(0);
	const [data, setData] = useState<any>(null);

	async function load() {
		const res = await fetch("/api/dashboard", {
			method: "POST",
			body: JSON.stringify({ mode, offset }),
		});
		const json = await res.json();
		setData(json);
	}
	useEffect(() => {
		load();
	}, [mode, offset]);

	return (
        
		<div className="p-6 max-w-4xl mx-auto space-y-4">
			<h1 className="text-2xl font-bold">Hartza Beats</h1>
			<div className="flex gap-2 items-center">
				<select
					className="border p-2 rounded"
					value={mode}
					onChange={(e) => setMode(e.target.value as Mode)}
				>
					<option>WEEKLY</option>
					<option>FORTNIGHTLY</option>
					<option>MONTHLY</option>
				</select>
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

			{data && (
				<div className="space-y-2">
					<div className="text-sm opacity-70">
						Period: {new Date(data.period.start).toDateString()} —{" "}
						{new Date(data.period.end).toDateString()}
					</div>
					<div className="grid grid-cols-3 gap-3">
						<Stat label="Income" value={cents(data.totals.incomeCents)} />
						<Stat label="Expenses" value={cents(data.totals.expenseCents)} />
						<Stat label="Net" value={cents(data.totals.netCents)} />
					</div>
					<ul className="divide-y">
						{data.events.map((e: any) => (
							<li key={e.id + e.date} className="py-2 flex justify-between">
								<span>
									{new Date(e.date).toDateString()} — {e.name}
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
