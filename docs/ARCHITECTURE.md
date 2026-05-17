# Architecture Plan

## Design Goal

Keep the game simple to extend without overengineering it. The codebase should stay plain JavaScript and scene-driven, but domain logic should move away from scene files and into clear modules.

## Current Shape

- `src/main.js` wires the app and DOM events.
- `src/scenes/` renders scene-specific markup and updates.
- `src/lib/state/fighter-state.js` holds authoritative mutable state.
- `src/lib/actions/` performs state mutations and career actions.
- `src/lib/selectors/` shapes UI-facing view models, split by domain.
- `src/lib/fight-domain/` resolves fight outcomes and live-fight payloads.
- `public/fight-engine/` is an isolated fight presentation app inside the modal iframe.

## Target Shape

### App Shell

Purpose: own boot, routing, persistence lifecycle, and high-level event wiring.

Key files:

- `src/main.js`
- `src/lib/scene-controller.js`
- `src/lib/navigation.js`
- `src/lib/persistence.js`

### State Layer

Purpose: define canonical state shape, migrations, reset behavior, and hydration.

Key files:

- `src/lib/state/fighter-state.js`
- `src/lib/state/migrations.js`
- `src/lib/state/schema-version.js`

Rules:

- State shape changes should be centralized.
- Save migrations should be explicit.
- No scene should directly invent canonical state structure.

### Action Layer

Purpose: perform mutations and business operations.

Current direction:

- `src/lib/actions/career-actions.js`
- `src/lib/actions/contract-actions.js`
- `src/lib/actions/event-actions.js`
- `src/lib/actions/fight-state.js`

Desired additions:

- `ranking-actions.js`
- `camp-actions.js` (deferred — pending camp/style system redesign)
- `finance-actions.js`

Rules:

- Actions mutate state and return success or failure information.
- Actions may call domain modules but should not shape detailed UI text unless necessary.
- Scenes should call actions, not mutate state directly.

### Selector Layer

Purpose: derive view models and display-friendly summaries.

Current direction:

- `src/lib/selectors/career-selectors.js`
- `src/lib/selectors/event-selectors.js`
- `src/lib/selectors/fight-selectors.js`
- `src/lib/selectors/profile-selectors.js`

Desired additions:

- `contract-selectors.js`
- `ranking-selectors.js`

Rules:

- Selectors read state only.
- Derived display text belongs here unless it is domain-critical.
- Selectors should be cheap and deterministic.

### Domain Layer

Purpose: own rules and calculations for career simulation.

Main target domains:

- `fight-domain/`
- `ranking-domain/`
- future `career-domain/`
- future `contract-domain/`
- future `event-domain/`

Rules:

- Domain modules should accept plain objects and return plain objects.
- Domain code should be UI-agnostic.
- Shared formulas and policy logic should live here instead of scenes.

### UI Scene Layer

Purpose: render scene-specific UI and bind scene-local interactions.

Rules:

- Scenes consume selectors and call actions.
- Scenes should not compute rankings, contracts, or fight outcomes.
- Scenes may format micro-copy, but not own core simulation rules.

### Fight Presentation Layer

Purpose: show the live fight in a visually isolated surface.

Key files:

- `src/lib/fight-engine-bridge.js`
- `public/fight-engine/index.html`
- `public/fight-engine/app.js`
- `public/fight-engine/styles.css`

Rules:

- The iframe should consume replay payloads only.
- The app should not duplicate fight visual logic outside the engine.
- The fight-domain payload is the single source of truth for both results and playback.

## Data Flow

1. Scene asks an action to do work.
2. Action updates state and calls domain modules when rules are needed.
3. State is persisted.
4. Selectors derive the next scene view model.
5. Scene renders the derived model.
6. If a fight happens, fight-domain returns both outcome data and live-fight payload.
7. Fight-engine bridge loads that payload into the iframe.

## Boundary Rules

- Scenes render.
- Actions mutate.
- Selectors derive.
- Domains calculate.
- Persistence saves and loads.
- Fight engine presents.

## Architecture Priorities

1. Keep the save shape stable and versioned.
2. Continue moving rule logic out of scene files.
3. Split selectors by domain once file size or coupling grows.
4. Keep fight logic centralized in `fight-domain/`.
5. Avoid introducing a framework-scale abstraction unless complexity truly demands it.
