// Wraps localStorage persistence, legacy migration, and normalized hydration for saved app state.

import { STORAGE_KEY, clone, createInitialAppState } from "./defaults.js";
import { createHydratedAppState, serializePersistedAppState } from "./state-rules.js";

const LEGACY_BODY_NAME_MAP = new Map([
  ["primary", "sun"],
  ["secondary", "mercury"],
  ["body a", "sun"],
  ["body b", "mercury"],
  ["body c", "venus"],
  ["body 1", "sun"],
  ["body 2", "mercury"],
  ["body 3", "venus"],
  ["body 4", "earth"],
  ["body 5", "moon"],
  ["body 6", "mars"],
  ["body 7", "jupiter"],
  ["body 8", "saturn"]
]);

function normalizeLegacyNameKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

function migrateBodyName(name) {
  const mappedName = LEGACY_BODY_NAME_MAP.get(normalizeLegacyNameKey(name));
  return mappedName ?? name;
}

function migrateBodies(bodies) {
  if (!Array.isArray(bodies)) {
    return {
      bodies,
      changed: false
    };
  }

  let changed = false;

  const migratedBodies = bodies.map((body) => {
    if (!body || typeof body !== "object") {
      return body;
    }

    const nextName = migrateBodyName(body.name);

    if (nextName !== body.name) {
      changed = true;
      return {
        ...body,
        name: nextName
      };
    }

    return body;
  });

  return {
    bodies: migratedBodies,
    changed
  };
}

function migratePersistedState(rawState, fallbackVersion) {
  const input = rawState && typeof rawState === "object" ? clone(rawState) : rawState;

  if (!input || typeof input !== "object") {
    return {
      appState: input,
      migrationApplied: false,
      previousVersion: null
    };
  }

  const previousVersion = typeof input.appVersion === "string" ? input.appVersion : null;
  let migrationApplied = previousVersion !== fallbackVersion;

  // Migrate both live bodies and the committed snapshot so reset stays consistent after restore.
  const migratedBodies = migrateBodies(input.bodies);
  input.bodies = migratedBodies.bodies;
  migrationApplied ||= migratedBodies.changed;

  if (input.committedInitialState && typeof input.committedInitialState === "object") {
    const migratedSnapshotBodies = migrateBodies(input.committedInitialState.bodies);
    input.committedInitialState = {
      ...input.committedInitialState,
      bodies: migratedSnapshotBodies.bodies
    };
    migrationApplied ||= migratedSnapshotBodies.changed;
  }

  input.appVersion = fallbackVersion;

  return {
    appState: input,
    migrationApplied,
    previousVersion
  };
}

function isPersistedStateShape(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePersistedState(rawValue) {
  const parsed = JSON.parse(rawValue);

  if (!isPersistedStateShape(parsed)) {
    throw new Error("Persisted state shape is invalid.");
  }

  return parsed;
}

export class PersistenceFacade {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.lastSerializedState = null;
  }

  load() {
    const fallbackAppState = createInitialAppState();
    const storage = this.getStorage();

    if (!storage) {
      return {
        appState: fallbackAppState,
        statusMessage: null
      };
    }

    try {
      const rawValue = storage.getItem(this.storageKey);

      if (!rawValue) {
        return {
          appState: fallbackAppState,
          statusMessage: null
        };
      }

      const parsed = parsePersistedState(rawValue);

      const migration = migratePersistedState(parsed, fallbackAppState.appVersion);

      return {
        appState: createHydratedAppState(migration.appState),
        statusMessage: migration.migrationApplied
          ? `Saved state restored after migration${migration.previousVersion ? ` from ${migration.previousVersion}` : ""}.`
          : "Saved state restored."
      };
    } catch {
      return {
        appState: fallbackAppState,
        statusMessage: "Failed to restore saved state. Defaults were applied."
      };
    }
  }

  stage(appState) {
    this.lastSerializedState = serializePersistedAppState(appState);

    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(this.storageKey, JSON.stringify(this.lastSerializedState));
    } catch {
      // Ignore storage failures for now. Phase 2 only guarantees a safe persistence boundary.
    }
  }

  serialize(appState) {
    return serializePersistedAppState(appState);
  }

  getStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}