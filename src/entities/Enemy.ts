// src/entities/Enemy.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject"; 
import type { Collider } from "./GameObject"; 
import type { Poolable } from "../core/ObjectPool"; 
import { CONFIG } from "../config";
import { EntityManager, ENTITY_KEYS } from "../core/EntityManager"; 
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
        const w = texture.width * 0.9;
        const h = texture.height * 0.9;
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
    
    private fireBullet() {
 // 🚀 【修正】敵機Spriteの底部中央から弾を発射する
        // this.sprite.x は Spriteの中心X座標
        const bulletX = this.sprite.x; 
        
        // this.sprite.y (Spriteの中心Y) + Spriteの描画サイズの半分 (ヒットボックスの高さではなく)
        const bulletY = this.sprite.y + this.sprite.height / 2; 
        
        // 🚀 【修正】汎用 spawn メソッドを使用
        this.entityManager.spawn(ENTITY_KEYS.ENEMY_BULLET, bulletX, bulletY);
    }
}