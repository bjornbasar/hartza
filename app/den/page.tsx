"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SavingsGoal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function DenPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadSavingsGoals();
  }, []);

  async function loadSavingsGoals() {
    try {
      const response = await fetch('/api/savings-goals');
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load savings goals:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading your savings goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏠 Den Goals</h1>
          <p className="text-gray-600">Track your progress towards financial goals</p>
        </div>
        <div className="flex gap-3">
          <Link href="/beat" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            ← Back to Beat
          </Link>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🎯 New Goal
          </button>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2">No Den Goals Yet</h2>
          <p className="text-gray-600 mb-6">
            Start building your financial future by setting your first den goal!
          </p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {goals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} onUpdate={loadSavingsGoals} />
          ))}
        </div>
      )}

      {/* Savings Tips */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">💡 Den Tips</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• Start with small, achievable goals to build momentum</li>
          <li>• Set up automatic transfers to save consistently</li>
          <li>• Review and adjust your goals monthly</li>
          <li>• Celebrate when you reach milestones!</li>
        </ul>
      </div>

      {/* Create Goal Modal */}
      {showCreateForm && (
        <CreateGoalModal 
          onClose={() => setShowCreateForm(false)} 
          onSuccess={() => {
            setShowCreateForm(false);
            loadSavingsGoals();
          }}
        />
      )}
    </div>
  );
}

function SavingsGoalCard({ goal, onUpdate }: { goal: SavingsGoal; onUpdate: () => void }) {
  const progressPercent = goal.targetCents > 0 ? Math.round((goal.currentCents / goal.targetCents) * 100) : 0;
  const remainingCents = goal.targetCents - goal.currentCents;
  const isCompleted = goal.currentCents >= goal.targetCents;

  return (
    <div className={`bg-white p-6 rounded-lg border-2 ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold">{goal.name}</h3>
            {isCompleted && <span className="text-2xl">🎉</span>}
          </div>
          <div className="text-sm text-gray-600">
            {goal.targetDate && (
              <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="font-medium">
            {formatCurrency(goal.currentCents)} / {formatCurrency(goal.targetCents)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">{progressPercent}% complete</span>
          {!isCompleted && (
            <span className="text-sm text-gray-500">
              {formatCurrency(remainingCents)} remaining
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <AddMoneyButton goalId={goal.id} onUpdate={onUpdate} />
        <button className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
          ✏️ Edit Goal
        </button>
        {isCompleted && (
          <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            🎉 Celebrate!
          </button>
        )}
      </div>
    </div>
  );
}

function AddMoneyButton({ goalId, onUpdate }: { goalId: string; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddMoney(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/savings-goals/${goalId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(parseFloat(amount) * 100)
        })
      });

      if (response.ok) {
        setShowForm(false);
        setAmount("");
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to add money:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!showForm) {
    return (
      <button 
        onClick={() => setShowForm(true)}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        💰 Add Money
      </button>
    );
  }

  return (
    <form onSubmit={handleAddMoney} className="flex-1 flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-2 top-2 text-gray-500">$</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full pl-6 pr-2 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          autoFocus
        />
      </div>
      <button 
        type="submit" 
        disabled={!amount || isSubmitting}
        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
      >
        {isSubmitting ? '...' : '✓'}
      </button>
      <button 
        type="button" 
        onClick={() => setShowForm(false)}
        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
      >
        ✕
      </button>
    </form>
  );
}

function CreateGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !target || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetCents: Math.round(parseFloat(target) * 100),
          targetDate: targetDate ? new Date(targetDate).toISOString() : null
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">🎯 Create New Savings Goal</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Goal Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Vacation, New Car"
              required
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full pl-8 pr-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Date (Optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || !target || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(cents / 100);
}