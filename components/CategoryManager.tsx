// components/CategoryManager.tsx
import { useState } from 'react';

interface Category {
  category_id: string;
  name: string;
  monthly_limit: number;
  is_default: boolean;
}

interface CategoryManagerProps {
  categories: Category[];
  onRefresh: () => Promise<void>;
}

export function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (category: Category) => {
    setEditingId(category.category_id);
    setEditName(category.name);
    setEditLimit(category.monthly_limit.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLimit('');
  };

  const saveEdit = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          monthly_limit: parseFloat(editLimit),
        }),
      });

      if (!response.ok) throw new Error('Failed to update category');

      cancelEdit();
      await onRefresh();
    } catch (err) {
      alert('Failed to update category');
    }
  };

  const archiveCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to archive this category?')) return;

    try {
      const response = await fetch(`/api/categories/${categoryId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive category');
      }

      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive category');
    }
  };

  const addCategory = async () => {
    if (!newName.trim() || !newLimit) {
      alert('Please enter both name and limit');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          monthly_limit: parseFloat(newLimit),
        }),
      });

      if (!response.ok) throw new Error('Failed to create category');

      setNewName('');
      setNewLimit('');
      setIsAdding(false);
      await onRefresh();
    } catch (err) {
      alert('Failed to create category');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {categories.map((category) => (
          <div key={category.category_id} className="p-6">
            {editingId === category.category_id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Category name"
                />
                <input
                  type="number"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Monthly limit"
                  step="0.01"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => saveEdit(category.category_id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {category.name}
                    {category.is_default && (
                      <span className="ml-2 text-xs text-gray-500">(Default)</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Limit: £{category.monthly_limit.toFixed(2)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  {!category.is_default && (
                    <button
                      onClick={() => archiveCategory(category.category_id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Category</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Category name"
          />
          <input
            type="number"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Monthly limit"
            step="0.01"
          />
          <div className="flex space-x-2">
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Category
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewName('');
                setNewLimit('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
        >
          + Add New Category
        </button>
      )}
    </div>
  );
}
