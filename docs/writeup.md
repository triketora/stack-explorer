# Stack Explorer — Approach, Decisions, and Learnings

> Point at a codebase; get an explorable architecture diagram — the stack, how the
> pieces connect, where each piece lives in the code, and what the alternatives are.

## Why I built this

This is the tool I want when I land in an unfamiliar codebase. Before I can be useful
in a new repo I need the big picture: what's the stack, what's the architecture, what
talks to what. If I don't know a particular technology, I want to know its comps — what
I'd reach for instead and why someone chose this one. And I want to be able to trace a
request and see where it goes, then drill into the actual files when I want to go deeper.

Reading code top-to-bottom doesn't give you that map quickly, and neither does a README
(which is usually aspirational or stale). Stack Explorer reconstructs the map from the
code itself.

## What it does

Pick a folder. In under a second you see a skeleton diagram of the detected stack. Over
the next ~20–30s it sharpens into three linked views over the same model:

- **Stack** — layered tiers (Frontend → Application/API → Data → Infra & Ops), with
  related tech grouped into labeled sub-clusters, plus light data-flow edges and a
  narrated request trace.
- **System** — the runtime architecture as a directed graph: clients, servers,
  datastores, queues, workers, and external services, laid out by dependency order, with
  async hops dashed and third-party services wrapped in a cloud.
- **Code** — the real file tree, with bidirectional cross-highlighting: hover a
  technology to light up its files, click a file to see which part of the stack it
  belongs to.

Clicking any node opens a compare panel: why this choice is here, where it lives in the
code, and the **alternatives** with pros/cons and "when to choose."

## Approach & what makes it novel

A few decisions distinguish this from "ask an LLM to describe my repo."

**1. Hybrid analysis: deterministic detection grounds LLM judgment.**
A static pass parses known manifests (`package.json`, `requirements.txt`, etc.) into a
ground-truth list of technologies, each anchored to the real files that prove it. The
LLM pass takes that as fact and adds what a rules engine can't: grouping, rationale,
alternatives, data-flow edges, the request trace, and runtime roles. The split means
obvious tech is never hallucinated or missed, and if the LLM call fails entirely, a
useful diagram still renders from the static pass alone. The model supplies judgment; it
doesn't supply the facts it's bad at.

**2. The code map is computed, not enumerated by the LLM.**
Asking a model to list every file belonging to every technology doesn't scale and isn't
reliable. Instead, per technology the LLM emits a few **path globs**
(`flask → ["server/app.py", "server/api/**"]`), and the client expands those globs
against the real, browser-walked file tree to compute every file's mapping
deterministically. LLM output stays small and stable regardless of repo size, while the
per-file cross-highlighting stays exact.

**3. Progressive, staged generation instead of one long wait.**
The naive single call took ~78s on a 14-file repo, almost all of it generating the
alternatives JSON, and the user stared at a blank screen the whole time. I split it into
three stages, fastest first:

- **Skeleton** — pure TypeScript (static detect + file-tree build), runs in the browser
  with no network. Paints in <1s.
- **Overview** — one LLM call that *omits* the alternatives (the bulk of the output
  tokens): rationale, globs, edges, trace, runtime roles. ~20–30s. The prompt sends a
  summarized, capped path list to bound latency, but glob expansion runs against the full
  tree for an accurate map.
- **Alternatives** — small per-technology calls, fetched lazily on first panel open and
  prefetched in the background with a bounded worker pool.

The client holds one `Analysis` object that starts as the skeleton and gets progressively
sharpened in place — nodes firm up, edges and the trace appear, alternatives fill in.

**4. Curation as a first-class feature.**
The interesting design problem isn't extracting everything — it's deciding what *not* to
show. The prompt tells the model to behave like a staff engineer naming the meaningful
stack and to drop minor/transitive dependencies, plugins, and stubs. On top of that,
each Stack cluster caps at 5 nodes with a "+N more" expander, and dev/test/build tooling
is split into its own muted tier so it doesn't compete with the application stack.

## Key design decisions

### Product

- **Lead with the stack, layer in context.** The primary question is "what tech is in
  here." On top of that I layered the *system* view (what's connected to what) and the
  *code* view (where exactly to look). Those three answer the three things I actually
  want when I land somewhere new.
- **Alternatives + rationale, not just names.** Nobody is equally familiar with every
  technology. If a repo uses a tool you don't know well, the useful thing is the comps —
  what else could sit in that slot, and the tradeoffs between them. So each technology
  shows what it's there for plus its alternatives, with pros/cons and when you'd pick each.
- **Request trace.** A narrated, ordered walkthrough of a typical request over the
  data-flow edges, so you can follow the path instead of inferring it.
