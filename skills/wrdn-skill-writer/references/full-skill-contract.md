# Full Skill Contract

Open this file when creating or updating a complete Warden skill.

## Goal

A full skill is a self-contained runtime artifact that an agent can execute directly.

It should be complete enough to:

- trigger correctly
- route the agent through the right workflow
- point to the right bundled references
- carry its own maintenance contract

## Required Artifacts

A full Warden skill should normally include:

- `SKILL.md`
- `SPEC.md`
- `SOURCES.md`
- `references/` files only when there is a clear lookup need

Add `scripts/` only when the workflow depends on deterministic repeated automation.

## SKILL.md Requirements

- `name` matches the directory
- `description` contains realistic Warden-specific trigger phrases
- body stays concise and imperative
- references are loaded by task need, not dumped into the main file
- output requirements are explicit

## Maintenance Artifact Requirements

- `SPEC.md`
  - intent
  - scope
  - users and trigger context
  - runtime contract
  - source and evidence model
  - evaluation
  - limitations
- `SOURCES.md`
  - source inventory
  - coverage matrix
  - decisions
  - open gaps
  - changelog

## Quality Rules

- one skill, one primary concern
- references are focused by lookup need
- transformed examples are concrete and reusable
- claims about Warden behavior match local code or bundled docs
- no host-specific absolute paths in runtime docs

## Rejection Conditions

Reject the draft if any of these are true:

- the skill is too broad to be reviewed as one concern
- trigger language is vague or generic
- required maintenance artifacts are missing
- references duplicate the main router instead of acting as lookup modules
- examples are abstract and not directly usable
