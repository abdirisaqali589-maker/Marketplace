import React from 'react';
import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const ActionButton = actionHref ? (
    <Link to={actionHref} className="btn-primary">{actionLabel}</Link>
  ) : (
    <button onClick={onAction} className="btn-primary">{actionLabel}</button>
  );

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}
      >
        {icon || <Inbox className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>{title}</h3>
      {description && <p className="text-sm mb-6 max-w-md" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>}
      {actionLabel && ActionButton}
    </div>
  );
}