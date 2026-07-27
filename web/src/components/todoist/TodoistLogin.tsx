"use client";

import { useTranslations } from "next-intl";
import { apiUrl } from "@/lib/api";
import { TodoistMark } from "./TodoistMark";
import classes from "./todoist.module.css";

/**
 * The one branded login control (ADR 11's brand treatment). The top-right area
 * and ADR 19's Settings section render **this component**, not a lookalike —
 * one brand treatment to maintain.
 *
 * OAuth is a redirect dance, not an XHR: a plain full-page navigation to a
 * *server* route, so `next/link` does not apply.
 */
export function TodoistLogin({ label }: { label?: string }) {
  const t = useTranslations("todoist");

  return (
    <a className={classes.loginButton} href={apiUrl("/auth/todoist/login")}>
      <TodoistMark size={20} />
      {label ?? t("logIn")}
    </a>
  );
}
