"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DocumentNav,
  DocumentNavLink,
  DocumentProse,
  DocumentUpdated,
} from "@/components/legal/LegalPage";
import { loadDocs, type DocumentContent } from "./content";
import classes from "./docs.module.css";

/**
 * The manual inside the drawer's modal (ADR 29).
 *
 * The same content module the `/glu/docs` route renders, in the same prose
 * treatment — this file owns the *frame*, never the copy. Default-exported
 * because the drawer pulls it in with `next/dynamic`: it is the largest block
 * of text in the app and the least often opened, so the timer's first paint
 * should not carry it.
 *
 * The copy is fetched rather than imported (ADR 44) so this chunk carries **one
 * language**, not six — the manual is far too large to ship the whole roster of
 * it to a reader who will only ever see one. The route has no such problem: it
 * resolves the same module on the server.
 *
 * The closing navigation is the brief's: the two legal documents, then the
 * shareable page. All three open in a new tab — the app behind this overlay has
 * a wake lock, a primed audio context and possibly a running timer, and none of
 * them survive a navigation.
 */
export default function DocsModalBody() {
  const locale = useLocale();
  const t = useTranslations("document");
  const tChrome = useTranslations("chrome");
  const [content, setContent] = useState<DocumentContent | null>(null);

  useEffect(() => {
    let current = true;
    void loadDocs(locale).then((loaded) => {
      if (current) setContent(loaded);
    });
    // The modal can outlive a language change, and an out-of-order resolve
    // would paint the language the reader just left.
    return () => {
      current = false;
    };
  }, [locale]);

  return (
    <div className={classes.modalBody} data-testid="docs-modal-body">
      {content === null ? (
        <p className={classes.loading}>{tChrome("loading")}</p>
      ) : (
        <>
          <DocumentUpdated updated={content.updated} />
          <DocumentProse intro={content.intro} sections={content.sections} />
        </>
      )}

      <DocumentNav label={t("docsNavAriaLabel")}>
        <DocumentNavLink href="/privacy" newTab>
          {t("privacy")}
        </DocumentNavLink>
        <DocumentNavLink href="/terms" newTab>
          {t("terms")}
        </DocumentNavLink>
        <DocumentNavLink href="/docs" newTab>
          {t("openAsPage")}
        </DocumentNavLink>
      </DocumentNav>
    </div>
  );
}
