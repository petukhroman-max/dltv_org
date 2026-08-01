import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export function StatusBadge({
  status,
  locale = "en",
}: {
  status: string;
  locale?: Locale;
}) {
  const labels = getDictionary(locale).domain.status;
  const label =
    status in labels
      ? labels[status as keyof typeof labels]
      : status.replaceAll("_", " ");
  return (
    <span className="statusBadge" data-status={status}>
      {label}
    </span>
  );
}
