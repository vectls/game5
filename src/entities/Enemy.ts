// src/entities/Enemy.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject"; 
import type { Collider } from "./GameObject"; 
import type { Poolable } from "../core/ObjectPool"; 
import { CONFIG } from "../config";
import { EntityManager } from "../core/EntityManager"; 

/**
 * 敵機を表すクラス。
 * ColliderとPoolableインターフェースを実装。
 */
export class Enemy extends GameObject implements Poolable, Collider { 
    // 衝突判定に必要。GameObjectのコンストラクタで設定された値を保持
    public readonly width: number;
    public readonly height: number;
    
    // activeプロパティはGameObjectから継承されているものを使用します。
    
    private entityManager: EntityManager; 
    private timeSinceLastShot: number = 0; 

    constructor(texture: Texture, entityManager: EntityManager) {
        // 敵機のサイズを少し小さく設定
        const w = texture.width * 0.8;
        const h = texture.height * 0.8;
        super(texture, w, h); 
        
        this.width = w; 
        this.height = h; 

        this.entityManager = entityManager;
        this.timeSinceLastShot = 0; 
    }

    /**
     * オブジェクトプールから取得された際に初期状態にリセットする
     * @param x 初期X座標
     * @param y 初期Y座標
     */
    public reset(x: number, y: number): void { 
        this.sprite.x = x; 
        this.sprite.y = y; 
        
        // 🚀 エラー2611回避のため、継承したactiveプロパティを直接使用
        this.active = true; 
        this.sprite.visible = true; // 可視性も設定
        this.timeSinceLastShot = 0; 
    }

    public update(delta: number): void {
        if (!this.active) return;

        // 敵機を下へ移動
        this.sprite.y += CONFIG.ENEMY.SPEED * delta;

        // 画面外チェック
        if (this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN) {
            // 🚀 画面外に出たら非アクティブ化し、可視性も切る
            this.active = false;
            this.sprite.visible = false;
        }
        
        // 弾の発射チェック (CONFIG.ENEMY.FIRE_RATE_MSを使用)
        this.timeSinceLastShot += delta * 1000; 
        if (this.timeSinceLastShot >= CONFIG.ENEMY.FIRE_RATE_MS) { 
            this.fireBullet();
            this.timeSinceLastShot = 0; 
        }
    }
    
    /**
     * 敵の弾を発射する
     */
    private fireBullet() {
        // 敵機の底部中央から弾を発射
        const bulletX = this.sprite.x + this.width / 2;
        const bulletY = this.sprite.y + this.height; 
        this.entityManager.spawnEnemyBullet(bulletX, bulletY);
    }

    // ------------------------------------
    // Colliderインターフェースの実装
    // ------------------------------------
    // x, yプロパティはGameObjectのsprite.x/yを参照します。
    public get x() { return this.sprite.x; }
    public get y() { return this.sprite.y; }

    public get left() { return this.x; }
    public get right() { return this.x + this.width; }
    public get top() { return this.y; }
    public get bottom() { return this.y + this.height; }
}