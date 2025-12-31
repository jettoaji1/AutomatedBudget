// app/transactions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { TransactionList } from '@/components/TransactionList';

interface Transaction {
  transaction_id: string;
  date: string;
  merchant_name: string;
  description: string;
  amount: number;
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

      // Refresh transactions
      await fetchData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update transaction category');
    }
  };

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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Transactions</h1>
      
      {transactions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No transactions found for this period</p>
        </div>
      ) : (
        <TransactionList
          transactions={transactions}
          categories={categories}
          onCategoryChange={handleCategoryChange}
        />
      )}
    </div>
  );
}
