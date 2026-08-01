import Link from "next/link";

type PublicSection = "tournaments" | "submit";

export function PublicHeader({ active }: { active?: PublicSection }) {
  return (
    <header className="publicHeader">
      <div className="publicHeaderInner">
        <Link className="publicBrand" href="/">
          DLTV Organizer Portal
        </Link>
        <nav className="publicNav" aria-label="Public navigation">
          <Link
            className="publicNavLink"
            href="/tournaments"
            aria-current={active === "tournaments" ? "page" : undefined}
          >
            Browse tournaments
          </Link>
          <Link
            className="publicNavLink"
            href="/submit-tournament"
            aria-current={active === "submit" ? "page" : undefined}
          >
            Submit a tournament
          </Link>
        </nav>
      </div>
    </header>
  );
}
