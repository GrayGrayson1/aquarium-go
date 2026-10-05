# ADR-0007 — Owner approval: push the S0 work to a separate GitHub branch

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0\
**Requirements:** REL-001

## Context

The owner asked for the work to be pushed so a cloud model can reach it. The repository `GrayGrayson1/aquarium-go`
is public. A push to `main` deploys GitHub Pages (`.github/workflows/deploy.yml` runs on push to `main`), and
`render.yaml` sets `autoDeploy: true`. The S0 work is unverified, and ADR-0006 deferred making `docs/agent` public.

## Owner's words (verbatim)

Request: "push this to github so my cloud model can reach it"

Question: "How should I push? The repo is public, so any push makes docs/agent public (you'd deferred that), and a
push to main deploys the live site with unverified work."

Owner's answer (selected option): **"Push a separate branch (Recommended)"**, described as: "Push local main as a new
branch, e.g. agent/s0-wip. Doesn't touch main, so nothing deploys. The cloud model checks out that branch. docs/agent
becomes publicly visible."

## Decision

1. Push local `main` to the remote branch `agent/s0-wip` (one push, no force). `origin/main` is not touched, so
   nothing deploys.
2. Because the repo is public, `docs/agent` is public from this push. That settles ADR-0006 decision 2 for this
   content.
3. This approval covers this one push. Later pushes, including updates to `agent/s0-wip`, need the owner's yes again.

## Owner approval

The owner's request and selected answer above, given 2026-10-05 in the top-level session.

## Owner impact

Yes. The owner chose it.
