"use client";
import { DemoGuide } from "./DemoGuide";
import { ExplanationCard } from "./ExplanationCard";
import { useMatch, useMatchView } from "./MatchProvider";
import { TabBar } from "./TabBar";

/** What sits over every match screen: the tab bar, an open card, and the demo guide. */
export function MatchChrome() {
  const { openId, open, store } = useMatch();
  const view = useMatchView();
  const close = () => {
    if (openId) store.markSeen([openId]);
    open(null);
  };
  return (
    <>
      <TabBar missed={view.missed.length} />
      {openId ? <ExplanationCard key={openId} momentId={openId} onClose={close} /> : null}
      <DemoGuide />
    </>
  );
}
