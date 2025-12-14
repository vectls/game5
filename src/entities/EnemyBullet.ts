// src/entities/EnemyBullet.ts

import { Texture } from "pixi.js";
import { Projectile } from "./Projectile"; // Projectileを継承
// 敵弾にはオプションは不要だが、型定義は念のため残しておく
import type { ScaleOption, SpeedOption, TrajectoryOption } from "../types/ShotTypes"; 

export class EnemyBullet extends Projectile {

    // 敵弾は基本的にオプションやEntityManagerへの参照は不要

    constructor(texture: Texture) {
        super(texture); 
        // EnemyBulletのテクスチャの中心をアンカーに設定するのは、Projectileのコンストラクタで行われている
    }

    /**
     * オブジェクトプールから取得する際のリセット処理。
     * 敵弾はシンプルに位置と速度を受け取ることを想定。
     * Projectile.resetの引数と互換性を持たせるため、今回は velX/velY 以降の引数は受け取らない、あるいは無視するシンプルな形とする。
     */
    public reset(
        x: number, 
        y: number, 
        velX: number, 
        velY: number, 
    ) {
        // Projectileのプロパティを初期化
        this.sprite.x = x;
        this.sprite.y = y;
        this.velX = velX; 
        this.velY = velY; 
        this.lifeTime = 0; // タイマーをリセット
        
        // 敵弾はオプション設定をしないため、nullで初期化
        this.scaleOpt = null;
        this.speedOpt = null;
        this.trajectoryOpt = null;
        this.initialAngle = 0;
        this.trajectoryTimer = 0;

        // 初期スケール設定（デフォルト）
        const initialScale = 1.0;
        this.sprite.scale.set(initialScale);
        this.updateHitbox(initialScale); 
        
        this.active = true;
        this.sprite.visible = true;
    }

    public update(delta: number) {
        // Projectileのupdateを呼び出すことで、移動、回転、寿命が処理される
        super.update(delta);
        
        // 必要であれば、敵弾固有のロジック（例えば、画面下端での非アクティブ化など）をここに追加
    }
}