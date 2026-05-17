# Refactor Plan

## Goal

Finish the transition from scene-heavy logic to a cleaner state/actions/selectors/domain shape without slowing feature delivery.

## Principles

- Refactor only where it unlocks real features.
- Move one slice at a time.
- Validate each slice with `npm run build` and a narrow browser check.
- Do not duplicate logic across selectors, scenes, and domains.

## Migration Order

### Phase 1: Stabilize Core Boundaries

- Keep `fighter-state.js` as the single source of truth for career state.
- Keep persistence and hydration aligned with the canonical state shape.
- Continue routing scene progression through actions instead of scene-local state changes.
- Add explicit save versioning once more systems land.

### Phase 2: Split Selectors By Domain

Target modules:

- `src/lib/selectors/career-selectors.js`
- `src/lib/selectors/fight-selectors.js`
- `src/lib/selectors/profile-selectors.js`
- `src/lib/selectors/event-selectors.js`

Migration order:

1. Copy existing logic into domain-focused selector files.
2. Re-export through `src/lib/selectors.js` as a compatibility layer.
3. Update imports incrementally.
4. Remove the compatibility layer once imports are clean.

### Phase 3: Split Actions By Business Area

Target modules:

- `contract-actions.js`
- `event-actions.js`
- `ranking-actions.js`
- `camp-actions.js`
- `finance-actions.js`

Migration order:

1. Extract contract and event booking first.
2. Extract ranking updates next.
3. Extract finance and team management after the new systems exist.

### Phase 4: Expand Domain Modules

Target domains:

- `contract-domain/`
- `ranking-domain/`
- `event-domain/`
- `camp-domain/`
- `finance-domain/`

Migration order:

1. Move ranking formulas out of actions.
2. Move contract offer generation into a contract domain.
3. Move event booking and venue logic into an event domain.
4. Keep fight-domain as the model for how domain modules should behave.

### Phase 5: Scene Cleanup

- Reduce scene files to rendering and button wiring.
- Remove any direct game-rule calculations left in scenes.
- Create small scene helpers when markup sections become noisy.

### Phase 6: Save Migration Support

- Add `saveVersion` to persisted state.
- Add migration functions for any breaking state changes.
- Add migration tests or scripted validation for old saves.

## Exact Module Targets

### Contracts

- Offer generation
- negotiation inputs
- purse calculation
- promotion tier rules
- release and re-sign logic

### Rankings

- division standings
- streak adjustments
- title-shot eligibility
- inactivity penalties
- quality-win weighting

### Events

- card assembly
- venue tier assignment
- fight placement on card
- short-notice replacements
- event history summaries

### Camp

- training plan resolution
- injury and fatigue updates
- coach chemistry
- sharpness and fitness curves
- weight cut outcomes

### Finance

- purse payouts
- camp cost
- sponsorship flow
- lifestyle spend
- debt or emergency penalties

## Safe Delivery Slices

1. Contract generation plus contract selectors.
2. Rankings plus title-shot logic.
3. Event booking plus card-tier presentation.
4. Camp and injury depth.
5. Finance and sponsorship pressure.

## Definition Of Done For The Refactor

- Scenes no longer own core rules.
- Fight results and live-fight playback share one payload source.
- Save/load survives new systems without breaking prior careers.
- New gameplay features can be added by touching one action layer and one domain layer instead of many scenes.
