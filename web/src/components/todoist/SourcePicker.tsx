"use client";

import { useEffect, useState } from "react";
import {
  Combobox,
  Modal,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import type { NamedItem, SourceType, TodoistSource } from "./types";
import classes from "./todoist.module.css";

const ENDPOINT: Record<SourceType, string> = {
  filter: "/todoist/filters",
  label: "/todoist/labels",
  project: "/todoist/projects",
};

function toSource(type: SourceType, picked: NamedItem): TodoistSource {
  return {
    type,
    id: picked.id,
    name: picked.name,
    // Filters carry their user-authored query; labels are queried by name;
    // projects by id.
    query: type === "filter" ? picked.query : type === "label" ? picked.name : undefined,
  };
}

/** The proxy list for the selected type, fetched while the picker is open. */
function useSourceItems(type: SourceType, open: boolean) {
  // Keyed by the type it was fetched for: reopening the picker on the same type
  // keeps its list on screen while it revalidates, but switching type never
  // shows the previous type's rows under the new heading.
  const [loaded, setLoaded] = useState<{ type: SourceType; items: NamedItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    void (async () => {
      // The state moves in the async continuation, never synchronously inside
      // the effect body — a synchronous setState here cascades renders.
      setLoading(true);
      setFailed(false);
      try {
        const body = await apiFetch<{ items: NamedItem[] }>(ENDPOINT[type], {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setLoaded({ type, items: body.items });
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, type]);

  return {
    items: loaded?.type === type ? loaded.items : [],
    loading,
    failed,
  };
}

/**
 * One popup, three source types, no navigation (ADR 12): a segmented control
 * over a searchable list fed by the proxy.
 *
 * Below `sm` the popover becomes a near-full-screen modal (ADR 12 amendment) —
 * the same responsive-furniture split ADR 13's detail already uses. A 280 px
 * dropdown holding a 220 px inner list is the wrong instrument on a half-tablet,
 * where the source list is the only thing worth showing.
 */
export function SourcePicker({
  source,
  onPick,
}: {
  source: TodoistSource | null;
  onPick: (source: TodoistSource) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [type, setType] = useState<SourceType>(source?.type ?? "project");
  const { items, loading, failed } = useSourceItems(type, opened);
  const fullScreen = useMediaQuery("(max-width: 48em)") ?? false;
  const t = useTranslations("todoist");
  const tError = useTranslations("errors");

  // The three kinds are words, not a stem plus a suffix (ADR 44): "Choose a
  // {type}" and `${type}s` only ever worked in English.
  const types = [
    { value: "filter", label: t("sourceFilter") },
    { value: "label", label: t("sourceLabel") },
    { value: "project", label: t("sourceProject") },
  ];
  const chooseLabel = {
    filter: t("chooseFilter"),
    label: t("chooseLabel"),
    project: t("chooseProject"),
  }[type];

  const pick = (picked: NamedItem) => {
    onPick(toSource(type, picked));
    setOpened(false);
  };

  const trigger = (
    <UnstyledButton
      className={classes.toolsButton}
      aria-label={t("chooseSource")}
      aria-expanded={opened}
      aria-haspopup={fullScreen ? "dialog" : undefined}
      onClick={() => setOpened((o) => !o)}
    >
      <IconAdjustmentsHorizontal size={20} />
    </UnstyledButton>
  );

  const segments = (
    <SegmentedControl
      fullWidth
      value={type}
      onChange={(value) => setType(value as SourceType)}
      data={types}
    />
  );

  if (fullScreen) {
    return (
      <>
        {trigger}
        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={t("sourceTitle")}
          centered
          transitionProps={{ duration: 0 }}
          closeButtonProps={{ "aria-label": t("closeSource") }}
          classNames={{
            content: classes.pickerModal,
            header: classes.pickerModalHeader,
            body: classes.pickerModalBody,
          }}
        >
          {segments}
          <SourceOptionList
            // A remount per type is the whole reset: a stale search query would
            // otherwise hide most of the list the user just switched to.
            key={type}
            type={type}
            items={items}
            loading={loading}
            failed={failed}
            selectedId={source?.type === type ? source.id : null}
            onPick={pick}
          />
          <Text size="xs" c="dimmed">
            {t("sourceHint")}
          </Text>
        </Modal>
      </>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withinPortal={false}
      transitionProps={{ duration: 0 }}
      shadow="md"
    >
      <Popover.Target>{trigger}</Popover.Target>

      <Popover.Dropdown className={classes.pickerDropdown}>
        <Stack gap="sm" role="group" aria-label={t("sourceTitle")}>
          {segments}
          <Select
            searchable
            // The Select's own dropdown must live *inside* the popover: portaled
            // out, clicking an option counts as an outside click and Mantine
            // closes the popover before `onChange` ever fires.
            comboboxProps={{ withinPortal: false }}
            aria-label={chooseLabel}
            placeholder={loading ? t("loading") : chooseLabel}
            nothingFoundMessage={failed ? tError("unreachable") : t("nothingHere")}
            data={items.map((item) => ({ value: item.id, label: item.name }))}
            value={source?.type === type ? source.id : null}
            onChange={(value) => {
              const picked = items.find((item) => item.id === value);
              if (picked) pick(picked);
            }}
          />
          <Text size="xs" c="dimmed">
            {t("sourceHint")}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * The mobile list: a search field over an always-open listbox that owns every
 * pixel the modal can spare. Exported for stories — it takes its rows as props
 * and does no fetching, the same split `TaskDetailBody` uses.
 */
export function SourceOptionList({
  type,
  items,
  loading,
  failed,
  selectedId,
  onPick,
}: {
  type: SourceType;
  items: NamedItem[];
  loading: boolean;
  failed: boolean;
  selectedId: string | null;
  onPick: (item: NamedItem) => void;
}) {
  // The list is on screen for as long as the modal is, so the store is opened
  // from the start: `dropdownOpened` is what makes ArrowDown/Enter walk the
  // options, even though nothing is portalled here.
  const combobox = useCombobox({ defaultOpened: true });
  const [search, setSearch] = useState("");
  const t = useTranslations("todoist");
  const tError = useTranslations("errors");

  const chooseLabel = {
    filter: t("chooseFilter"),
    label: t("chooseLabel"),
    project: t("chooseProject"),
  }[type];
  const listLabel = { filter: t("filters"), label: t("labels"), project: t("projects") }[type];

  const query = search.trim().toLowerCase();
  const shown = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(value) => {
        const picked = items.find((item) => item.id === value);
        if (picked) onPick(picked);
      }}
    >
      <Combobox.Search
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          combobox.resetSelectedOption();
        }}
        aria-label={chooseLabel}
        placeholder={loading ? t("loading") : chooseLabel}
        classNames={{ input: classes.pickerSearch }}
      />
      {/* An empty `listbox` is an axe violation (`aria-required-children`), so
          the empty case replaces the list rather than sitting inside it. */}
      {shown.length > 0 ? (
        <Combobox.Options className={classes.pickerOptions} aria-label={listLabel}>
          {shown.map((item) => (
            <Combobox.Option
              key={item.id}
              value={item.id}
              // Mantine's vocabulary: `active` is the value in use (and carries
              // `aria-selected`), while `data-combobox-selected` is where the
              // keyboard cursor happens to be.
              active={item.id === selectedId}
              aria-selected={item.id === selectedId}
              className={classes.pickerOption}
            >
              {item.name}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      ) : (
        <div className={classes.pickerEmpty} role="status">
          {failed ? tError("unreachable") : loading ? t("loading") : t("nothingHere")}
        </div>
      )}
    </Combobox>
  );
}
