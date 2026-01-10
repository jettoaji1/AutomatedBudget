'use client';

import { useEffect, useState, useRef } from 'react';
import { CategorySummary } from '@/components/CategorySummary';
import { RefreshButton } from '@/components/RefreshButton';

const AUTO_REFRESH_HOURS = 12;

export default function DashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoRefreshTriggered = useRef(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, settingsRes] = await Promise.all([
        fetch('/api/period/active'),
        fetch('/api/settings'),
      ]);

      if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard');
      if (!settingsRes.ok) throw new Error('Failed to fetch settings');

      const dashboardData = await dashboardRes.json();
      const { settings } = await settingsRes.json();

      setData(dashboardData);

      maybeAutoRefresh(settings?.last_refreshed_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const maybeAutoRefresh = async (lastRefreshedAt?: string | null) => {
    if (autoRefreshTriggered.current) return;

    if (!lastRefreshedAt) {
      autoRefreshTriggered.current = true;
      await triggerRefresh();
      return;
    }

    const last = new Date(lastRefreshedAt).getTime();
    const now = Date.now();
    const hours = (now - last) / (1000 * 60 * 60);

    if (hours >= AUTO_REFRESH_HOURS) {
      autoRefreshTriggered.current = true;
      await triggerRefresh();
    }
  };

  const triggerRefresh = async () => {
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (res.ok) {
        await loadDashboard();
      }
    } catch {
      // silent failure — manual refresh still available
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error ?? 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <RefreshButton onRefreshComplete={loadDashboard} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded shadow">
          <p className="text-sm text-gray-500">Period Start</p>
          <p className="text-xl font-semibold">
            {new Date(data.period.start_date).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <p className="text-sm text-gray-500">Period End</p>
          <p className="text-xl font-semibold">
            {new Date(data.period.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <p className="text-sm text-gray-500">Starting Balance</p>
          <p className="text-xl font-semibold">
            £{data.period.starting_balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {data.category_summaries.map((cat: any) => (
          <CategorySummary key={cat.category_id} category={cat} />
        ))}
      </div>
    </div>
  );
}