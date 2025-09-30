import { useEffect, useState } from "react";

export function CycleTrend({
	mode,
	view,
	offset,
}: {
	mode: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
	view: "ACTUALS" | "FORECAST";
	offset: number;
}) {
	const [cycles, setCycles] = useState<
		Array<{
			label: "Prev" | "Current" | "Next";
			opening: number;
			income: number;
			expenses: number;
			net: number;
			closing: number;
		}>
	>([]);

	useEffect(() => {
		let aborted = false;

		async function loadTriplet() {
			const [prevRes, curRes, nextRes] = await Promise.all([
				fetch("/api/dashboard", {
					method: "POST",
					body: JSON.stringify({ mode, offset: offset - 1, view }),
				}),
				fetch("/api/dashboard", {
					method: "POST",
					body: JSON.stringify({ mode, offset, view }),
				}),
				fetch("/api/dashboard", {
					method: "POST",
					body: JSON.stringify({ mode, offset: offset + 1, view }),
				}),
			]);
			const [prev, cur, next] = await Promise.all([
				prevRes.json(),
				curRes.json(),
				nextRes.json(),
			]);

			if (aborted) return;

			const pick = (d: any, label: "Prev" | "Current" | "Next") => ({
				label,
				opening: d.openingBalanceCents ?? 0,
				income: d.totals?.incomeCents ?? 0,
				expenses: d.totals?.expenseCents ?? 0,
				net:
					d.totals?.netCents ??
					(d.totals ? d.totals.incomeCents - d.totals.expenseCents : 0),
				closing: d.closingBalanceCents ?? 0,
			});

			setCycles([pick(prev, "Prev"), pick(cur, "Current"), pick(next, "Next")]);
		}

		loadTriplet();
		return () => {
			aborted = true;
		};
	}, [mode, view, offset]);

	if (cycles.length !== 3) {
		return (
			<div className="rounded border p-4">
				<div className="text-sm opacity-70">Loading cycle trend…</div>
			</div>
		);
	}

	// scale bars to the largest absolute number among income/expenses/net across all three cycles
	const maxAbs =
		cycles
			.flatMap((c) => [c.income, c.expenses, c.net].map((n) => Math.abs(n)))
			.reduce((m, n) => Math.max(m, n), 1) || 1;

	return (
		<div className="rounded border p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div className="font-semibold">Cycle trend</div>
				<div className="text-xs opacity-70">
					{view === "ACTUALS" ? "Actuals" : "Forecast"} • {mode.toLowerCase()}
				</div>
			</div>

			{/* legend */}
			<div className="flex gap-4 text-xs opacity-80">
				<div className="flex items-center gap-1">
					<span className="inline-block h-2 w-2 rounded-sm bg-green-600" />{" "}
					Income
				</div>
				<div className="flex items-center gap-1">
					<span className="inline-block h-2 w-2 rounded-sm bg-red-600" />{" "}
					Expenses
				</div>
				<div className="flex items-center gap-1">
					<span className="inline-block h-2 w-2 rounded-sm bg-gray-900" /> Net
				</div>
			</div>

			<div className="space-y-4">
				{cycles.map((c) => {
					const netColor =
						c.net > 0
							? "bg-green-700"
							: c.net < 0
							? "bg-red-700"
							: "bg-gray-900";
					const pct = (n: number) =>
						`${Math.min(100, Math.round((Math.abs(n) / maxAbs) * 100))}%`;

					return (
						<div key={c.label} className="space-y-1">
							<div className="flex items-baseline justify-between">
								<div className="text-sm font-medium w-20">{c.label}</div>
								<div className="text-xs opacity-70">
									Open {cents(c.opening)} → Close {cents(c.closing)}
								</div>
							</div>

							{/* stacked row: income / expenses / net */}
							<div className="grid grid-cols-3 gap-3">
								<div className="space-y-1">
									<div className="text-xs opacity-70">Income</div>
									<Bar
										value={c.income}
										className="bg-green-600"
										pct={pct(c.income)}
									/>
									<div className="text-xs text-right opacity-70">
										{cents(c.income)}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs opacity-70">Expenses</div>
									<Bar
										value={c.expenses}
										className="bg-red-600"
										pct={pct(c.expenses)}
									/>
									<div className="text-xs text-right opacity-70">
										-{cents(c.expenses)}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs opacity-70">Net</div>
									<Bar value={c.net} className={netColor} pct={pct(c.net)} />
									<div className="text-xs text-right opacity-70">
										{c.net >= 0 ? "+" : "-"}
										{cents(Math.abs(c.net))}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function Bar({
	value,
	pct,
	className,
}: {
	value: number;
	pct: string;
	className: string;
}) {
	// Visual bar that grows left or right from center based on sign
	const sign = value === 0 ? 0 : value > 0 ? 1 : -1;
	return (
		<div className="h-3 w-full rounded bg-gray-100 overflow-hidden relative">
			{sign !== 0 && (
				<div
					className={`h-3 absolute top-0 ${className} ${
						sign > 0 ? "left-1/2" : "right-1/2"
					}`}
					style={{
						width: pct,
						transform: "translateX(" + (sign > 0 ? "0" : "0") + ")",
					}}
				/>
			)}
			{/* center axis */}
			<div className="absolute left-1/2 top-0 h-3 w-px bg-gray-300" />
		</div>
	);
}

function cents(n: number) {
	return (n / 100).toLocaleString(undefined, {
		style: "currency",
		currency: "NZD",
	});
}
