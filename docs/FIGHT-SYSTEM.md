# Fight System Plan

## Goal

Keep the fight engine readable, dramatic, and compatible with the career sim while making it feel more alive.

## Current Direction

- fight outcome and live-fight timeline come from `src/lib/fight-domain/`
- the iframe engine under `public/fight-engine/` only presents the payload
- the live fight uses ticker commentary, micro-feeds, callouts, and speed controls

## Presentation Rules

- The clock should feel continuous.
- Fighters should stay inside the octagon.
- Fighters should move with clear pressure and range changes.
- Major moments should be readable without hiding the rest of the action.
- The UI should not require a reset button.

## Movement Goals

### Short Term

- keep fighters closer together
- move around the center of the cage instead of living on opposite rails
- face each other consistently
- avoid motion outside the visual cage bounds

### Medium Term

- different movement profiles for pressure fighters, outfighters, and wrestlers
- cage-cutting behavior when one fighter retreats
- separate motion states for striking range, pocket range, clinch range, and scramble range
- knockdown recovery paths and follow-up rushes

## Commentary Goals

- live ticker should update regularly, not only on dramatic events
- corner feeds should reflect momentum and tactical state
- callouts should be reserved for the most readable moments
- between-round messages should highlight score and damage trends

## AI Behavior Targets

- urgency when trailing on cards
- risk-taking after being hurt
- more grappling pressure for strong wrestlers and submission specialists
- more range management for technical strikers
- fatigue-aware pacing in later rounds

## Simulation Contract

The fight-domain payload should provide:

- initial fighter state
- time-stamped timeline events
- per-event fighter states
- scorecards
- outcome metadata
- venue and presentation metadata

The fight engine should provide:

- playback controls
- interpolation between replay states
- visually bounded movement
- readable overlays and commentary
- no mutation of career state

## Next Fight-Engine Improvements

1. Add explicit range states to the replay payload.
2. Add clinch and ground visual states.
3. Add round-corner tactical notes.
4. Improve fighter silhouettes or tokens for stronger visual identity.
5. Add crowd, lighting, and broadcast packages by venue tier.
