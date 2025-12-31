// components/CategorySummary.tsx
interface CategorySummaryProps {
  category: {
    category_id: string;
    name: string;
    monthly_limit: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
}

export function CategorySummary({ category }: CategorySummaryProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
        <span className="text-sm text-gray-500">
          £{category.spent.toFixed(2)} / £{category.monthly_limit.toFixed(2)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full ${getProgressColor(category.percentage)}`}
          style={{ width: `${Math.min(category.percentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {category.percentage}% used
        </span>
        <span className={category.remaining > 0 ? 'text-green-600' : 'text-red-600'}>
          £{category.remaining.toFixed(2)} remaining
        </span>
      </div>
    </div>
  );
}
