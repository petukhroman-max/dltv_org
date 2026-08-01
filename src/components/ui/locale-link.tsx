"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { defaultLocale, localeFromPathname, localizePath } from "@/i18n/config";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

export function LocaleLink({ href, children, ...props }: Props) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname) ?? defaultLocale;
  const localizedHref =
    typeof href === "string" && href.startsWith("/")
      ? localizePath(locale, href)
      : href;
  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  );
}
