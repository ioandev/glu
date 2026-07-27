import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "./LegalPage";
import { loadPrivacy } from "./content";

/**
 * The Privacy Policy route's body (ADR 26), in the reader's language (ADR 44).
 *
 * The prose itself lives in `content/privacy/<locale>.tsx`; this file only
 * chooses one and hands it to the shared shell. Non-English documents get the
 * convenience-translation notice — the English text is the one that applies,
 * and a reader deserves to be told which one they are looking at.
 */
export async function PrivacyContent() {
  const locale = await getLocale();
  const [content, t] = await Promise.all([loadPrivacy(locale), getTranslations("document")]);

  return (
    <LegalPage
      title={content.title}
      updated={content.updated}
      intro={content.intro}
      sections={content.sections}
      notice={locale === "en" ? undefined : t("translationNotice")}
    />
  );
}
