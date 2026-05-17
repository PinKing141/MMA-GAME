# Full Roadmap

## Product Goal

Build a replayable MMA career game where the player makes meaningful decisions about identity, camp, matchmaking, contracts, rankings, finances, and risk. Every season should create a different story even if the core loop stays readable.

## Core Pillars

- Career pressure: money, reputation, wear-and-tear, and timing should force tradeoffs.
- Identity fantasy: the fighter should feel distinct in style, strengths, weaknesses, and public image.
- Event drama: booking, rivalry, rankings, and titles should make fights matter beyond the result screen.
- Readable simulation: fights should be easy to follow live while still feeling varied.
- Long-term replayability: every run should branch through different offers, camps, injuries, and story arcs.

## Milestone 1: Solid Vertical Slice

Goal: make the current loop durable and polished.

- Finish the refactor of state, actions, selectors, and fight-domain boundaries.
- Keep save/load stable across scene changes and future state migrations.
- Clean all remaining placeholder text, AI naming issues, and inconsistent labels.
- Improve fight-night readability with smooth live-fight playback and stronger visual feedback.
- Add docs, roadmap, and architecture notes inside the repo.

## Milestone 2: Career Foundation

Goal: make the player care about each booking.

- Contracts with show money, win bonus, term length, renegotiation windows, and release risk.
- Event booking with card tier, venue tier, opponent quality, and short-notice opportunities.
- Rankings that react to streaks, strength of schedule, layoffs, and finish quality.
- Lightweight title ladder with contender positioning and champion logic.
- Fight history with card metadata, method, rank impact, and camp context.

## Milestone 3: Team And Camp Depth

Goal: make preparation feel strategic instead of linear.

- Coaches with specialties, chemistry, cost, and progression.
- Sparring partners and camp facilities that influence focused growth.
- Injury risk, overtraining, recovery windows, and compromised camps.
- Weight-cut management with energy and durability tradeoffs.
- Training plans that balance short-term fight prep against long-term development.

## Milestone 4: Social Layer

Goal: add story generation between fights.

- Rivalries driven by close losses, trash talk, rematches, and title collisions.
- Public hype, fan perception, and media narratives.
- Callouts and post-fight callout choices.
- Gym reputation and regional identity.
- News feed for signings, title changes, upset alerts, and injury replacements.

## Milestone 5: League Ecosystem

Goal: make the world feel alive beyond the player.

- Simulated events that move rankings even when the player is inactive.
- Champions, contenders, prospects, veterans, and gatekeepers with simple lifecycle logic.
- Promotion prestige, regional circuits, and step-up paths.
- Late-notice bookings and replacement fights.
- End-of-year summaries, awards, and division snapshots.

## Milestone 6: Finance And Management

Goal: add pressure outside the cage.

- Purse structure, camp cost, coach salaries, medical bills, and bonuses.
- Lifestyle spending with upside and downside.
- Sponsorships tied to hype, wins, and personality.
- Negotiation leverage based on ranking, streaks, and marketability.
- Career retirement or decline scenarios.

## Milestone 7: Fight Presentation Upgrade

Goal: make fight night feel like a broadcast, not a widget.

- Better fighter movement logic by range, pressure, and ring-cutting.
- Clinch and grappling visuals that communicate positional control.
- Cleaner commentary cadence tied to real time instead of only major beats.
- Corner advice between rounds with tactical notes.
- More venue identities, crowd feel, and card-tier presentation packages.

## Milestone 8: Post-1.0 Depth

Goal: extend the sandbox once the core loop is stable.

- Multiple promotions or league switching.
- Career legacy tracking and hall-of-fame style evaluation.
- Dynamic rule-set options for future modes.
- Female divisions and broader roster variety.
- Historical scenarios, challenge modes, or custom universes.

## Feature Backlog By System

### Career

- Contract clauses
- Re-sign logic
- late replacement offers
- retirement decisions
- activity expectations

### Rankings

- form-based movement
- strength-of-opposition weighting
- title eliminator logic
- inactivity penalties
- champion protection rules

### Rivalries

- grudge meter
- promo choices
- press conference events
- revenge bonuses
- rivalry-specific headlines

### Events

- undercard to main event climb
- main-card placement
- hometown cards
- title cards
- short-notice cards

### Team

- coach personalities
- team morale
- injury treatment choices
- specialist camp hires
- gym upgrades

### Fight Engine

- stance-aware movement
- cage-cutting and circling
- range control
- urgency when behind on cards
- more readable knockdown and submission phases

## Delivery Priority

1. Career systems that give each fight stronger consequences.
2. Refactor steps that keep new systems easy to add.
3. Presentation upgrades that make the added depth visible.
