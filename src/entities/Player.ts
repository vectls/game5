// src/entities/Player.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";

export class Player extends GameObject {
    private lastShotTime = 0;
    private onShoot: (x: number, y: number) => void;

    constructor(texture: Texture, onShoot: (x: number, y: number) => void) {
        super(texture);
        this.onShoot = onShoot;
        this.active = true;
        this.sprite.visible = true;

        // 初期位置の設定
        this.sprite.x = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
        this.sprite.y = CONFIG.PLAYER.INITIAL_Y;
    }

    reset() {}

    update(delta: number) {
        // PlayerはhandleInputで操作
    }

    handleInput(input: InputManager, delta: number) {
        const halfWidth = this.sprite.width / 2;

        // 移動
        if (input.isDown(CONFIG.INPUT.MOVE_LEFT)) {
            this.sprite.x -= CONFIG.PLAYER.SPEED * delta;
        }
        if (input.isDown(CONFIG.INPUT.MOVE_RIGHT)) {
            this.sprite.x += CONFIG.PLAYER.SPEED * delta;
        }

        // 画面境界でのクランプ（はみ出し防止）
        this.sprite.x = Math.max(
            halfWidth,
            Math.min(CONFIG.SCREEN.WIDTH - halfWidth, this.sprite.x)
        );

        // 発射
        const now = performance.now();
        if (
            input.isDown(CONFIG.INPUT.SHOOT) &&
            now - this.lastShotTime > CONFIG.PLAYER.SHOT_INTERVAL_MS
        ) {
            // 発射位置オフセットを適用
            this.onShoot(
                this.sprite.x,
                this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y
            );
            this.lastShotTime = now;
        }
    }
}
