import Link from "next/link";

import { ApiStatus } from "@/components/public/api-status";
import { defaultLocale, localizePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  API_PROVIDER_URL,
  API_TERMS_VERSION,
} from "@/lib/public-api/constants";

/**
 * Общий футер публичных страниц: три колонки (о проекте, ресурсы,
 * данные и атрибуция) и нижняя строка с копирайтом и живым статусом API.
 */
export function PublicFooter({ locale = defaultLocale }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.footer;

  return (
    <footer className="siteFooter" aria-label={copy.label}>
      <div className="siteFooterInner">
        <div className="siteFooterColumns">
          <section className="siteFooterColumn">
            <h2>{copy.aboutTitle}</h2>
            <p>{copy.aboutDescription}</p>
          </section>

          <nav className="siteFooterColumn" aria-labelledby="footer-resources">
            <h2 id="footer-resources">{copy.resourcesTitle}</h2>
            <ul>
              <li>
                <Link href={localizePath(locale, "/tournaments")}>
                  {copy.catalogLink}
                </Link>
              </li>
              <li>
                <Link href={localizePath(locale, "/submit-tournament")}>
                  {copy.submitLink}
                </Link>
              </li>
              <li>
                <Link href={localizePath(locale, "/api-docs")}>
                  {copy.apiDocsLink}
                </Link>
              </li>
              <li>
                <Link href={localizePath(locale, "/api-access")}>
                  {copy.apiAccessLink}
                </Link>
              </li>
              <li>
                <Link href={localizePath(locale, "/api-terms")}>
                  {copy.apiTermsLink}
                </Link>
              </li>
            </ul>
          </nav>

          <section className="siteFooterColumn">
            <h2>{copy.dataTitle}</h2>
            <ul>
              <li>{copy.attribution}</li>
              <li>
                <a href={API_PROVIDER_URL} rel="noreferrer">
                  {API_PROVIDER_URL.replace("https://", "")}
                </a>
              </li>
              <li>
                {copy.termsVersion}: <code>{API_TERMS_VERSION}</code>
              </li>
            </ul>
          </section>
        </div>

        <div className="siteFooterBar">
          <span>
            {copy.copyright.replace("{year}", String(new Date().getFullYear()))}
          </span>
          <ApiStatus copy={copy} locale={locale} />
        </div>
      </div>
    </footer>
  );
}
