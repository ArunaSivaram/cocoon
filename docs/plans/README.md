# Rebuild plans

One file per completed BUILD_PLAN step. Each is a concise recipe —
"starting from a fresh repo at this point, here's exactly what to install,
what files to create, what to run, and the Check to prove it worked." They
complement the build logs in `../build-log/`: the build log is a record of
what shipped, the plan is a recipe for doing it again.

| Step | Plan | Build log |
|---|---|---|
| 01 — Scaffold | `step-01-scaffold.md` | `../build-log/step-01-scaffold.md` |
| 02 — Deploy early to Vercel | `step-02-vercel.md` | `../build-log/step-02-vercel.md` |
| 03 — Design system + app shell | `step-03-design-system.md` | `../build-log/step-03-design-system.md` |
| 04 — Types + API client + MSW | `step-04-types-and-mocks.md` | `../build-log/step-04-types-and-mocks.md` |
| 05 — Sign-in + route guards | `step-05-signin.md` | `../build-log/step-05-signin.md` |
| 06 — Recording hooks + /dev/mic | `step-06-recording-hooks.md` | `../build-log/step-06-recording-hooks.md` |
