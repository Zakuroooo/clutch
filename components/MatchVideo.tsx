"use client";
/**
 * The match video, played in YouTube's own player with its own controls. Nothing is drawn
 * over it. It starts only on a tap. While it plays and the tab is visible it leads the
 * match clock; if it cannot play, the replay carries on with its clock on the same timeline.
 */
import { useEffect, useRef, useState } from "react";
import type { VideoInfo } from "@/lib/adapters/cricket/load";
import type { VideoLink } from "@/lib/client/matchStore";
import { IconPlay } from "./Icons";
import { useMatch } from "./MatchProvider";

type YTPlayer = {
  getCurrentTime(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  setPlaybackRate(r: number): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let api: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!api) {
    api = new Promise((resolve, reject) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (w.YT) resolve(w.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("YouTube player did not load"));
      document.head.appendChild(tag);
    });
  }
  return api;
}

const READY_TIMEOUT_MS = 12_000;
const PLAYING = 1;

export function MatchVideo({ video }: { video: VideoInfo }) {
  const { store } = useMatch();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "loading" && state !== "ready") return;
    let player: YTPlayer | null = null;
    let link: VideoLink | null = null;
    let ready = false;
    let mount: HTMLElement | null = null;
    let gone = false;
    const timer = setTimeout(() => !ready && !gone && setState("failed"), READY_TIMEOUT_MS);
    loadApi()
      .then((YT) => {
        if (gone || !holder.current) return;
        const start = Math.max(0, Math.floor(store.clockMs() / 1000));
        // YouTube replaces the element it is given with its iframe. Give it a fresh child,
        // so React's own element survives and the player can be built again on return.
        mount = document.createElement("div");
        holder.current.replaceChildren(mount);
        player = new YT.Player(mount, {
          videoId: video.youtube_id,
          width: "100%",
          height: "100%",
          playerVars: {
            start,
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (gone || !player) return;
              ready = true;
              const p = player;
              p.seekTo(store.clockMs() / 1000, true);
              p.playVideo();
              link = {
                read: () => {
                  try {
                    return {
                      ms: p.getCurrentTime() * 1000,
                      playing: p.getPlayerState() === PLAYING,
                      rate: p.getPlaybackRate() || 1,
                    };
                  } catch {
                    return null;
                  }
                },
                seek: (ms) => p.seekTo(Math.max(0, ms / 1000), true),
                setRate: (r) => p.setPlaybackRate(Math.min(2, r)),
              };
              store.attachVideo(link);
              setState("ready");
            },
            onError: () => !gone && setState("failed"),
          },
        });
      })
      .catch(() => !gone && setState("failed"));
    return () => {
      gone = true;
      clearTimeout(timer);
      if (link) store.detachVideo(link);
      try {
        player?.destroy();
      } catch {
        // already gone
      }
      mount?.remove();
    };
    // The player is created once per start; later state changes must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === "idle" || state === "failed", video.youtube_id, store]);

  return (
    <section className="match-video" aria-label="Match video">
      <div className="video-frame">
        {state === "idle" ? (
          <button
            type="button"
            className="video-start"
            onClick={() => setState("loading")}
            data-testid="video-start"
          >
            <span className="video-poster" aria-hidden="true" />
            <span className="video-start-label">
              <IconPlay />
              Watch the match video
            </span>
          </button>
        ) : state === "failed" ? (
          <div className="video-failed" role="status">
            <b>The video can&apos;t play here.</b>
            <span className="small muted">
              The replay carries on with its own clock, ball for ball.
            </span>
          </div>
        ) : (
          <div ref={holder} className="video-player" />
        )}
      </div>
      <p className="video-credit">
        Video:{" "}
        <a href={video.channel_url} target="_blank" rel="noreferrer">
          {video.channel}
        </a>{" "}
        on YouTube. Every ball here follows it.{state === "ready" ? " Sound starts off." : ""}
      </p>
    </section>
  );
}
