"use client";

import { useEffect, useState } from "react";
import { Popover, SegmentedControl, Select, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api";
import type { NamedItem, SourceType, TodoistSource } from "./types";
import classes from "./todoist.module.css";

const ENDPOINT: Record<SourceType, string> = {
  filter: "/todoist/filters",
  label: "/todoist/labels",
  project: "/todoist/projects",
};

/**
 * One popup, three source types, no navigation (ADR 12): a segmented control
 * over a searchable select fed by the proxy.
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
  const [items, setItems] = useState<NamedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!opened) return;
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
        if (!controller.signal.aborted) setItems(body.items);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [opened, type]);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withinPortal={false}
      transitionProps={{ duration: 0 }}
      shadow="md"
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.toolsButton}
          aria-label="Choose task source"
          aria-expanded={opened}
          onClick={() => setOpened((o) => !o)}
        >
          <IconAdjustmentsHorizontal size={20} />
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown className={classes.pickerDropdown}>
        <Stack gap="sm" role="group" aria-label="Task source">
          <SegmentedControl
            fullWidth
            value={type}
            onChange={(value) => setType(value as SourceType)}
            data={[
              { value: "filter", label: "Filter" },
              { value: "label", label: "Label" },
              { value: "project", label: "Project" },
            ]}
          />
          <Select
            searchable
            // The Select's own dropdown must live *inside* the popover: portaled
            // out, clicking an option counts as an outside click and Mantine
            // closes the popover before `onChange` ever fires.
            comboboxProps={{ withinPortal: false }}
            aria-label={`Choose a ${type}`}
            placeholder={loading ? "Loading…" : `Choose a ${type}`}
            nothingFoundMessage={failed ? "Could not reach Todoist." : "Nothing here."}
            data={items.map((item) => ({ value: item.id, label: item.name }))}
            value={source?.type === type ? source.id : null}
            onChange={(value) => {
              const picked = items.find((item) => item.id === value);
              if (!picked) return;
              onPick({
                type,
                id: picked.id,
                name: picked.name,
                // Filters carry their user-authored query; labels are queried
                // by name; projects by id.
                query: type === "filter" ? picked.query : type === "label" ? picked.name : undefined,
              });
              setOpened(false);
            }}
          />
          <Text size="xs" c="dimmed">
            Sections of a project show one after another, in Todoist&rsquo;s order.
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
