// components/TransactionList.tsx
import { useState } from 'react';

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
  category_id: string;
  is_manual_override: boolean;
}

interface Category {
  category_id: string;
  name: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, categoryId: string) => Promise<void>;
}

interface RowState {
  pendingCategoryId: string | null;
  saving: boolean;
  error: string | null;
}

export function TransactionList({ transactions, categories, onCategoryChange }: TransactionListProps) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const handleDropdownChange = (transactionId: string, newCategoryId: string, currentCategoryId: string) => {
    if (newCategoryId !== currentCategoryId) {
      setRowStates(prev => ({
        ...prev,
        [transactionId]: {
          pendingCategoryId: newCategoryId,
          saving: false,
          error: null,
        },
      }));
    } else {
      setRowStates(prev => {
        const newState = { ...prev };
        delete newState[transactionId];
        return newState;
      });
    }
  };

  const handleSave = async (transactionId: string) => {
    const rowState = rowStates[transactionId];
    if (!rowState || !rowState.pendingCategoryId) return;

    setRowStates(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        saving: true,
        error: null,
      },
    }));

    try {
      await onCategoryChange(transactionId, rowState.pendingCategoryId);

      setRowStates(prev => {
        const newState = { ...prev };
        delete newState[transactionId];
        return newState;
      });
    } catch (err) {
      setRowStates(prev => ({
        ...prev,
        [transactionId]: {
          ...prev[transactionId],
          saving: false,
          error: err instanceof Error ? err.message : 'Failed to save',
        },
      }));
    }
  };

  const handleCancel = (transactionId: string) => {
    setRowStates(prev => {
      const newState = { ...prev };
      delete newState[transactionId];
      return newState;
    });
  };

  const getDisplayCategoryId = (transaction: Transaction): string => {
    const rowState = rowStates[transaction.transaction_id];
    return rowState?.pendingCategoryId || transaction.category_id;
  };

  const isDirty = (transactionId: string): boolean => {
    return !!rowStates[transactionId]?.pendingCategoryId;
  };

  const isSaving = (transactionId: string): boolean => {
    return !!rowStates[transactionId]?.saving;
  };

  const getError = (transactionId: string): string | null => {
    return rowStates[transactionId]?.error || null;
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const dirty = isDirty(transaction.transaction_id);
              const saving = isSaving(transaction.transaction_id);
              const error = getError(transaction.transaction_id);
              const displayCategoryId = getDisplayCategoryId(transaction);

              return (
                <tr key={transaction.transaction_id} className={dirty ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('en-GB')}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {transaction.description}
                  </td>

                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    £{Math.abs(transaction.amount).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={displayCategoryId}
                      onChange={(e) =>
                        handleDropdownChange(
                          transaction.transaction_id,
                          e.target.value,
                          transaction.category_id
                        )
                      }
                      disabled={saving}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        dirty ? 'border-yellow-400 bg-yellow-50' : ''
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {categories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.name}
                          {transaction.is_manual_override &&
                          transaction.category_id === category.category_id &&
                          !dirty
                            ? ' ✓'
                            : ''}
                        </option>
                      ))}
                    </select>

                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dirty && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSave(transaction.transaction_id)}
                          disabled={saving}
                          className={`px-3 py-1 text-xs font-medium rounded-md text-white ${
                            saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {saving ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-1 h-3 w-3 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Saving
                            </span>
                          ) : (
                            'Save'
                          )}
                        </button>

                        <button
                          onClick={() => handleCancel(transaction.transaction_id)}
                          disabled={saving}
                          className="px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {!dirty && transaction.is_manual_override && (
                      <span className="text-xs text-gray-400">Manually set</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}