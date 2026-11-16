# Syncing the match video to the ball-by-ball data

How `data/matches/<id>/video_sync.json` was made. Run by hand once per match; not part of CI.

1. A small local page embeds the video with the YouTube IFrame API (the player refuses
   embeds without a host page).
2. `sample.mjs` seeks the player every 30 seconds, takes a screenshot of only the bottom
   scoreboard strip, reads it with `ocr` (macOS Vision, built from `ocr.swift` with
   `swiftc -O ocr.swift -o ocr`), records the text and **deletes the image**. No frames are kept.
3. `bisect.mjs` narrows each change of ball to about two seconds by reading the midpoint
   between two readings, first for every ball, then with `--targets` for the call-back
   and moment balls.
4. The parsed readings (video time and what the scoreboard said) are saved as
   `data/matches/<id>/scoreboard_readings.json`, the evidence.
5. `python -m src.video_sync <readings>` matches each reading to a ball (innings, wickets
   and legal balls exact; score within 4 runs, because the stream's scorer sometimes misses
   a wide or leg-bye that Cricsheet records), takes the first time each ball is shown,
   spreads the unpinned balls evenly, and subtracts the measured scoreboard delay.
6. `make export` then uses those times for every ball.

Viewing only: the video is never downloaded, and the scripts keep no image of it.
