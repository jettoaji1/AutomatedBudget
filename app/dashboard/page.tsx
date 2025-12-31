// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { CategorySummary } from '@/components/CategorySummary';

interface CategorySummaryData {
  category_id: string;
  name: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
}

interface PeriodData {
  period: {
    period_id: string;
    start_date: string;
    end_date: string;
    starting_balance: number;
  };
  category_summaries: CategorySummaryData[];
}

export default function DashboardPage() {
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/period/active');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Period Start
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {new Date(data.period.start_date).toLocaleDateString()}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Period End
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {new Date(data.period.end_date).toLocaleDateString()}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Starting Balance
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                £{data.period.starting_balance.toFixed(2)}
              </dd>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Category Spending
        </h2>
        <div className="space-y-4">
          {data.category_summaries.map((category) => (
            <CategorySummary key={category.category_id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
