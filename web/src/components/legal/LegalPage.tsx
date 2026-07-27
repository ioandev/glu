import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import classes from "./legal.module.css";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  /** Human date, e.g. "25 July 2026". Owned by each content module. */
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  /** ADR 44: the convenience-translation line, on non-English legal documents. */
  notice?: ReactNode;
}

/**
 * The shared shell for GLU's two legal documents (ADR 26).
 *
 * A **server component with no Mantine and no store hook**: the content is
 * static prose, so it ships zero client JavaScript of its own. Theming still
 * works because it comes from the root layout — `ColorSchemeScript` (ADR 01)
 * and the chrome bootstrap (ADR 15) run on every route, so these pages read
 * the same `--glu-*` tokens the app does.
 *
 * `next/link` for every internal link, always: the app lives under
 * `basePath: '/glu'`, and a hand-written `/privacy` would land on the sibling
 * site's policy — a plausible-looking wrong document, the worst failure mode
 * this feature has.
 */
export function LegalPage({ title, updated, intro, sections, notice }: LegalPageProps) {
  // `useTranslations` works in a Server Component as long as it is not async —
  // which is what keeps this shell free of client JavaScript (ADR 44).
  const t = useTranslations("document");

  return (
    <main className={classes.page}>
      <div className={classes.column}>
        <header className={classes.header}>
          <div>
            <h1 className={classes.title}>{title}</h1>
            <p className={classes.updated}>{t("lastUpdated", { date: updated })}</p>
          </div>
          <Link href="/" className={classes.footerLink}>
            {t("backToGlu")}
          </Link>
        </header>

        {notice ? (
          <div className={classes.notice} data-testid="translation-notice">
            {notice}
          </div>
        ) : null}

        <DocumentProse intro={intro} sections={sections} />

        <nav className={classes.footer} aria-label={t("footerAriaLabel")}>
          {/* ADR 31: the gate is one-way, so this footer is how the pitch stays
              reachable to someone who skipped it — and how it gets shared. */}
          <Link href="/welcome" className={classes.footerLink}>
            {t("welcome")}
          </Link>
          <Link href="/docs" className={classes.footerLink}>
            {t("documentation")}
          </Link>
          <Link href="/privacy" className={classes.footerLink}>
            {t("privacy")}
          </Link>
          <Link href="/terms" className={classes.footerLink}>
            {t("terms")}
          </Link>
          <a
            className={classes.footerLink}
            href="https://github.com/ioandev/glu"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("sourceOnGitHub")}
          </a>
        </nav>
      </div>
    </main>
  );
}

/**
 * Intro block + sections, the prose treatment on its own (ADR 29).
 *
 * Extracted so the documentation modal renders *this*, not a lookalike: the
 * page and the overlay are two frames around one document, and a second copy
 * of these class names is how they drift apart. Zero visual change to the two
 * legal pages — `LegalPage` renders it in the same place the markup used to be.
 */
export function DocumentProse({
  intro,
  sections,
}: {
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <div className={classes.intro}>{intro}</div>

      <div className={classes.sections}>
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className={classes.heading}>{section.heading}</h2>
            <div className={classes.body}>{section.body}</div>
          </section>
        ))}
      </div>
    </>
  );
}

/**
 * The "Last updated" line on its own, for a surface that renders the document
 * without the page header — the documentation modal, whose title bar is
 * Mantine's (ADR 29).
 */
export function DocumentUpdated({ updated }: { updated: string }) {
  const t = useTranslations("document");
  return <p className={classes.updated}>{t("lastUpdated", { date: updated })}</p>;
}

/**
 * The footer treatment, exported for the documentation modal (ADR 29) — which
 * needs the same ≥44 px links without the page's `<main>` wrapper around them.
 */
export function DocumentNav({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav className={classes.footer} aria-label={label}>
      {children}
    </nav>
  );
}

/** A link in a `DocumentNav`. External hrefs open in a new tab. */
export function DocumentNavLink({
  href,
  children,
  newTab = false,
}: {
  href: string;
  children: ReactNode;
  newTab?: boolean;
}) {
  const tabProps = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Link href={href} className={classes.footerLink} {...tabProps}>
      {children}
    </Link>
  );
}

/** Shared by both documents for the "what / why" lists. */
export function DataList({ items }: { items: { term: string; detail: ReactNode }[] }) {
  return (
    <dl className={classes.dataList}>
      {items.map((item) => (
        <div key={item.term} className={classes.dataItem}>
          <dt className={classes.dataTerm}>{item.term}</dt>
          <dd className={classes.dataDetail}>{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The one link treatment both documents use. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external) {
    return (
      <a
        className={classes.link}
        href={href}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={classes.link} href={href}>
      {children}
    </Link>
  );
}
