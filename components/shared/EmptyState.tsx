import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12 glass-card">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <p className="text-foreground text-lg font-semibold">{title}</p>
      {description && <p className="text-muted-foreground mt-2">{description}</p>}
    </div>
  );
}
