"use client";
import { useMatchView } from "./MatchProvider";
import { TabBar } from "./TabBar";

/** What sits over every match screen: the tab bar with the missed count. */
export function MatchChrome() {
  const view = useMatchView();
  return <TabBar missed={view.missed.length} />;
}
