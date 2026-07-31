export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="statusBadge" data-status={status}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
