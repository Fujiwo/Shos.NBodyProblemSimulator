import * as THREE from "./vendor/three.module.min.js";
import { replaceActiveApp } from "./app/app-lifecycle.js";
import { bootstrapApp } from "./app/bootstrap.js";

export const app = replaceActiveApp(() => bootstrapApp(document, { three: THREE }));