import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="emptyState">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="emptyStateAction">{action}</div> : null}
    </div>
  );
}
