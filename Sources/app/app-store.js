// Provides a minimal mutable model store with safe clone reads and subscription-based updates.

import { clone } from "./defaults.js";

export class AppStore {
  #state;
  #listeners;

  constructor(initialState) {
    this.#state = clone(initialState);
    this.#listeners = new Set();
  }

  getState() {
    return clone(this.#state);
  }

  getStateReference() {
    return this.#state;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  update(mutator) {
    mutator(this.#state);

    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}