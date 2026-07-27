import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "./LegalPage";
import { loadTerms } from "./content";

/** The Terms route's body (ADR 26), in the reader's language (ADR 44). */
export async function TermsContent() {
  const locale = await getLocale();
  const [content, t] = await Promise.all([loadTerms(locale), getTranslations("document")]);

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
