/**
 * StatusMessage Component
 * Display error and success messages
 */

import { AlertCircle, CheckCircle } from 'lucide-react';
import { ALERT_STYLES } from '@/lib/styles';

interface StatusMessageProps {
  error?: string;
  success?: string;
}

export default function StatusMessage({ error, success }: StatusMessageProps) {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className={ALERT_STYLES.error}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className={ALERT_STYLES.success}>
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
    </>
  );
}

