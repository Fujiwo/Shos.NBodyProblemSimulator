import * as THREE from "./vendor/three.module.min.js";
import { bootstrapApp } from "./app/bootstrap.js";

globalThis.__N_BODY_APP__?.dispose?.();

export const app = bootstrapApp(document, { three: THREE });

globalThis.__N_BODY_APP__ = app;