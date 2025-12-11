// src/entities/EnemyBullet.ts
import { Texture } from "pixi.js";
import { GameObject} from "./GameObject";
import type { Collider } from "./GameObject";
import type { Poolable } from "../core/ObjectPool"; 
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
        this.sprite.x = x; 
        this.sprite.y = y;
        this.active = true;
        this.sprite.visible = true;
    }

    public update(delta: number): void {
        if (!this.active) return;

        this.sprite.y += CONFIG.ENEMY_BULLET.SPEED * delta;

        if (this.sprite.y > CONFIG.SCREEN.HEIGHT) { 
            this.active = false;
        }
    }
}