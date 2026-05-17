# MMA Career Docs

This folder keeps the working product plan and technical plan for the career game.

## Documents

- [Roadmap](./ROADMAP.md): full product roadmap, milestones, and feature backlog.
- [Architecture](./ARCHITECTURE.md): current structure, target boundaries, and data flow.
- [Refactor Plan](./REFACTOR-PLAN.md): exact migration order, module targets, and delivery slices.
- [Career Systems](./CAREER-SYSTEMS.md): contracts, rankings, rivalries, event design, and progression loops.
- [Fight System](./FIGHT-SYSTEM.md): simulation, live-fight presentation, AI behavior, and replay goals.

## Current Direction

The current game already has the right backbone for a deeper version:

- persistent career state
- scene-driven flow
- separated state mutations and selectors
- a dedicated fight domain for results and live-fight payloads
- an isolated fight presentation engine under `public/fight-engine/`

The next version should push depth in three places:

- stronger career progression and scheduling pressure
- cleaner domain boundaries and smaller modules
- better fight presentation and AI readability
