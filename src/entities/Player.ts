// src/entities/Player.ts
import { Texture, EventEmitter } from "pixi.js";
import { GameObject } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";

export class Player extends GameObject {

    public static readonly SHOOT_EVENT = "shoot";

    private lastShotTime = 0;
    private emitter: EventEmitter = new EventEmitter();

    constructor(texture: Texture) { 
        super(texture, texture.width, texture.height);
        this.active = true;
    }

    // 💡 EventEmitterの機能を外部に公開するためのメソッド（main.tsがこれを使って購読します）
    public on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this {
        this.emitter.on(event, fn, context);
        return this;
    }

    public emit(event: string | symbol, ...args: any[]): boolean {
        return this.emitter.emit(event, ...args);
    }

    public reset() {
        this.active = true;
        this.sprite.visible = true;
        this.lastShotTime = 0;
        
        // 初期位置の設定
        this.sprite.x = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
        this.sprite.y = CONFIG.PLAYER.INITIAL_Y;
    }

    update(delta: number) {
        // PlayerはhandleInputで操作
    }

    handleInput(input: InputManager, delta: number) {
        const halfWidth = this.hitWidth / 2;

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
            // 🚀 修正: コールバック呼び出しをイベント発火に置き換える
            this.emit(
                Player.SHOOT_EVENT, // イベント名
                this.sprite.x,
                this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y
            );
            this.lastShotTime = now;
        }
    }
}
