import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <p className="text-gray-600 text-lg">{title}</p>
      {description && <p className="text-gray-500 mt-2">{description}</p>}
    </div>
  );
}

