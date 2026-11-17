/**
 * Player photos for the replay match, from Wikimedia Commons only, and only when the file's
 * licence is free (public domain, CC0, CC BY, CC BY-SA). Each photo keeps its author and
 * licence for the credit line. A player with no free photo keeps the drawn jersey.
 *
 *   node scripts/fetch-photos.mjs
 *
 * Writes public/players/<id>.jpg and data/matches/<id>/people.json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Cricsheet's short names to the player's Wikipedia article.
const WIKI = {
  "SV Samson": "Sanju Samson",
  "Abhishek Sharma": "Abhishek Sharma (cricketer)",
  "Ishan Kishan": "Ishan Kishan",
  "S Dube": "Shivam Dube",
  "SA Yadav": "Suryakumar Yadav",
  "HH Pandya": "Hardik Pandya",
  "Tilak Varma": "Tilak Varma",
  "AR Patel": "Axar Patel",
  "CV Varun": "Varun Chakravarthy",
  "Arshdeep Singh": "Arshdeep Singh",
  "JJ Bumrah": "Jasprit Bumrah",
  "PD Salt": "Phil Salt",
  "JC Buttler": "Jos Buttler",
  "HC Brook": "Harry Brook",
  "JG Bethell": "Jacob Bethell",
  "T Banton": "Tom Banton",
  "WG Jacks": "Will Jacks",
  "SM Curran": "Sam Curran",
  "J Overton": "Jamie Overton",
  "JC Archer": "Jofra Archer",
  "LA Dawson": "Liam Dawson",
  "AU Rashid": "Adil Rashid",
};

const FREE = /^(cc0|public domain|pd|cc by(-sa)? [\d.]+|godl-india)/i;
const UA = { "User-Agent": "ClutchReplay/0.1 (student project; photo credits kept)" };
const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function api(host, params) {
  const url =
    `https://${host}/w/api.php?` +
    new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let k = 0; k < 5; k++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 5000 * (k + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${host} ${res.status}`);
    return res.json();
  }
  throw new Error(`${host} kept answering 429`);
}

async function main() {
  const replay = JSON.parse(await readFile("data/replay.json", "utf8"));
  const dir = path.join("data", "matches", replay.match_id);
  const players = JSON.parse(await readFile(path.join(dir, "players.json"), "utf8"));
  await mkdir(path.join("public", "players"), { recursive: true });
  const people = {};
  for (const name of Object.keys(players)) {
    const title = WIKI[name];
    const entry = { full_name: title ? title.replace(/ \(.*\)$/, "") : name, photo: null };
    people[name] = entry;
    if (!title) continue;
    const page = await api("en.wikipedia.org", {
      action: "query",
      prop: "pageimages",
      piprop: "name",
      titles: title,
      redirects: "1",
    });
    const file = page.query?.pages?.[0]?.pageimage;
    if (!file) {
      console.log(`${name}: no lead image`);
      continue;
    }
    const info = await api("commons.wikimedia.org", {
      action: "query", prop: "imageinfo", titles: `File:${file}`,
      iiprop: "url|extmetadata", iiurlwidth: "360",
    }); // prettier-ignore
    const ii = info.query?.pages?.[0]?.imageinfo?.[0];
    const meta = ii?.extmetadata ?? {};
    const licence = strip(meta.LicenseShortName?.value);
    if (!ii || !FREE.test(licence)) {
      console.log(`${name}: ${file} not on Commons or not free (${licence || "unknown"})`);
      continue;
    }
    const img = await fetch(ii.thumburl, { headers: UA });
    if (!img.ok) continue;
    const out = `/players/${players[name].id}.jpg`;
    await writeFile(path.join("public", out), Buffer.from(await img.arrayBuffer()));
    entry.photo = {
      src: out,
      author: strip(meta.Artist?.value) || "unknown",
      licence,
      page: ii.descriptionurl,
    };
    console.log(`${name}: ${licence}, ${entry.photo.author}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  await writeFile(path.join(dir, "people.json"), JSON.stringify(people, null, 1) + "\n");
  const n = Object.values(people).filter((p) => p.photo).length;
  console.log(`${n} of ${Object.keys(people).length} players have a free photo`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
