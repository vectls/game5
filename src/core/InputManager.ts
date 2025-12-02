// src/core/InputManager.ts
export class InputManager {
  private keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
  }

  public isDown(code: string): boolean {
    return !!this.keys[code];
  }
}
