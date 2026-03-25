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

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  update(mutator) {
    const draft = clone(this.#state);
    mutator(draft);
    this.#state = draft;

    for (const listener of this.#listeners) {
      listener(this.getState());
    }
  }
}