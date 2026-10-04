# Portfolio content foundation

## Purpose

This content system presents Tanay Patel as a high-school builder working where finance, systems, and design meet. The voice is direct, ambitious, and grounded in proof. It avoids startup language that would imply a company, traction, or authority the available evidence does not support.

`src/content/portfolio.ts` is the typed single source of truth. Its exported object is deeply read-only at the type level through `as const`, while `satisfies PortfolioContent` checks the complete schema without widening the copy into generic mutable strings.

## Hierarchy

1. **Identity and intro** establish Tanay, New Jersey, his current student-builder status, and the finance / systems / design intersection.
2. **Projects** lead with the completed Kean I.D.E.A. result, then clearly label the Wi-Fi heartbeat security system as work in progress.
3. **Evidence** supports the narrative with finance, academic, volleyball, and high-school JV proof. Sports remain supporting evidence rather than the hero story.
4. **Disciplines** explain the connective tissue between finance, systems, design, and team preparation without adding achievement claims.
5. **Contact** closes with the verified email and LinkedIn destination.

Navigation is constrained to the planned semantic section IDs: `top`, `work`, `proof`, and `contact`.

## Included claims

The copy includes only the following achievement and project claims:

- Tanay was the solo winner of the Kean I.D.E.A. eco-grocery competition.
- Tanay is working on a security system that uses AI to analyze Wi-Fi frequency changes and detect human heartbeats. It is explicitly described as ongoing, not finished or deployed.
- Tanay is a DECA Finance state qualifier.
- Tanay earned an AP Microeconomics score of 5.
- Tanay earned 92% in Honors Accounting.
- Tanay is a Princeton Volleyball Club 16U setter.
- Tanay is a high-school JV 128 lb starter.

Identity and contact facts used are Tanay Patel, high-school builder, New Jersey, `Tanay001@icloud.com`, and `https://www.linkedin.com/in/tanay-patel-1b2b2332b/`.

The `chapters`, `cars.title`, `cars.summary` and `ui` strings added in the 2026-09 redesign are narrative and interface copy only. They introduce no new facts; the two work statuses ("finished", "running") restate the existing `Completed` and `In progress` values. A phrase wrapped in `*asterisks*` is rendered in the serif italic by the `Emphasis` component; use at most one per statement.

## Deliberate exclusions

The content does not claim or imply:

- users, customers, revenue, funding, commercial traction, or a company;
- dates, rankings, award placements, or metrics beyond the verified score, grade, age group, and weight class;
- a shipped, deployed, validated, or production-ready Wi-Fi heartbeat system;
- a technology stack, model performance, detection accuracy, partners, or research outcomes;
- freelance clients, car-meet leadership, investment performance, or other claims present in older components but not verified for this brief;
- a GitHub profile or any project link, because no verified project URL was provided.

Optional `href` fields remain available in project and evidence entry types, but no entry supplies one without a known real destination.

## Copy rationale

The two project entries separate completed proof from current investigation. Each evidence item has a stable ID, category eyebrow, status, concise summary, and explicit proof line so the interface can distinguish context from the exact claim.

The copy uses first person for the authored voice and plain language for credibility. Short sentences and compact entries suit an editorial layout, while the strongest result appears first. Academic and team achievements validate range and discipline without turning the page into a résumé dump.
