// src/entities/Enemy.ts (修正後)

import { Texture, EventEmitter } from "pixi.js"; // 💡 修正 1: EventEmitterをインポート
import { GameObject } from "./GameObject"; 
import type { Collider } from "./GameObject"; 
import type { Poolable } from "../core/ObjectPool"; 
import { CONFIG } from "../config";
import { EntityManager, ENTITY_KEYS } from "../core/EntityManager"; 

export class Enemy extends GameObject implements Poolable, Collider { 
    // 🚀 修正 3: 静的プロパティ FIRE_EVENT の追加
    public static readonly FIRE_EVENT = "fire";

    public readonly width: number;
    public readonly height: number;
    
    // 💡 修正 2: EventEmitter機能の実装
    private emitter: EventEmitter = new EventEmitter();

    private entityManager: EntityManager; 
    private timeSinceLastShot: number = 0; 

    constructor(texture: Texture, entityManager: EntityManager) {
        const w = texture.width * 0.9;
        const h = texture.height * 0.9;
        super(texture, w, h); 
        
        this.width = w; 
        this.height = h; 

        this.entityManager = entityManager;
        this.timeSinceLastShot = 0; 
    }

    // 💡 修正 2: on メソッドの実装 (EntityManagerのエラー解消)
    public on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this {
        this.emitter.on(event, fn, context);
        return this;
    }

    // 💡 修正 2: emit メソッドの実装 (updateでの発火に対応)
    public emit(event: string | symbol, ...args: any[]): boolean {
        return this.emitter.emit(event, ...args);
    }

    public reset(x: number, y: number): void { 
        this.sprite.x = x; 
        this.sprite.y = y; 
        
        this.active = true; 
        this.sprite.visible = true; 
        this.timeSinceLastShot = 0; 
    }

    public update(delta: number): void {
        if (!this.active) return;

        this.sprite.y += CONFIG.ENEMY.SPEED * delta;

        if (this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN) {
            this.active = false;
            this.sprite.visible = false;
        }
        
        this.timeSinceLastShot += delta * 1000; 
        if (this.timeSinceLastShot >= CONFIG.ENEMY.FIRE_RATE_MS) {
            // 🚀 修正 4: 敵弾発射イベントを発火
            this.emit(Enemy.FIRE_EVENT, this.x, this.y); 
            this.timeSinceLastShot = 0;
        }
    }
}