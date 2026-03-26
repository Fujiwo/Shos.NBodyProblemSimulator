import * as THREE from "./vendor/three.module.min.js";
import { createReinitializeApp } from "./app/app-entrypoint.js";
import { bootstrapApp } from "./app/bootstrap.js";

const createBrowserApp = (options = {}) => bootstrapApp(document, {
	three: THREE,
	...options
});

const runReinitializeApp = createReinitializeApp({
	createApp: createBrowserApp
});

export let app = runReinitializeApp({ reason: "initial-load" });

export function reinitializeApp(options = {}) {
	app = runReinitializeApp(options);
	return app;
}