// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { Projectile } from "./Projectile"; 
import type { ScaleOption, SpeedOption, ShotSpec, TrajectoryOption } from "../types/ShotTypes"; 
import type { EntityManager } from "../core/EntityManager"; 

export class Bullet extends Projectile {
    private onDeathShotSpec: ShotSpec | null = null; 
    private entityManager: EntityManager; 

    constructor(texture: Texture, entityManager: EntityManager) {
        super(texture); 
        this.entityManager = entityManager;
    }

    /**
     * オブジェクトプールから取得する際のリセット処理。
     * Projectileのプロパティに加え、デスショットの設定を受け取る。
     */
    public reset(
        x: number, 
        y: number, 
        velX: number, 
        velY: number, 
        textureKey: string, 
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null,
        // 🚀 修正点: 軌道と角度の引数を追加
        trajectoryOpt: TrajectoryOption | null,
        initialAngle: number,
        onDeathShotSpec: ShotSpec | null
    ) {
        // Projectileのプロパティを初期化
        this.sprite.x = x;
        this.sprite.y = y;
        this.velX = velX; 
        this.velY = velY; 
        this.lifeTime = 0;
        this.scaleOpt = scaleOpt;
        this.speedOpt = speedOpt;
        
        // 🚀 修正点: 軌道プロパティを初期化
        this.trajectoryOpt = trajectoryOpt; 
        this.initialAngle = initialAngle;
        this.trajectoryTimer = 0; // タイマーをリセット
        
        this.currentMinScale = scaleOpt?.minScale ?? 0.1;

        // Bullet固有のプロパティを初期化
        this.onDeathShotSpec = onDeathShotSpec; 

        // 初期スケール設定
        const initialScale = scaleOpt?.initial ?? 1.0;
        this.sprite.scale.set(initialScale);
        this.updateHitbox(initialScale); 
        
        // エラー修正済みの非 Null アサーション (!) を使用
        this.sprite.texture = this.entityManager.getTexture(textureKey)!; 
        
        this.active = true;
        this.sprite.visible = true;
    }

    public deactivateAndFireDeathShot() {
        // ... (ロジックは変更なし) ...
        if (!this.active) return; 

        this.active = false;
        this.sprite.visible = false;
        
        if (this.onDeathShotSpec && this.entityManager) {
            this.entityManager.fireDeathShot(
                this.x,
                this.y,
                this.onDeathShotSpec
            );
        }
    }

    public update(delta: number) {
        // Projectileのupdateを呼び出すことで、移動、スケール、軌道が処理される
        super.update(delta);
        
        // 特定のスケールまで縮小したらデスショットを発射する判定 (Bullet固有)
        if (this.active && this.scaleOpt?.mode === 'LINEAR' && this.scaleOpt.rate < 0) {
             if (this.sprite.scale.x <= (this.currentMinScale * 0.2)) {
                 this.deactivateAndFireDeathShot();
             }
        }
    }
    
    protected deactivate(): void {
        this.deactivateAndFireDeathShot();
    }
}