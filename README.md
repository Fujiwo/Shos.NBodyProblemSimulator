# Shos.NBodyProblemSimulator

Browser-only 3D N-body problem simulator built with HTML5, CSS3, Vanilla JavaScript, and Three.js.

## Runtime

- The current baseline uses the main-thread simulation path with Velocity Verlet as the default integrator.
- Phase 4 onward adds RK4 comparison, Worker execution paths, and simulation pipeline time validation on top of the current baseline.
- Use `?execution=main` or `?execution=worker` to override the non-persistent simulation backend for validation runs.
- Three.js is loaded from local vendored files under Sources/vendor.
- Body textures are resolved from Sources/images using normalized Body.name values.
- If Three.js cannot initialize, the app stays usable in 2D fallback mode and the status message explains that texture-backed bodies are unavailable.

## UI

- The header shows the app title, playback state, and a runtime status message.
- The header stays compact so the viewport keeps most of the vertical space.
- The controls panel uses compact visible labels such as Count, dt, Soft, Target, and Trail while keeping full accessible names via title or aria-label.
- The playback buttons use compact visible text such as Gen, Run, Hold, Go, and Reset.
- Validation is hidden when there are no errors and is emphasized only when invalid input exists.
- Body settings use single-expand cards so only one body editor is open at a time.
- The visualization stage is intentionally tall to prioritize the canvas area over non-interactive chrome.

## Local setup

1. Run npm install.
2. Run npm run vendor:three.
3. Serve Sources over HTTP.
4. Open Sources/index.html through the local server.

## Testing

- Run npm test for the Node-based regression suite, including the static compact UI contract checks.
- Run npm run test:ui:install once to install the Chromium browser used by Playwright.
- Run npm run test:ui for real-browser UI acceptance coverage against a local static server.
- Run npm run benchmark:phase4 to execute the 60-second comparison harness for `?execution=main` and `?execution=worker`.
- Benchmark outputs are saved under Works/benchmarks/phase4/ as timestamped *.raw.json and *.ci.json files plus latest.raw.json and latest.ci.json.

### Phase 4 comparison workflow

1. Run `npm run test` to validate the unit and integration suite before benchmarking.
2. Run `npm run test:ui` to confirm the compact UI contract still holds in a real browser.
3. Run `npm run benchmark:phase4` to launch the browser harness under the fixed benchmark condition.
4. Use latest.raw.json for full per-scenario measurements and latest.ci.json for stable CI comparison keys.
5. Repeat with `BENCHMARK_DURATION_MS` overridden only when a shorter smoke run is needed; keep the default 60000ms for acceptance measurement.

### execution=worker comparison steps

1. Open the app with `?execution=main` to capture the current baseline result.
2. Open the app with `?execution=worker` to force the Worker backend for the same preset, body count, and integrator.
3. Use `random-cluster`, `bodyCount = 10`, `Integrator = Verlet`, `Trail = on`, and no camera interaction for the acceptance condition.
4. If the Worker backend fails at runtime, the app automatically switches to the main-thread backend and the status message reports the fallback.
5. Treat the fallback message as a failed Worker benchmark run and investigate before using Worker as the preferred backend.
6. In CI, consume latest.ci.json and evaluate summary.overallStatus, checks.workerFallbackDetected, and the metric comparison objects under comparison.

### Compact UI contract checks

- Compact visible control text remains shortened as Count, dt, Soft, Target, Trail, Gen, Run, Hold, Go, and Reset.
- Interactive controls keep their full accessible names through aria-label even when the visible text is shortened.
- Validation stays hidden while the form is valid and appears only when invalid input exists.
- Body settings keep the single-expand card behavior so only one body editor is open at a time.
- At 360px width, the compact controls remain usable without horizontal overflow.
- During running and paused playback states, body editing inputs stay disabled.

## Repository conventions

- Runtime Three.js files are kept in Sources/vendor.
- The current vendored browser bundles are Sources/vendor/three.module.min.js and Sources/vendor/three.core.min.js.
- When updating Three.js, refresh the vendored files together with the npm dependency.

## Updating Three.js vendor files

1. Run npm run three:update.

Manual alternative:

1. Run npm install three@desired-version.
2. Run npm run vendor:three.
3. Optionally run npm run vendor:three:verify.
4. Run npm test.
