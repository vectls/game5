// src/entities/Projectile.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
import { 
    ScaleModes, 
    TrajectoryModes,
    type ScaleOption, 
    type SpeedOption, 
    type TrajectoryOption
} from "../types/ShotTypes"; 

/**
 * 自機弾 (Bullet) と敵弾 (EnemyBullet) に共通する
 * 弾道、速度変化、スケール変化、寿命管理を担う基底クラス。
 */
export abstract class Projectile extends GameObject {
    // 弾の移動速度 (ベクトル)
    protected velX: number = 0; 
    protected velY: number = 0; 
    
    // 弾がアクティブになってからの時間 (秒)
    protected lifeTime: number = 0; 

    // スケール変更に関するオプションと状態
    protected scaleOpt: ScaleOption | null = null;
    protected currentMinScale: number = 0.1; 

    // 速度変更 (加速度/減速度) に関するオプション
    protected speedOpt: SpeedOption | null = null; 
    
    // 🚀 軌道変更オプション
    protected trajectoryOpt: TrajectoryOption | null = null; 
    
    // 🚀 WAVE 軌道のためのタイマー（秒）
    protected trajectoryTimer: number = 0; 
    
    // 🚀 弾丸の初期角度 (WAVE計算の基点として使用)
    protected initialAngle: number = 0; 

    constructor(texture: Texture) {
        const initialScale = 1.0; 
        super(texture, texture.width * initialScale * 0.5, texture.height * initialScale * 0.5);
        this.sprite.scale.set(initialScale); 
        
        // 🛠️ 修正 1: 回転の中心をスプライトの中心に設定 (必須)
        this.sprite.anchor.set(0.5);
    }

    protected updateHitbox(scale: number): void {
        this._hitWidth = this.sprite.texture.width * scale * 0.5;
        this._hitHeight = this.sprite.texture.height * scale * 0.5;
    }

    public setTexture(texture: Texture): void {
        this.sprite.texture = texture;
        this.updateHitbox(this.sprite.scale.x);
    }
    
    protected deactivate(): void {
        this.active = false;
        this.sprite.visible = false;
    }

    // 🛠️ 修正 2: 速度ベクトルに基づいてスプライトの回転を更新する (180度ズレを修正)
    protected updateRotation(): void {
        // 速度ベクトル (velX, velY) を使って角度 (ラジアン) を計算
        const angleRad = Math.atan2(this.velY, this.velX);
        
        // 180度反転（横向き）を修正するため、+Math.PI / 2（+90度）のオフセットを適用
        this.sprite.rotation = angleRad + Math.PI / 2; 
    }
    
    // 🛠️ 修正 3: 弾道計算ロジック（三角関数を Player.ts と統一）
    protected handleTrajectory(delta: number) {
        // WAVEモードでない場合は何もしない
        if (!this.trajectoryOpt || this.trajectoryOpt.mode !== TrajectoryModes.WAVE) {
            return;
        }
        
        this.trajectoryTimer += delta;
        
        const opt = this.trajectoryOpt;
        // 現在の速度（ベクトル長）を維持するために計算
        const currentSpeed = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
        
        if (currentSpeed === 0) return;

        // サイン波 (WAVE) の計算
        const angleChange = Math.sin(this.trajectoryTimer * opt.rate) * (opt.range ?? 1);
        
        // 新しい角度を適用（初期角度 + 揺れ幅）
        const currentAngleDeg = this.initialAngle + angleChange;
        const currentAngleRad = currentAngleDeg * (Math.PI / 180);

        // 速度ベクトルを再計算: Cos for X, Sin for Y (Player.tsと統一)
        this.velX = Math.cos(currentAngleRad) * currentSpeed;
        this.velY = Math.sin(currentAngleRad) * currentSpeed;
    }

    protected handleScale(delta: number) { 
        if (!this.scaleOpt) return;
        
        const opt = this.scaleOpt;
        let newScale = this.sprite.scale.x;
        const maxScale = opt.maxScale ?? Infinity;
        
        if (opt.mode === ScaleModes.SINE) {
            const t = this.lifeTime * (opt.rate ?? 1); 
            const sineValue = (1 + Math.sin(t)) / 2;
            const range = (opt.maxScale ?? 1.5) - (opt.minScale ?? 0.5);
            newScale = (opt.minScale ?? 0.5) + sineValue * range;
        } 
        else if (opt.rate !== 0) { 
            newScale = this.sprite.scale.x + opt.rate * delta;
            if (opt.rate > 0) { 
                newScale = Math.min(maxScale, newScale);
            } else { 
                newScale = Math.max(this.currentMinScale, newScale);
            }
        }

        if (newScale !== this.sprite.scale.x) {
            this.sprite.scale.set(newScale);
            this.updateHitbox(newScale);
        }
    }

    public update(delta: number): void {
        if (!this.active) return;
        this.lifeTime += delta; 

        // 1. スケール変化の適用
        this.handleScale(delta); 
        
        // 2. 軌道変化の適用 (WAVE)
        this.handleTrajectory(delta);

        // 3. 速度変化 (加速度/減速度) の適用
        if (this.speedOpt) {
            const currentSpeed = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
            const newSpeed = currentSpeed + this.speedOpt.rate * delta;
            const finalSpeed = Math.max(0, newSpeed); 

            if (currentSpeed > 0) {
                const ratio = finalSpeed / currentSpeed;
                this.velX *= ratio;
                this.velY *= ratio;
            }
        }

        // 🚀 4. 回転の更新
        this.updateRotation();

        // 5. 位置の更新 (移動)
        this.sprite.x += this.velX * delta;
        this.sprite.y += this.velY * delta;

        // 6. 寿命による非アクティブ化
        if (this.lifeTime * 1000 > CONFIG.BULLET.LIFE_TIME_MS) {
            this.deactivate();
        }
        
        // 7. 画面外による非アクティブ化
        if (
            this.sprite.x < -CONFIG.SCREEN.MARGIN ||
            this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN ||
            this.sprite.y < -CONFIG.SCREEN.MARGIN ||
            this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN
        ) {
            this.deactivate();
        }
    }
}