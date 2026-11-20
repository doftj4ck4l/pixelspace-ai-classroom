---
description: Verify something on staging with the staging-verifier subagent
agent: build
---

Spawn one `staging-verifier` subagent with this brief: "$ARGUMENTS".

It must run pnpm lint + pnpm build, confirm the latest commit is live on weedad
(`paic2.service` active), exercise the flow on
https://paic2staging.pixelspace.com.my with Playwright, clean up any throwaway
artifacts it creates, and report PASS/FAIL per check with evidence. Relay its
findings verbatim, blockers first.
