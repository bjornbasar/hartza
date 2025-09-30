"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const EXPENSE_CATEGORIES = [
  { value: "food", label: "🍕 Food & Dining", keywords: ["restaurant", "groceries", "coffee", "lunch", "dinner"] },
  { value: "housing", label: "🏠 Housing", keywords: ["rent", "mortgage", "utilities", "insurance"] },
  { value: "transportation", label: "🚗 Transportation", keywords: ["gas", "fuel", "uber", "taxi", "bus", "parking"] },
  { value: "shopping", label: "🛍️ Shopping", keywords: ["amazon", "clothing", "electronics"] },
  { value: "entertainment", label: "🎬 Entertainment", keywords: ["movie", "netflix", "spotify", "games"] },
  { value: "healthcare", label: "⚕️ Healthcare", keywords: ["doctor", "pharmacy", "medical", "dental"] },
  { value: "utilities", label: "💡 Utilities", keywords: ["electricity", "water", "internet", "phone"] },
  { value: "other", label: "📦 Other", keywords: [] }
];

const INCOME_CATEGORIES = [
  { value: "salary", label: "💼 Salary", keywords: ["salary", "payroll", "wages"] },
  { value: "freelance", label: "💻 Freelance", keywords: ["freelance", "contract", "consulting"] },
  { value: "investment", label: "📈 Investment", keywords: ["dividend", "interest", "stock"] },
  { value: "gift", label: "🎁 Gift", keywords: ["gift", "bonus"] },
  { value: "other", label: "💰 Other Income", keywords: [] }
];

export default function AddTransaction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(
    (searchParams?.get('type') === 'income' ? 'INCOME' : 'EXPENSE') || 'EXPENSE'
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Auto-categorization based on description
  useEffect(() => {
    if (description && !category) {
      const descLower = description.toLowerCase();
      const matchedCategory = categories.find(cat => 
        cat.keywords.some(keyword => descLower.includes(keyword))
      );
      if (matchedCategory) {
        setCategory(matchedCategory.value);
      }
    }
  }, [description, category, categories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!amount || !description) return;
    
    setIsSubmitting(true);
    
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      const finalAmount = type === 'EXPENSE' ? -amountCents : amountCents;
      
      const response = await fetch('/api/v2/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: finalAmount,
          description,
          category: category || 'other',
          type,
          date: new Date(date).toISOString()
        })
      });

      if (response.ok) {
        router.push('/beat?added=true');
      } else {
        alert('Failed to add transaction. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/beat" className="text-blue-600 hover:underline">
          ← Back to Beat
        </Link>
        <h1 className="text-3xl font-bold mt-2">Add Transaction</h1>
        <p className="text-gray-600">Track your income and expenses</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Transaction Type</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                type === 'EXPENSE' 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">💸</div>
              <div className="font-medium">Expense</div>
              <div className="text-sm text-gray-500">Money spent</div>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                type === 'INCOME' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="font-medium">Income</div>
              <div className="text-sm text-gray-500">Money received</div>
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description *
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'EXPENSE' ? "e.g. Groceries at Countdown" : "e.g. Salary payment"}
            required
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {description && category && (
            <div className="mt-2 text-sm text-blue-600">
              💡 Auto-categorized as: {categories.find(c => c.value === category)?.label}
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose category...</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Link
            href="/beat"
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !amount || !description}
            className={`flex-1 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
              isSubmitting || !amount || !description
                ? 'bg-gray-400 cursor-not-allowed'
                : type === 'EXPENSE'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </span>
            ) : (
              `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'}`
            )}
          </button>
        </div>

        {/* Quick Add Another */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="addAnother"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="addAnother" className="text-sm text-gray-600">
              Keep this form open to add another transaction
            </label>
          </div>
        </div>
      </form>

      {/* Quick Templates */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="font-medium mb-4">🚀 Quick Add Common {type === 'EXPENSE' ? 'Expenses' : 'Income'}</h3>
        <div className="grid grid-cols-2 gap-2">
          {type === 'EXPENSE' ? (
            <>
              <QuickButton onClick={() => {setDescription("Coffee"); setCategory("food"); setAmount("5.50");}} text="☕ Coffee ($5.50)" />
              <QuickButton onClick={() => {setDescription("Lunch"); setCategory("food"); setAmount("15.00");}} text="🍽️ Lunch ($15)" />
              <QuickButton onClick={() => {setDescription("Groceries"); setCategory("food"); setAmount("80.00");}} text="🛒 Groceries ($80)" />
              <QuickButton onClick={() => {setDescription("Fuel"); setCategory("transportation"); setAmount("60.00");}} text="⛽ Fuel ($60)" />
            </>
          ) : (
            <>
              <QuickButton onClick={() => {setDescription("Salary"); setCategory("salary"); setAmount("");}} text="💼 Salary" />
              <QuickButton onClick={() => {setDescription("Freelance payment"); setCategory("freelance"); setAmount("");}} text="💻 Freelance" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickButton({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 bg-white border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
    >
      {text}
    </button>
  );
}