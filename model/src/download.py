"""Fetch the Cricsheet zips into model/data/raw (not committed) and unpack them."""

from __future__ import annotations

import datetime as dt
import urllib.request
import zipfile

from .common import ARTIFACTS, RAW, SOURCES, write_json


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    report = {"downloaded_on": dt.date.today().isoformat(), "files": {}}
    for name, url in SOURCES.items():
        target = RAW / name
        if not target.exists():
            print(f"downloading {url}")
            req = urllib.request.Request(url, headers={"User-Agent": "clutch-pipeline"})
            with urllib.request.urlopen(req) as res, open(target, "wb") as out:
                while chunk := res.read(1 << 20):
                    out.write(chunk)
        folder = RAW / name.removesuffix(".zip")
        folder.mkdir(exist_ok=True)
        with zipfile.ZipFile(target) as z:
            members = [m for m in z.namelist() if m.endswith(".json")]
            z.extractall(folder, members)
        report["files"][name] = {"url": url, "matches_in_file": len(members)}
        print(f"{name}: {len(members)} matches")
    write_json(ARTIFACTS / "download.json", report)


if __name__ == "__main__":
    main()
