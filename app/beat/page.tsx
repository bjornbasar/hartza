"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface FinancialSummary {
	month: string;
	incomeCents: number;
	expensesCents: number;
	availableCents: number;
	savingsGoals: SavingsGoal[];
	recentTransactions: Transaction[];
	categoryBreakdown: CategorySummary[];
}

interface SavingsGoal {
	id: string;
	name: string;
	currentCents: number;
	targetCents: number;
	progressPercent: number;
}

interface Transaction {
	id: string;
	description: string;
	amountCents: number;
	category: string;
	date: string;
	type: "INCOME" | "EXPENSE";
}

interface CategorySummary {
	category: string;
	amountCents: number;
	percentage: number;
	icon: string;
}

export default function Dashboard() {
	const [data, setData] = useState<FinancialSummary | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadDashboard() {
			try {
				const res = await fetch("/api/dashboard/summary");
				const summary = await res.json();
				setData(summary);
			} catch (error) {
				console.error("Failed to load dashboard:", error);
			} finally {
				setLoading(false);
			}
		}
		loadDashboard();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-lg">Loading your financial summary...</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="text-center py-12">
				<h2 className="text-2xl font-bold mb-4">Welcome to Hartza!</h2>
				<p className="text-gray-600 mb-6">
					Start tracking your finances to see insights here.
				</p>
				<Link
					href="/add"
					className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
				>
					Add Your First Transaction
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Beat</h1>
					<p className="text-gray-600">{data.month}</p>
				</div>
				<div className="flex gap-3">
					<Link
						href="/add"
						className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
					>
						+ Add Transaction
					</Link>
					<Link
						href="/den"
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					>
						🏠 Den Goals
					</Link>
				</div>
			</div>

			{/* Main Financial Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<SummaryCard
					label="💰 Income"
					value={formatCurrency(data.incomeCents)}
					className="bg-green-50 border-green-200"
					subtitle="This month"
				/>
				<SummaryCard
					label="💸 Expenses"
					value={formatCurrency(data.expensesCents)}
					className="bg-red-50 border-red-200"
					subtitle={
						<Link href="/paws" className="text-blue-600 hover:underline">
							👁️ View Details
						</Link>
					}
				/>
				<SummaryCard
					label="💾 Available"
					value={formatCurrency(data.availableCents)}
					className={`${
						data.availableCents >= 0
							? "bg-blue-50 border-blue-200"
							: "bg-orange-50 border-orange-200"
					}`}
					subtitle={
						data.availableCents >= 0 ? "Ready to save!" : "Review expenses"
					}
				/>
			</div>

			{/* Savings Goals Progress */}
			{data.savingsGoals?.length > 0 && (
				<div className="bg-white p-6 rounded-lg border">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold">🎯 Savings Goals</h2>
						<Link href="/den" className="text-blue-600 hover:underline">
							View All
						</Link>
					</div>
					<div className="space-y-4">
						{data.savingsGoals.slice(0, 2).map((goal) => (
							<SavingsProgress key={goal.id} goal={goal} />
						))}
					</div>
				</div>
			)}

			{/* Quick Spending Insights */}
			{data.categoryBreakdown?.length > 0 && (
				<div className="bg-white p-6 rounded-lg border">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold">💡 Where Your Money Goes</h2>
						<Link href="/paws" className="text-blue-600 hover:underline">
							Full Breakdown
						</Link>
					</div>
					<div className="space-y-3">
						{data.categoryBreakdown.slice(0, 5).map((cat) => (
							<CategoryBar key={cat.category} category={cat} />
						))}
					</div>
				</div>
			)}

			{/* Recent Activity */}
			<div className="bg-white p-6 rounded-lg border">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">📋 Recent Activity</h2>
					<Link href="/flow" className="text-blue-600 hover:underline">
						View All
					</Link>
				</div>
				<div className="space-y-2">
					{data.recentTransactions?.slice(0, 5).map((tx) => (
						<TransactionRow key={tx.id} transaction={tx} />
					))}
				</div>
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<QuickActionButton
					href="/add?type=expense"
					icon="💸"
					label="Add Expense"
				/>
				<QuickActionButton
					href="/add?type=income"
					icon="💰"
					label="Add Income"
				/>
				<QuickActionButton href="/paws" icon="🐾" label="View Paws" />
				<QuickActionButton href="/den/new" icon="🎯" label="New Goal" />
			</div>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	className = "",
	subtitle,
}: {
	label: string;
	value: string;
	className?: string;
	subtitle?: React.ReactNode;
}) {
	return (
		<div className={`p-6 rounded-lg border-2 ${className}`}>
			<div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
			<div className="text-2xl font-bold mb-2">{value}</div>
			<div className="text-sm text-gray-500">{subtitle}</div>
		</div>
	);
}

function SavingsProgress({ goal }: { goal: SavingsGoal }) {
	return (
		<div>
			<div className="flex justify-between items-center mb-2">
				<span className="font-medium">{goal.name}</span>
				<span className="text-sm text-gray-600">
					{formatCurrency(goal.currentCents)} /{" "}
					{formatCurrency(goal.targetCents)}
				</span>
			</div>
			<div className="w-full bg-gray-200 rounded-full h-3">
				<div
					className="bg-blue-600 h-3 rounded-full transition-all duration-300"
					style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
				></div>
			</div>
			<div className="text-sm text-gray-500 mt-1">
				{goal.progressPercent}% complete
			</div>
		</div>
	);
}

function CategoryBar({ category }: { category: CategorySummary }) {
	return (
		<div className="flex items-center gap-3">
			<span className="text-lg">{category.icon}</span>
			<div className="flex-1">
				<div className="flex justify-between items-center mb-1">
					<span className="font-medium capitalize">{category.category}</span>
					<span className="text-sm font-medium">
						{formatCurrency(category.amountCents)}
					</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2">
					<div
						className="bg-blue-500 h-2 rounded-full"
						style={{ width: `${category.percentage}%` }}
					></div>
				</div>
			</div>
			<span className="text-sm text-gray-500 w-10 text-right">
				{category.percentage}%
			</span>
		</div>
	);
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
	return (
		<div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
			<div>
				<div className="font-medium">{transaction.description}</div>
				<div className="text-sm text-gray-500 capitalize">
					{transaction.category} •{" "}
					{new Date(transaction.date).toLocaleDateString()}
				</div>
			</div>
			<div
				className={`font-semibold ${
					transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
				}`}
			>
				{transaction.type === "INCOME" ? "+" : "-"}
				{formatCurrency(Math.abs(transaction.amountCents))}
			</div>
		</div>
	);
}

function QuickActionButton({
	href,
	icon,
	label,
}: {
	href: string;
	icon: string;
	label: string;
}) {
	return (
		<Link
			href={href}
			className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors"
		>
			<span className="text-2xl mb-2">{icon}</span>
			<span className="text-sm font-medium">{label}</span>
		</Link>
	);
}

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat("en-NZ", {
		style: "currency",
		currency: "NZD",
	}).format(cents / 100);
}
