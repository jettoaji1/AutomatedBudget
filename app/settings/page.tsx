// app/settings/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { PeriodType } from '@/src/types/BudgetPeriod';

interface UserSettings {
  user_id: string;
  period_type: PeriodType;
  anchor_day: number;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>(PeriodType.FIXED_DATE);
  const [anchorDay, setAnchorDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setPeriodType(data.settings.period_type);
      setAnchorDay(data.settings.anchor_day);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: periodType,
          anchor_day: anchorDay,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setSuccessMessage('Settings saved successfully! Changes will apply to new periods.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const calculatePeriodPreview = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    let currentStart: Date;
    let currentEnd: Date;
    let nextStart: Date;
    let nextEnd: Date;

    if (currentDay >= anchorDay) {
      // Current period: this month's anchor to next month's anchor
      currentStart = new Date(currentYear, currentMonth, anchorDay);
      currentEnd = new Date(currentYear, currentMonth + 1, anchorDay);
      nextStart = new Date(currentYear, currentMonth + 1, anchorDay);
      nextEnd = new Date(currentYear, currentMonth + 2, anchorDay);
    } else {
      // Before anchor: last month's anchor to this month's anchor
      currentStart = new Date(currentYear, currentMonth - 1, anchorDay);
      currentEnd = new Date(currentYear, currentMonth, anchorDay);
      nextStart = new Date(currentYear, currentMonth, anchorDay);
      nextEnd = new Date(currentYear, currentMonth + 1, anchorDay);
    }

    return {
      current: {
        start: currentStart.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        end: currentEnd.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      },
      next: {
        start: nextStart.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        end: nextEnd.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      },
    };
  };

  // ✅ Build TrueLayer connect URL with offline_access so we get refresh_token
  // ✅ Include balance too since you call /balances
  const connectUrl = useMemo(() => {
    const clientId = process.env.NEXT_PUBLIC_TRUELAYER_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TRUELAYER_REDIRECT_URI;

    if (!clientId || !redirectUri) return null;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'accounts transactions balance offline_access',
      providers: 'uk-ob-all',
      prompt: 'consent',
    });

    return `https://auth.truelayer.com/?${params.toString()}`;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const preview = calculatePeriodPreview();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Period Settings</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure how your budget periods are calculated. Changes apply to new periods only.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Period Type</label>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={PeriodType.FIXED_DATE}>
              Fixed Date (e.g., 1st to 1st of each month)
            </option>
            <option value={PeriodType.INCOME_ANCHORED}>Income Anchored (payday to payday)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {periodType === PeriodType.FIXED_DATE ? 'Start Day of Month' : 'Payday (Day of Month)'}
          </label>
          <select
            value={anchorDay}
            onChange={(e) => setAnchorDay(parseInt(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
                {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500">
            {periodType === PeriodType.FIXED_DATE
              ? 'Budget period runs from this day each month to the same day next month'
              : 'Budget period runs from your payday to the day before your next payday'}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Period Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Current Period</p>
              <p className="text-sm text-blue-700">
                {preview.current.start} → {preview.current.end}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Next Period</p>
              <p className="text-sm text-gray-700">
                {preview.next.start} → {preview.next.end}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Note: Existing periods are not affected. New periods will use these settings.
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Connection</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your bank via TrueLayer to automatically import transactions.
          </p>

          {connectUrl ? (
            <a
              href={connectUrl}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              Connect / Reconnect Bank
            </a>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                Missing NEXT_PUBLIC_TRUELAYER_CLIENT_ID or NEXT_PUBLIC_TRUELAYER_REDIRECT_URI in env.
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            This requests: accounts, transactions, balance, and offline_access (refresh token).
          </p>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}