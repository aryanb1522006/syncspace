# W1 — Selecting a project with measurable time-to-value

**Date:** 2026-08-09  
**Owner:** Aryan Bansal  
**Area:** problem framing and project-selection criteria

## Task

Reduce the broad idea of a campus collaboration platform into a semester-scale engineering project with a demonstrable increment and objective evaluation.

## Context

The initial idea mixed project discovery, team matching, contact exchange, task tracking, chat, administration, and multi-college scaling. Treating all of these as equal first-release requirements would delay usable feedback and make the result hard to evaluate. The official selection criteria place time-to-value first and require a usable increment inside a two-week sprint.

## Observation

The smallest valuable closed loop is not a recommendation dashboard alone. A student must be able to authenticate, describe their skills, inspect an explained project match, apply, receive an owner decision, and reach a team workspace. Without the owner decision and workspace handoff, the project would only display information and would not resolve the coordination gap.

## Decision and implementation

I defined the critical vertical slice as:

```text
verified identity -> profile -> discover/publish -> apply
                  -> owner decision -> accepted workspace
```

I kept matching deterministic rather than proposing research-grade prediction. The score uses visible skill, interest, availability, and commitment components. Chat, payments, public social features, and generalized multi-tenant administration were moved outside the evaluated core.

## Validation

The existing repository contains route, controller, service, model, migration, UI, and test evidence for every step of the chosen slice. It also has a live client, API readiness endpoint, PostgreSQL persistence, and object storage. This makes a two-week demonstration and weekly increments feasible using available engines.

## Next step

Form the required two/three-person team, practise the elevator pitch, and map the repository to the official deliverable structure without breaking the deployment layout.
