// components/RefreshButton.tsx
'use client';

import { useState } from 'react';

interface RefreshButtonProps {
  onRefreshComplete: () => void;
}

interface RefreshResult {
  inserted: number;
  deduped: number;
  lastRefreshedAt: string;
}

export function RefreshButton({ onRefreshComplete }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefreshResult | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'RECONNECT_REQUIRED') {
          setError('TrueLayer connection expired. Please reconnect your bank account.');
        } else {
          setError(data.error || 'Failed to refresh transactions');
        }
        return;
      }

      setResult(data);
      setLastRefresh(data.lastRefreshedAt);
      
      // Notify parent to reload data
      onRefreshComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col items-end space-y-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`px-4 py-2 rounded-md font-medium text-white ${
          loading
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Refreshing...
          </span>
        ) : (
          'Refresh Transactions'
        )}
      </button>

      {lastRefresh && !loading && (
        <p className="text-sm text-gray-600">
          Last refreshed: {formatTimestamp(lastRefresh)}
        </p>
      )}

      {result && !loading && (
        <div className="text-sm text-green-600">
          Added {result.inserted} new transaction{result.inserted !== 1 ? 's' : ''}
          {result.deduped > 0 && ` (${result.deduped} duplicate${result.deduped !== 1 ? 's' : ''} skipped)`}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 max-w-md">
          <p className="text-sm text-red-800">{error}</p>
          {error.includes('reconnect') && (
            <p className="text-xs text-red-600 mt-2">
              Contact support or check TrueLayer credentials in settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
