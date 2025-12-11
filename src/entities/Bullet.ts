// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
import { ScaleModes, type ScaleOption, type SpeedOption, type ShotSpec } from "../types/ShotTypes"; 
import type { EntityManager } from "../core/EntityManager"; 

export class Bullet extends GameObject {
  private velX: number = 0; 
  private velY: number = 0; 
  private lifeTime: number = 0; 

  private scaleOpt: ScaleOption | null = null;
  private currentMinScale: number = 0.1; 

  private speedOpt: SpeedOption | null = null; 
  
  private entityManager: EntityManager | null = null;
  private onDeathShotSpec: ShotSpec | null = null; 

  constructor(texture: Texture, entityManager: EntityManager) {
    const initialScale = 1.0; 
    super(texture, texture.width * initialScale * 0.5, texture.height * initialScale * 0.5);
    this.sprite.scale.set(initialScale); 
    this.entityManager = entityManager;
  }

  public setTexture(texture: Texture): void {
      this.sprite.texture = texture;
      this.updateHitbox(this.sprite.scale.x);
  }

// resetメソッドのみ修正します
  public reset(
    x: number, 
    y: number, 
    velX: number, 
    velY: number, 
    textureKey: string, 
    scaleOpt: ScaleOption | null = null, 
    speedOpt: SpeedOption | null = null,
    onDeathShotSpec: ShotSpec | null = null
  ): void {
      this.sprite.x = x;
      this.sprite.y = y;
      this.active = true;
      this.sprite.visible = true;
      this.lifeTime = 0;

      // 速度の初期化
      this.velX = velX;
      this.velY = velY;
      
      // 🚀 修正: 進行方向（速度ベクトル）に合わせて画像を回転させる
      // Math.atan2(y, x) でラジアン角を取得し、画像が上向き( -90度 )の素材である場合の補正 (+90度 = +PI/2) を加える
      // ※ 素材の向きによって + Math.PI / 2 の有無や値を調整してください
      this.sprite.rotation = Math.atan2(velY, velX) + Math.PI / 2;

      // オプションの初期化
      this.scaleOpt = scaleOpt;
      this.speedOpt = speedOpt;
      this.onDeathShotSpec = onDeathShotSpec;

      // テクスチャの更新
      if (this.entityManager && typeof (this.entityManager as any).getTexture === 'function') {
           const newTexture = (this.entityManager as any).getTexture(textureKey);
           if (newTexture) this.setTexture(newTexture);
      }

      // スケールの初期化
      const initialScale = scaleOpt?.initial ?? 1.0;
      this.sprite.scale.set(initialScale);
      this.updateHitbox(initialScale);
      this.currentMinScale = scaleOpt?.minScale ?? 0.1; 
  }

  private updateHitbox(scale: number): void {
      this._hitWidth = this.sprite.texture.width * scale * 0.5;
      this._hitHeight = this.sprite.texture.height * scale * 0.5;
  }

  private handleScale(delta: number) { 
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
      
      if (newScale <= this.currentMinScale * 0.2) { 
          this.deactivateAndFireDeathShot(); 
      }
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
    if (!this.active) return;
    this.lifeTime += delta; 

    this.handleScale(delta); 

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

    this.sprite.x += this.velX * delta;
    this.sprite.y += this.velY * delta;

    if (this.lifeTime * 1000 > CONFIG.BULLET.LIFE_TIME_MS) {
        this.deactivateAndFireDeathShot();
    }
    
    if (
        this.sprite.x < -CONFIG.SCREEN.MARGIN ||
        this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN ||
        this.sprite.y < -CONFIG.SCREEN.MARGIN ||
        this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN
    ) {
        this.deactivateAndFireDeathShot();
    }
  }
}