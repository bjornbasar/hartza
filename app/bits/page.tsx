// app/bits/page.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type ItemType = "INCOME" | "EXPENSE";
type Frequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

type Bit = {
	id: string;
	type: ItemType;
	name: string;
	amountCents: number;
	frequency: Frequency;
	startDate: string;
	endDate: string | null;
};

export default function BitsPage() {
	const [items, setItems] = useState<Bit[]>([]);
	const [loading, setLoading] = useState(true);

	async function load() {
		setLoading(true);
		const res = await fetch("/api/items", { cache: "no-store" });
		const json = await res.json();
		setItems(json.items || []);
		setLoading(false);
	}

	useEffect(() => {
		load();
	}, []);

	async function onDelete(id: string) {
		await fetch(`/api/items/${id}`, { method: "DELETE" });
		load();
	}

	return (
		<div className="p-6 max-w-3xl mx-auto">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Bits (Transactions)</h1>
				<div className="flex gap-2">
					<Link
						href="/bits/new"
						className="px-3 py-2 border rounded bg-green-600 text-white"
					>
						➕ Add Bit
					</Link>
				</div>
			</div>

			{loading ? (
				<div className="mt-6 opacity-70">Loading…</div>
			) : items.length === 0 ? (
				<div className="mt-6">
					<p className="opacity-70">No items yet.</p>
					<Link href="/bits/new" className="underline text-blue-600">
						Create your first bit
					</Link>
				</div>
			) : (
				<ul className="mt-6 divide-y">
					{items.map((b) => (
						<li key={b.id} className="py-3 flex items-center justify-between">
							<div className="flex flex-col">
								<span className="font-medium">
									{b.name} •{" "}
									{(b.amountCents / 100).toLocaleString(undefined, {
										style: "currency",
										currency: "NZD",
									})}
								</span>
								<span className="text-sm opacity-70">
									{b.type} • {b.frequency} •{" "}
									{new Date(b.startDate).toDateString()}
									{b.endDate ? ` → ${new Date(b.endDate).toDateString()}` : ""}
								</span>
							</div>
							<div className="flex gap-3">
								<Link
									href={`/bits/${b.id}/edit`}
									className="text-blue-600 underline"
								>
									Edit
								</Link>
								<button
									onClick={() => onDelete(b.id)}
									className="text-red-600 underline"
								>
									Delete
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
