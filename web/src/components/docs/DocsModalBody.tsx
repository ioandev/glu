import {
  DocumentNav,
  DocumentNavLink,
  DocumentProse,
  DocumentUpdated,
} from "@/components/legal/LegalPage";
import { DOCS_UPDATED, docsIntro, docsSections } from "./DocsSections";
import classes from "./docs.module.css";

/**
 * The manual inside the drawer's modal (ADR 29).
 *
 * The same `docsSections` the `/glu/docs` route renders, in the same prose
 * treatment — this file owns the *frame*, never the copy. Default-exported
 * because the drawer pulls it in with `next/dynamic`: it is the largest block
 * of text in the app and the least often opened, so the timer's first paint
 * should not carry it.
 *
 * The closing navigation is the brief's: the two legal documents, then the
 * shareable page. All three open in a new tab — the app behind this overlay has
 * a wake lock, a primed audio context and possibly a running timer, and none of
 * them survive a navigation.
 */
export default function DocsModalBody() {
  return (
    <div className={classes.modalBody} data-testid="docs-modal-body">
      <DocumentUpdated updated={DOCS_UPDATED} />
      <DocumentProse intro={docsIntro} sections={docsSections} />

      <DocumentNav label="Docs navigation">
        <DocumentNavLink href="/privacy" newTab>
          Privacy Policy
        </DocumentNavLink>
        <DocumentNavLink href="/terms" newTab>
          Terms of Service
        </DocumentNavLink>
        <DocumentNavLink href="/docs" newTab>
          Open as a page
        </DocumentNavLink>
      </DocumentNav>
    </div>
  );
}
