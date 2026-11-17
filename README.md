# NEON TIDE

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime story in **Port Meridian** — a sun-baked harbor city you
can explore on foot and by stolen car. Built for the
[make.fun "Make GTA 6" bounty (gta6-01)](https://make.fun/bounty/gta6-01).
Original game: no Rockstar content, all art and sound generated in code.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` statically).
No network, no libraries, no build step — plain canvas + ES modules.

- **WASD** — move on foot / drive
- **Mouse** — aim, **click** — shoot
- **E** — steal a nearby car (the PMPD notices), **F** — get out
- **M** — mute, **R** — play again after an ending

## What is in the city

- **Open world**: downtown, Marina Bay, Old Docks harbor and Southside, all
  drivable and walkable, with traffic AI and pedestrians on the sidewalks.
- **Wanted level 0–5**: stealing, hitting pedestrians and shooting raise your
  heat. PMPD cruisers chase and ram you; at wanted 4+ they set roadblocks.
- **4 story missions** for fixer Dara Solace: a delivery, a courier takedown,
  losing the heat, and the Tide Mart job — with cash and reputation rewards.
- **Combat** on foot with mouse aim, **HUD** with wanted stars, health,
  money, mission objective, speed, clock, and a live **minimap**.
- **Start screen + autosave** (localStorage, continue where you left off),
  **procedural WebAudio** sound: engine hum, sirens, gunshots, jingles.

## Structure

| File | Job |
| --- | --- |
| `game/index.html` | Canvas shell, loads the game |
| `game/src/main.js` | Game loop, camera, input, state flow |
| `game/src/city.js` | Road grid, buildings, harbor, landmarks |
| `game/src/player.js` | On-foot movement and aiming |
| `game/src/vehicles.js` | Stolen cars, traffic AI, driving physics |
| `game/src/pedestrians.js` | Sidewalk walkers that flee danger |
| `game/src/police.js` | Wanted level, pursuit, roadblocks |
| `game/src/missions.js` | 4-mission chain and story text |
| `game/src/combat.js` | Shooting, bullets, hit feedback |
| `game/src/hud.js` | HUD, minimap, start and end screens |
| `game/src/audio.js` | Procedural WebAudio sounds |
| `game/src/save.js` | localStorage save slot |
| `game/src/shots.js` | Deterministic `?shot=` scenes for screenshots |
| `game/src/config.js` | Tuning and palette |
| `game/src/random.js` | Seeded RNG and math helpers |
| `main.ts` | Copies `game/` + `screenshots/` to the output dir and writes `dossier.json` |
| `vendor/makefun-game.ts` | make.fun dossier library, copied from the kit |

## Build (reproduce the entry)

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/game, out/screenshots, out/dossier.json
```

Run it twice — both runs write byte-identical output.

## License

MIT — see [LICENSE](LICENSE).
