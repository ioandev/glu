import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CLOCK_COUNT } from "@/clocks/registry";
import classes from "./welcome.module.css";

/**
 * The welcome's frame (ADR 31) — the shape both surfaces wear: the route at
 * `/glu/welcome` and the first-visit gate on `/glu`.
 *
 * A **server component with no Mantine and no store hook**, the same discipline
 * `LegalPage` keeps (ADR 26): the pitch is static prose, so it ships no client
 * JavaScript of its own and the route renders fully without any. Only the call
 * to action is a client component, and it arrives as a prop — which is also
 * what lets the two frames differ in the one way they must.
 *
 * Theming needs nothing here: `ColorSchemeScript` (ADR 01) and the chrome
 * bootstrap (ADR 15) run on every route, so this page reads the same `--glu-*`
 * tokens the app does.
 *
 * `next/link` for every internal link, always. Under `basePath: '/glu'` a
 * hand-written `/docs` lands on the sibling site — a plausible-looking wrong
 * page, which is the worst way to fail.
 */
export function WelcomeContent({ action }: { action: ReactNode }) {
  const t = useTranslations("welcome");
  const tDoc = useTranslations("document");
  const tChrome = useTranslations("chrome");
  // `<b>` is the only markup the pitch uses, so one chunk handler covers it.
  const bold = { b: (chunks: ReactNode) => <b>{chunks}</b> };

  const features = [
    { title: t("featureClockTitle"), body: t.rich("featureClockBody", { ...bold, count: CLOCK_COUNT }) },
    { title: t("featureEnvironmentTitle"), body: t.rich("featureEnvironmentBody", bold) },
    { title: t("featureRecordTitle"), body: t.rich("featureRecordBody", bold) },
    { title: t("featureTodoistTitle"), body: t.rich("featureTodoistBody", bold) },
  ];

  return (
    <main className={classes.page}>
      <div className={classes.column}>
        <header className={classes.hero}>
          <p className={classes.eyebrow}>{t("eyebrow")}</p>
          <h1 className={classes.headline}>{t("headline")}</h1>
          <p className={classes.sub}>{t("sub")}</p>
          <div className={classes.ctaRow}>{action}</div>
        </header>

        <p className={classes.installCallout}>{t.rich("installNote", bold)}</p>

        <ul className={classes.features}>
          {features.map((feature) => (
            <li key={feature.title} className={classes.feature}>
              <h2 className={classes.featureTitle}>{feature.title}</h2>
              <p className={classes.featureBody}>{feature.body}</p>
            </li>
          ))}
        </ul>

        <p className={classes.footnote}>{t("footnote")}</p>

        <nav className={classes.footer} aria-label={t("aboutNavAriaLabel")}>
          <Link href="/docs" className={classes.footerLink}>
            {tChrome("docsTitle")}
          </Link>
          <Link href="/privacy" className={classes.footerLink}>
            {tDoc("privacy")}
          </Link>
          <Link href="/terms" className={classes.footerLink}>
            {tDoc("terms")}
          </Link>
          <a
            className={classes.footerLink}
            href="https://github.com/ioandev/glu"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tDoc("sourceOnGitHub")}
          </a>
        </nav>
      </div>
    </main>
  );
}
