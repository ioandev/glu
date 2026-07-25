import type { ReactNode } from "react";
import Link from "next/link";
import {
  WELCOME_EYEBROW,
  WELCOME_HEADLINE,
  WELCOME_SUB,
  welcomeFeatures,
  welcomeFootnote,
} from "./WelcomeSections";
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
  return (
    <main className={classes.page}>
      <div className={classes.column}>
        <header className={classes.hero}>
          <p className={classes.eyebrow}>{WELCOME_EYEBROW}</p>
          <h1 className={classes.headline}>{WELCOME_HEADLINE}</h1>
          <p className={classes.sub}>{WELCOME_SUB}</p>
          <div className={classes.ctaRow}>{action}</div>
        </header>

        <ul className={classes.features}>
          {welcomeFeatures.map((feature) => (
            <li key={feature.title} className={classes.feature}>
              <h2 className={classes.featureTitle}>{feature.title}</h2>
              <p className={classes.featureBody}>{feature.body}</p>
            </li>
          ))}
        </ul>

        <p className={classes.footnote}>{welcomeFootnote}</p>

        <nav className={classes.footer} aria-label="About GLU">
          <Link href="/docs" className={classes.footerLink}>
            How GLU works
          </Link>
          <Link href="/privacy" className={classes.footerLink}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={classes.footerLink}>
            Terms of Service
          </Link>
          <a
            className={classes.footerLink}
            href="https://github.com/ioandev/glu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </a>
        </nav>
      </div>
    </main>
  );
}
