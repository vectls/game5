// src/entities/EnemyBullet.ts

import { Texture } from "pixi.js";
import { Projectile } from "./Projectile"; 

export class EnemyBullet extends Projectile {

    constructor(texture: Texture) {
        super(texture); 
    }

    /**
     * オブジェクトプールから取得する際のリセット処理。
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
        this.lifeTime = 0; 
        
        // 敵弾は直線弾なので、オプションは全てnullで初期化
        this.scaleOpt = null;
        this.speedOpt = null;
        this.trajectoryOpt = null;
        
        // 直線弾は initialAngle を使わないが、リセットしておく
        const angleRad = Math.atan2(velY, velX);
        this.initialAngle = angleRad * (180 / Math.PI);

        this.trajectoryTimer = 0; 

        // 初期スケール設定（デフォルト）
        const initialScale = 1.0;
        this.sprite.scale.set(initialScale);
        this.updateHitbox(initialScale); 
        
        this.active = true;
        this.sprite.visible = true;

        // 🚀 修正: 直線弾なので、回転を発射時に一度だけ固定する
        // Projectile.ts の update() で shouldUpdateRotation が false になるため、
        // この回転が維持されます。
        this.sprite.rotation = angleRad + Math.PI / 2;
    }

    public update(delta: number) {
        // Projectileのupdateを呼び出すことで、移動、回転（WAVE弾のみ）、寿命が処理される
        super.update(delta);
    }
}