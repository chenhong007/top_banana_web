import { ReactNode } from 'react';

// Admin layout - keeps the root layout but isolates styles
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {children}
    </div>
  );
}
