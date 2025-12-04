// src/entities/EnemyBullet.ts
import { Texture } from "pixi.js";
import { GameObject} from "./GameObject";
import type { Collider } from "./GameObject";
import type { Poolable } from "../core/ObjectPool"; // 🚀 【import type に修正】
import { CONFIG } from "../config";

export class EnemyBullet extends GameObject implements Poolable, Collider {
    public active: boolean = false;
    public readonly width: number;
    public readonly height: number;

    constructor(texture: Texture) {
        const w = CONFIG.ENEMY_BULLET.WIDTH;
        const h = CONFIG.ENEMY_BULLET.HEIGHT;
        super(texture, w, h);
        
        this.width = w; 
        this.height = h; 
    }

    public reset(x: number, y: number): void {
        // sprite.x/y に代入
        this.sprite.x = x - this.width / 2; 
        this.sprite.y = y;
        this.active = true;
        this.sprite.visible = true;
    }

    public update(delta: number): void {
        if (!this.active) return;

        // sprite.y を使用
        this.sprite.y += CONFIG.ENEMY_BULLET.SPEED * delta;

        // 🚀 【エラー修正】CONFIG.SCREEN.HEIGHT を使用
        if (this.sprite.y > CONFIG.SCREEN.HEIGHT) { 
            this.active = false;
        }
    }
    
    // Colliderのゲッター
    public get x() { return this.sprite.x; }
    public get y() { return this.sprite.y; }
    public get left() { return this.x; }
    public get right() { return this.x + this.width; }
    public get top() { return this.y; }
    public get bottom() { return this.y + this.height; }
}