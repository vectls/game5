// src/entities/Projectile.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
import {
    ScaleModes,
    TrajectoryModes,
    type ScaleOption,
    type SpeedOption,
    type TrajectoryOption,
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

    // 🚀 新規: 回転を毎フレーム更新するかどうかを制御
    protected shouldUpdateRotation: boolean = true;

    constructor(texture: Texture) {
        const initialScale = 1.0;
        super(
            texture,
            texture.width * initialScale * 0.5,
            texture.height * initialScale * 0.5
        );
        this.sprite.scale.set(initialScale);

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

    // 🚀 修正 1: shouldUpdateRotation が true の場合に呼ばれる
    protected updateRotation(): void {
        const MIN_SPEED_SQ = 0.0001;
        if (this.velX * this.velX + this.velY * this.velY < MIN_SPEED_SQ) {
            return;
        }
        const angleRad = Math.atan2(this.velY, this.velX);
        this.sprite.rotation = angleRad + Math.PI / 2;
    }

    // 🚀 修正 2: shouldUpdateRotation の設定を追加
    protected handleTrajectory(delta: number) {
        // WAVEモードでない場合は、直線弾として扱い、以降の回転更新をスキップ
        if (
            !this.trajectoryOpt ||
            this.trajectoryOpt.mode !== TrajectoryModes.WAVE
        ) {
            this.shouldUpdateRotation = false;
            return;
        }

        // WAVE弾の場合は、毎フレーム回転を更新する
        this.shouldUpdateRotation = true;

        this.trajectoryTimer += delta;

        const opt = this.trajectoryOpt;
        const currentSpeed = Math.sqrt(
            this.velX * this.velX + this.velY * this.velY
        );

        if (currentSpeed === 0) return;

        const angleChange =
            Math.sin(this.trajectoryTimer * opt.rate) * (opt.range ?? 1);

        const currentAngleDeg = this.initialAngle + angleChange;
        const currentAngleRad = currentAngleDeg * (Math.PI / 180);

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
        } else if (opt.rate !== 0) {
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

        this.handleScale(delta);
        // 🚀 軌道処理を完全にスキップ
        // this.handleTrajectory(delta);

        // 速度変化のみ適用
        if (this.speedOpt) {
            const currentSpeed = Math.sqrt(
                this.velX * this.velX + this.velY * this.velY
            );
            const newSpeed = currentSpeed + this.speedOpt.rate * delta;
            const finalSpeed = Math.max(0, newSpeed);

            if (currentSpeed > 0) {
                const ratio = finalSpeed / currentSpeed;
                this.velX *= ratio;
                this.velY *= ratio;
            }
        }

        // 🚀 回転更新を削除
        // if (this.shouldUpdateRotation) {
        //     this.updateRotation();
        // }

        // 位置更新
        this.sprite.x += this.velX * delta;
        this.sprite.y += this.velY * delta;

        // 寿命・画面外チェック
        if (this.lifeTime * 1000 > CONFIG.BULLET.LIFE_TIME_MS) {
            this.deactivate();
        }
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
