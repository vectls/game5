// src/core/InputManager.ts
export class InputManager {
    private keys: Record<string, boolean> = {};

    // イベントリスナーを保持する関数
    private handleKeyDown = (e: KeyboardEvent) => (this.keys[e.code] = true);
    private handleKeyUp = (e: KeyboardEvent) => (this.keys[e.code] = false);

    constructor() {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    public isDown(code: string): boolean {
        return !!this.keys[code];
    }

    // クリーンアップメソッド
    public destroy() {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }
}
