// app/transactions/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { TransactionList } from '@/components/TransactionList';

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number; // negative = spend, positive = income
  category_id: string;
  is_manual_override: boolean;
}

interface Category {
  category_id: string;
  name: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ MVP: hide income by default
  const [showIncome, setShowIncome] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txResponse, catResponse] = await Promise.all([
        fetch('/api/period/active/transactions'),
        fetch('/api/categories'),
      ]);

      if (!txResponse.ok || !catResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const txData = await txResponse.json();
      const catData = await catResponse.json();

      setTransactions(txData.transactions);
      setCategories(catData.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      await fetchData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update transaction category');
    }
  };

  const spendingTx = useMemo(
    () => transactions.filter((t) => t.amount < 0),
    [transactions]
  );

  const incomeTx = useMemo(
    () => transactions.filter((t) => t.amount > 0),
    [transactions]
  );

  const visibleTransactions = useMemo(() => {
    return showIncome ? transactions : spendingTx;
  }, [showIncome, transactions, spendingTx]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>

        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            type="checkbox"
            checked={showIncome}
            onChange={(e) => setShowIncome(e.target.checked)}
            className="h-4 w-4"
          />
          Show income
          <span className="text-gray-500">
            ({incomeTx.length} income, {spendingTx.length} spend)
          </span>
        </label>
      </div>

      {visibleTransactions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {showIncome ? 'No transactions found for this period' : 'No spending transactions found for this period'}
          </p>
        </div>
      ) : (
        <TransactionList
          transactions={visibleTransactions}
          categories={categories}
          onCategoryChange={handleCategoryChange}
        />
      )}
    </div>
  );
}