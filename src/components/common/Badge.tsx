import React from 'react';
import { getStatusBadgeColor } from '../../utils/formatters';

interface BadgeProps {
  status?: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status = 'DRAFT', label, size = 'md' }) => {
  const safeStatus = status || 'DRAFT';
  const styles = getStatusBadgeColor(safeStatus);
  const displayLabel = label || (typeof safeStatus === 'string' ? safeStatus.replace(/_/g, ' ') : String(safeStatus));

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded ${styles.bg} ${styles.text} border ${styles.border} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {displayLabel}
    </span>
  );
};
