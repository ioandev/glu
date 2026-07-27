"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select, Text } from "@mantine/core";
import { useLocale, useTranslations } from "next-intl";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_PATH,
  LOCALE_ENDONYM,
  SUPPORTED_LOCALES,
  resolveLocalePreference,
} from "@/lib/locale";
import { useGluStore } from "@/store/gluStore";
import classes from "./settings.module.css";

/**
 * Settings → Language (ADR 44).
 *
 * **The cookie is what changes the language; the store field is a mirror.**
 * The server resolves the locale from the cookie before it renders anything, so
 * the cookie is the only copy that can affect first paint — `skipHydration:
 * true` means the blob is not readable then. The store copy exists so this row
 * can show a selection, and so a cleared cookie can be restored.
 *
 * Both are written together, and then `router.refresh()` re-renders the server
 * tree: `<html lang>`, the manual, the legal pages and the `<title>` all change
 * in one pass, without a reload.
 */

/** The one writer. `"auto"` is stored as the *absence* of a cookie (ADR 44). */
function writeLocaleCookie(preference: string) {
  const attributes = `path=${LOCALE_COOKIE_PATH}; samesite=lax`;
  document.cookie =
    preference === "auto"
      ? // Expiry in the past is the only way to delete a cookie, and the path
        // must match the one it was written with or the delete silently misses.
        `${LOCALE_COOKIE}=; ${attributes}; max-age=0`
      : `${LOCALE_COOKIE}=${preference}; ${attributes}; max-age=${LOCALE_COOKIE_MAX_AGE}`;
}

function readLocaleCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
}

export function LanguageRow() {
  const t = useTranslations("language");
  const router = useRouter();
  // The locale actually rendering, which is the cookie's answer — not the
  // store's. Used only to detect the two disagreeing.
  const activeLocale = useLocale();
  const stored = useGluStore((s) => s.locale);
  const setLocalePreference = useGluStore((s) => s.setLocalePreference);

  const preference = resolveLocalePreference(stored);

  /*
   * Reconciles a cleared cookie against a remembered choice.
   *
   * Clearing site data, a privacy extension, or simply the cookie expiring
   * after a year leaves the blob saying "German" and the server rendering
   * English. The blob is the longer-lived of the two, so it wins and rewrites
   * the cookie — then refreshes, because the page in front of the user is
   * currently in the wrong language.
   *
   * Deliberately one-directional: it never writes the *store* from the cookie.
   * A cookie without a blob is a first visit whose language came from
   * `Accept-Language`, and recording that as an explicit choice would freeze a
   * guess the user never made.
   */
  useEffect(() => {
    if (preference === "auto") return;
    if (readLocaleCookie() === preference) return;
    writeLocaleCookie(preference);
    if (activeLocale !== preference) router.refresh();
  }, [preference, activeLocale, router]);

  function choose(value: string | null) {
    if (value === null) return;
    setLocalePreference(value);
    writeLocaleCookie(value);
    router.refresh();
  }

  return (
    <div className={classes.field} data-testid="setting-language">
      <Text component="span" className={classes.fieldLabel} id="language-label">
        {t("label")}
      </Text>
      <Text component="span" className={classes.fieldDescription}>
        {t("description")}
      </Text>
      {/*
       * A `Select`, and the only settings row that is not a `SegmentedControl`
       * (ADR 44). Seven options do not fit one on a half-tablet, and a language
       * list is the one setting a user scans for their own entry rather than
       * comparing rungs on a ladder.
       *
       * `allowDeselect={false}`: there is no "no language".
       */}
      <Select
        className={classes.select}
        aria-labelledby="language-label"
        allowDeselect={false}
        checkIconPosition="right"
        comboboxProps={{ withinPortal: false }}
        value={preference}
        onChange={choose}
        data={[
          { value: "auto", label: t("automatic") },
          // Endonyms, never translated: someone who has landed in a language
          // they cannot read needs to recognise their own on sight.
          ...SUPPORTED_LOCALES.map((locale) => ({
            value: locale,
            label: LOCALE_ENDONYM[locale],
          })),
        ]}
      />
    </div>
  );
}
