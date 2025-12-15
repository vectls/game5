// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { Projectile } from "./Projectile";
import type {
    ScaleOption,
    SpeedOption,
    ShotSpec,
    TrajectoryOption,
} from "../types/ShotTypes";
import type { EntityManager } from "../core/EntityManager";
import { CONFIG } from "../config"; // CONFIGを使用するためインポート

// 💡【新規追加】FireRateSpecの内部型定義 (Bulletクラス側で時間を管理するため)
interface FireRateSpecInternal {
    shotSpec: ShotSpec;
    interval: number;
    lastFireTime: number; // 最後に発射した時刻
}

export class Bullet extends Projectile {
    private onDeathShotSpec: ShotSpec | null = null;
    private entityManager: EntityManager; // 💡【新規追加】飛行中定期的に発射する設定
    private fireRateSpec: FireRateSpecInternal | null = null;

    constructor(texture: Texture, entityManager: EntityManager) {
        super(texture);
        this.entityManager = entityManager;
    }
    /**
     * オブジェクトプールから取得する際のリセット処理。
     */

    public reset(
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string,
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null,
        trajectoryOpt: TrajectoryOption | null,
        initialAngle: number, // 💡【重要修正】shotSpec を null 許容にする (TypeError回避のため)
        shotSpec: ShotSpec | null
    ) {
        // Projectileのプロパティを初期化
        this.sprite.x = x;
        this.sprite.y = y;
        this.velX = velX;
        this.velY = velY;
        this.lifeTime = 0;
        this.scaleOpt = scaleOpt;
        this.speedOpt = speedOpt; // 軌道プロパティを初期化

        this.trajectoryOpt = trajectoryOpt;
        this.initialAngle = initialAngle;
        this.trajectoryTimer = 0; // タイマーをリセット

        this.currentMinScale = scaleOpt?.minScale ?? 0.1; // Bullet固有のプロパティを初期化 // 💡【重要修正】shotSpecが存在する場合のみプロパティを設定する

        if (shotSpec) {
            this.onDeathShotSpec = shotSpec.onDeathShot ?? null; // fireRateSpecの設定を初期化
            if (shotSpec.fireRateSpec) {
                this.fireRateSpec = {
                    shotSpec: shotSpec.fireRateSpec.shotSpec,
                    interval: shotSpec.fireRateSpec.interval,
                    lastFireTime: 0,
                };
            } else {
                this.fireRateSpec = null;
            }
        } else {
            // shotSpecがnullの場合、全てnullで初期化
            this.onDeathShotSpec = null;
            this.fireRateSpec = null;
        } // 初期スケール設定

        const initialScale = scaleOpt?.initial ?? 1.0;
        this.sprite.scale.set(initialScale);
        this.updateHitbox(initialScale); // エラー修正済みの非 Null アサーション (!) を使用

        this.sprite.texture = this.entityManager.getTexture(textureKey)!;

        this.active = true;
        this.sprite.visible = true; // Bullet.ts reset の最後に追加

        const angleRad = Math.atan2(this.velY, this.velX);
        this.sprite.rotation = angleRad + Math.PI / 2; // 以降は更新しないようにフラグを固定

        this.shouldUpdateRotation = false;
    }

    public deactivateAndFireDeathShot() {
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
        super.update(delta); // 💡【新規追加】定期発射処理

        if (this.active && this.fireRateSpec) {
            const now = performance.now();
            const spec = this.fireRateSpec;

            if (now - spec.lastFireTime >= spec.interval) {
                // 親弾の位置から子弾を発射
                this.entityManager.fireDeathShot(
                    // fireDeathShotはonDeathShotと同じく新しい弾を発射するメソッドと仮定
                    this.sprite.x,
                    this.sprite.y,
                    spec.shotSpec
                );
                spec.lastFireTime = now;
            }
        } // 特定のスケールまで縮小したらデスショットを発射する判定 (Bullet固有)
        if (
            this.active &&
            this.scaleOpt?.mode === "LINEAR" &&
            this.scaleOpt.rate < 0
        ) {
            if (this.sprite.scale.x <= this.currentMinScale * 0.2) {
                this.deactivateAndFireDeathShot();
            }
        }
    } // 💡【修正】deactivate()をオーバーライドして、画面外による非アクティブ化の際に // onDeathShotが発火するのを防ぎます。

    protected deactivate(): void {
        const outOfBounds =
            this.sprite.x < -CONFIG.SCREEN.MARGIN ||
            this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN ||
            this.sprite.y < -CONFIG.SCREEN.MARGIN ||
            this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN;

        if (outOfBounds) {
            // 画面外に出て消える場合、子弾は発射しない
            this.active = false;
            this.sprite.visible = false;
        } else {
            // 画面内で deactivate() が呼ばれた場合 (例: スケールで消滅)、既存のロジックに従い子弾を発射する
            this.deactivateAndFireDeathShot();
        }
    }
}
