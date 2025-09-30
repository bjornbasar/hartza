"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface CategoryData {
  category: string;
  amountCents: number;
  percentage: number;
  icon: string;
  transactionCount: number;
  averageCents: number;
}

interface MonthlyData {
  month: string;
  totalExpenseCents: number;
  categories: CategoryData[];
}

export default function PawsPage() {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = current month

  useEffect(() => {
    loadCategoryData();
  }, [selectedMonth]);

  async function loadCategoryData() {
    try {
      const response = await fetch(`/api/categories?offset=${selectedMonth}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load category data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading spending analysis...</div>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold mb-2">No Spending Data Yet</h2>
        <p className="text-gray-600 mb-6">
          Add some expenses to see your spending breakdown here.
        </p>
        <Link href="/add?type=expense" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Add Your First Expense
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🐾 Spending Paws</h1>
          <p className="text-gray-600">{data.month}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/beat" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            ← Back to Beat
          </Link>
          <Link href="/add?type=expense" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            + Add Expense
          </Link>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setSelectedMonth(m => m + 1)}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          ← Previous Month
        </button>
        <button
          onClick={() => setSelectedMonth(0)}
          className={`px-4 py-2 border rounded ${selectedMonth === 0 ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}
        >
          Current Month
        </button>
        {selectedMonth > 0 && (
          <button
            onClick={() => setSelectedMonth(m => m - 1)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Next Month →
          </button>
        )}
      </div>

      {/* Total Spending */}
      <div className="bg-white p-6 rounded-lg border text-center">
        <div className="text-sm text-gray-600 mb-2">Total Expenses</div>
        <div className="text-4xl font-bold text-red-600 mb-2">
          {formatCurrency(data.totalExpenseCents)}
        </div>
        <div className="text-sm text-gray-500">
          {data.categories.reduce((sum, cat) => sum + cat.transactionCount, 0)} transactions
        </div>
      </div>

      {/* Categories Breakdown */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-6">Where Your Money Goes</h2>
        <div className="space-y-4">
          {data.categories.map((category, index) => (
            <CategoryRow key={category.category} category={category} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">💡 Spending Insights</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {data.categories.length > 0 && (
            <>
              <InsightCard
                title="Biggest Category"
                value={data.categories[0].category}
                description={`${data.categories[0].percentage}% of total spending`}
                icon={data.categories[0].icon}
              />
              <InsightCard
                title="Average per Transaction"
                value={formatCurrency(
                  data.categories.reduce((sum, cat) => sum + cat.averageCents * cat.transactionCount, 0) /
                  data.categories.reduce((sum, cat) => sum + cat.transactionCount, 0)
                )}
                description="Across all categories"
                icon="💳"
              />
              {data.categories.length >= 2 && (
                <InsightCard
                  title="Top 2 Categories"
                  value={`${data.categories[0].percentage + data.categories[1].percentage}%`}
                  description="of your total spending"
                  icon="🎯"
                />
              )}
              <InsightCard
                title="Categories Used"
                value={`${data.categories.length}`}
                description="different spending categories"
                icon="📦"
              />
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionButton href="/add?type=expense" icon="💸" label="Add Expense" />
        <QuickActionButton href="/flow" icon="📋" label="View Flow" />
        <QuickActionButton href="/den" icon="🏠" label="Den Goals" />
        <QuickActionButton href="/beat" icon="🐻" label="Beat" />
      </div>
    </div>
  );
}

function CategoryRow({ category, rank }: { category: CategoryData; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
          {rank}
        </div>
        <span className="text-2xl">{category.icon}</span>
        <div className="flex-1">
          <div className="font-medium capitalize text-lg">{category.category}</div>
          <div className="text-sm text-gray-500">
            {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''} • 
            Avg {formatCurrency(category.averageCents)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-semibold text-lg">{formatCurrency(category.amountCents)}</div>
          <div className="text-sm text-gray-500">{category.percentage}% of total</div>
        </div>
        
        <div className="w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeDasharray={`${(category.percentage / 100) * 176} 176`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="text-xs font-medium text-center mt-1 text-blue-600">
            {category.percentage}%
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ 
  title, 
  value, 
  description, 
  icon 
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: string;
}) {
  return (
    <div className="bg-white p-4 rounded border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-blue-900">{title}</span>
      </div>
      <div className="text-xl font-bold text-blue-800 mb-1">{value}</div>
      <div className="text-sm text-blue-600">{description}</div>
    </div>
  );
}

function QuickActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
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
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(cents / 100);
}