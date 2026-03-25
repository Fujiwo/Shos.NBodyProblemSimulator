import * as THREE from "./vendor/three.module.min.js";
import { bootstrapApp } from "./app/bootstrap.js";

globalThis.THREE = THREE;
bootstrapApp(document);