- **Restraint in the UI.** Early versions were too crowded to parse. Curation, per-cluster
  caps, a separate dev/test tier, faint-by-default edges that darken on hover, and the
  code map as a slide-over overlay (rather than a layout-shifting split) all came from
  fighting clutter.

### Engineering

- **What to send the LLM** is the central eng decision: manifests (full) + the path list,
  with the tree summarized/capped in the prompt to bound latency but expanded in full for
  the code map. Enough to identify and locate the stack without shipping every file.
- **How to stage the work** so something useful is on screen in <1s and the model's
  slowest output (alternatives) is deferred and parallelized.
- **Deterministic where possible, LLM where necessary.** Detection, file-tree build, glob
  expansion, and the System layout are all pure, testable functions. The LLM is scoped to
  the judgment calls, and its output is validated with a zod schema so a bad response can't
  crash the UI.

## Tradeoffs

- **Hosted webapp vs. the ideal deployment.** I built this as a hosted web app because
  it's the easiest way to demo — but it's not how I'd actually want it used, and it shapes
  the architecture. The reason the payload is restricted to manifests + paths at all is
  that the code is passing through someone else's site; people are happy to share code with
  Claude directly, but routing an entire codebase through a *third* website that could read
  all of it is a different ask. Run locally, that constraint disappears. The right form
  factor is something that runs on your machine or rides your existing Claude/Codex
  subscription, talking to the model directly with no hosting layer — at which point I'd
  just hand it the full source. For a demo this concern can be set aside.
- **LLM curation is a judgment call.** Asking the model to drop "insignificant" tech means
  it can occasionally omit something that mattered, and results aren't perfectly
  deterministic run to run. I traded completeness for legibility on purpose, but it's a
  real tradeoff.
- **Capping the prompt's path list bounds latency but can blur the map.** Glob expansion
  uses the full tree to compensate, but a very large/unusual repo can still surprise the
  summarizer.
- **Static detection only knows the manifests it has rules for.** Unusual or
  config-by-convention stacks lean harder on the LLM inference and lose some grounding.
- **Ephemeral and desktop-only.** No persistence, sharing, accounts, or mobile — all
  deliberately out of scope to keep the surface small.

## Learnings & iterations

The shape of the product came from iterating, mostly in response to "this is hard to
read" or "this is too slow":

1. **Progressive loading.** The biggest UX win. Went from one ~78s blank-screen call to
   skeleton-in-<1s → overview → lazy alternatives.
2. **Organizing boxes within each layer.** A flat tier collapsed app servers, queues, and
   ORMs together; introducing labeled sub-clusters made each layer legible.
3. **Adding the System view and refining categories.** A layered stack diagram can't show
   true runtime topology, so I added a graph view and a `kind` taxonomy
   (client/server/service/datastore/queue/worker/external) to drive it.
4. **De-cluttering what's included.** Curation prompt + per-cluster caps + faint default
   edges so the diagram reads at a glance instead of overwhelming.
5. **Splitting dev/test tooling out of the main stack.** Bundlers, linters, test
   frameworks, and CI now live in a separate muted tier so they don't compete with the
   application architecture.

---

## Where to fill in / decide

- **Numbers.** Concrete before/after latency, token reduction from deferring alternatives,
  and a couple of real example repos (sizes, what it correctly/incorrectly surfaced). The
  ~78s figure is from one synthetic 14-file repo — worth restating with real data.
- **Visuals.** Screenshots or a short clip of the three views + the compare panel, and a
  small diagram of the pipeline itself (skeleton → overview → alternatives). Reference
  mocks live in `reference/mock/screenshots/`.
- **The "comps for unfamiliar tech" angle.** You called this out as a core motivation; the
  alternatives panel delivers it, but the writeup could lean into it more with an example.
- **The ideal (non-hosted) deployment, expanded.** If you want, sketch what the local
  CLI / IDE / MCP version looks like and what it buys (no third-party hosting, full source
  available locally). This is your strongest "what I'd do next" note.
- **Audience / use cases.** Onboarding to a new team, evaluating a codebase (diligence,
  acquisition), interview prep, or just orienting in OSS. Naming who it's for sharpens the
  pitch.
- **Quality / evaluation.** How do you know the output is *good*? Any eval approach, or
  the honest "spot-checked against repos I know" — reviewers will ask.
- **Model + cost.** Which model, why (structured-extraction fit, latency, price), and
  rough cost per analysis. Mention prompt caching on the system prompt if you kept it.
- **What's deliberately out of scope** (persistence, sharing, mobile, monorepos) — a short
  YAGNI note signals judgment rather than omission.
```
