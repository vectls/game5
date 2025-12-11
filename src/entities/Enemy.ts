// src/entities/Enemy.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject"; 
import type { Collider } from "./GameObject"; 
import type { Poolable } from "../core/ObjectPool"; 
import { CONFIG } from "../config";
import { EntityManager, ENTITY_KEYS } from "../core/EntityManager"; 

export class Enemy extends GameObject implements Poolable, Collider { 
    public readonly width: number;
    public readonly height: number;
    
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
            this.fireBullet();
            this.timeSinceLastShot = 0; 
        }
    }
    
    private fireBullet() {
        const bulletX = this.sprite.x; 
        const bulletY = this.sprite.y + this.sprite.height / 2; 
        
        this.entityManager.spawn(ENTITY_KEYS.ENEMY_BULLET, bulletX, bulletY);
    }
}