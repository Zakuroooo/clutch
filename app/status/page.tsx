import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { z } from "zod";
import { AppBar } from "@/components/AppBar";

const StatusSchema = z.object({
  updated: z.string(),
  built: z.array(z.object({ name: z.string(), date: z.string() })),
  next: z.array(z.object({ name: z.string(), note: z.string() })),
});

async function getStatus() {
  "use cache";
  const raw = await readFile(path.join(process.cwd(), "data", "status.json"), "utf8");
  return StatusSchema.parse(JSON.parse(raw));
}

const day = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** What is built and what is being built, kept current as work lands. */
export default async function StatusPage() {
  const status = await getStatus();
  return (
    <main className="screen">
      <AppBar />
      <div className="wrap stack status">
        <h1 className="page-title">What&apos;s built</h1>
        <p className="muted">
          Clutch keeps improving. This page is updated with every release; last update{" "}
          {day(status.updated)}.
        </p>
        <section className="card pad">
          <h2 className="card-title">Built and live</h2>
          <ul className="status-list">
            {status.built.map((b) => (
              <li key={b.name}>
                <span className="status-dot built" aria-hidden="true" />
                <span className="grow">{b.name}</span>
                <span className="small muted num">{day(b.date)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pad">
          <h2 className="card-title">Building next</h2>
          <ul className="status-list">
            {status.next.map((n) => (
              <li key={n.name}>
                <span className="status-dot next" aria-hidden="true" />
                <span className="grow">
                  {n.name}
                  <span className="small muted" style={{ display: "block" }}>
                    {n.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <Link href="/" className="btn ghost wide">
          Back to Clutch
        </Link>
      </div>
    </main>
  );
}
