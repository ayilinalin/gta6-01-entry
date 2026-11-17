# NEON TIDE — Port Meridian Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**NEON TIDE** is an original open-world crime game set in the fictional harbor
city of **Port Meridian**. Built for the make.fun "Make GTA 6" bounty
([gta6-01](https://make.fun/bounty/gta6-01)). Pure 2D canvas, zero libraries,
zero network requests — every asset is procedural.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` statically).

- **WASD** move / drive, **Shift** run, **mouse** aim, **click** shoot
- **E** steal a car, **F** get out, **Enter** start / advance missions, **M** mute
- Steal cars, outrun the Port Meridian Police Department, climb wanted level
  0–5 (roadblocks at 4+), and run **4 story missions** for fixer Dara Solace:
  delivery → chase → escape → robbery. Cash and reputation are your score.
- HUD with minimap, wanted stars, health, cash, mission objective, speed and
  city clock. Procedural WebAudio sound (engine, sirens, gunshots, jingles).
  Progress auto-saves to localStorage; continue from the start screen.

## Structure

- `game/index.html` — the page
- `game/src/main.js` — fixed-step loop, camera, input, glue
- `game/src/city.js` — Port Meridian grid, harbor, downtown
- `game/src/player.js` — Kio Rendra on foot
- `game/src/vehicles.js` — stolen rides + traffic AI
- `game/src/pedestrians.js` — harbor-city locals
- `game/src/police.js` — wanted level, pursuit, roadblocks
- `game/src/missions.js` — the 4-mission story chain
- `game/src/combat.js` — bullets and hit feedback
- `game/src/hud.js` — HUD, minimap, menus
- `game/src/audio.js` — procedural WebAudio
- `game/src/save.js` — localStorage save
- `game/src/shots.js` — deterministic `?shot=1..4` screenshot scenarios
- `game/src/config.js`, `game/src/random.js` — tuning + seeded RNG
- `main.ts` — entrypoint: copies `game/` + `screenshots/` to the output
  directory and writes `dossier.json` via `vendor/makefun-game.ts`
- `screenshots/` — real renders of the game in a browser

## Verify

```sh
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
diff -r out1 out2   # must be identical
```

## License

MIT — see [LICENSE](LICENSE). All names, characters, story, art and sound are
original. No Rockstar Games content.
