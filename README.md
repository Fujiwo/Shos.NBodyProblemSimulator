# Shos.NBodyProblemSimulator

Browser-only 3D N-body problem simulator built with HTML5, CSS3, Vanilla JavaScript, and Three.js.

## Runtime

- Three.js is loaded from local vendored files under Sources/vendor.
- Body textures are resolved from Sources/images using normalized Body.name values.
- If Three.js cannot initialize, the app stays usable in 2D fallback mode and the status message explains that texture-backed bodies are unavailable.

## UI

- The header shows the app title, playback state, and a runtime status message.
- The controls panel uses compact visible labels such as Count, dt, Soft, Target, and Trail while keeping full accessible names via title or aria-label.
- The playback buttons use compact visible text such as Gen, Run, Hold, Go, and Reset.
- Validation is hidden when there are no errors and is emphasized only when invalid input exists.
- Body settings use single-expand cards so only one body editor is open at a time.

## Local setup

1. Run npm install.
2. Run npm run vendor:three.
2. Serve Sources over HTTP.
3. Open Sources/index.html through the local server.

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
