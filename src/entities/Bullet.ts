// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
import type { ScaleOption, SpeedOption } from "../types/ShotTypes"; 
import { ScaleModes } from "../types/ShotTypes"; // 💡 ScaleModes定数をインポート

// 💎 弾丸設定の定数
const BULLET_CONFIG = {
    DEFAULT_SCALE: 1.0, 
    DEFAULT_MIN_SCALE: 0.1, 
    HITBOX_SCALE_FACTOR: 0.5, 
    DEACTIVATE_THRESHOLD_RATIO: 0.2, // currentMinScaleに対する非アクティブ化しきい値
    ROTATION_OFFSET: Math.PI / 2, 
} as const;


export class Bullet extends GameObject {
  private velX: number = 0; 
  private velY: number = 0; 
  private lifeTime: number = 0; 

  // サイズ変化用のプロパティ
  private scaleOpt: ScaleOption | null = null;
  private currentMinScale: number = BULLET_CONFIG.DEFAULT_MIN_SCALE; // 💡 定数化

  // 速度変化用のプロパティ
  private speedOpt: SpeedOption | null = null; 

  constructor(texture: Texture) {
    const initialScale = BULLET_CONFIG.DEFAULT_SCALE; // 💡 定数化
    super(
      texture, 
      texture.width * initialScale * BULLET_CONFIG.HITBOX_SCALE_FACTOR, // 💡 定数化
      texture.height * initialScale * BULLET_CONFIG.HITBOX_SCALE_FACTOR // 💡 定数化
    );
    this.sprite.scale.set(initialScale); 
  }

  // resetメソッド: speedOptを受け取る
  reset(
    x: number, 
    y: number, 
    velX: number, 
    velY: number, 
    scaleOpt: ScaleOption | null = null, 
    speedOpt: SpeedOption | null = null, 
  ) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.active = true; 
    this.sprite.visible = true; 
    this.lifeTime = 0; 

    this.scaleOpt = scaleOpt;
    this.speedOpt = speedOpt; 
    const initialScale = scaleOpt?.initial ?? BULLET_CONFIG.DEFAULT_SCALE; // 💡 定数化
    this.currentMinScale = scaleOpt?.minScale ?? BULLET_CONFIG.DEFAULT_MIN_SCALE; // 💡 定数化
    this.sprite.scale.set(initialScale);
    
    this.velX = velX;
    this.velY = velY;

    this.updateHitbox(initialScale);
    this.sprite.rotation = Math.atan2(velY, velX) + BULLET_CONFIG.ROTATION_OFFSET; // 💡 定数化
  }

  private updateHitbox(newScale: number) {
    this._hitWidth = this.sprite.texture.width * newScale * BULLET_CONFIG.HITBOX_SCALE_FACTOR; // 💡 定数化
    this._hitHeight = this.sprite.texture.height * newScale * BULLET_CONFIG.HITBOX_SCALE_FACTOR; // 💡 定数化
  }

  // 速度変化ロジック (handleSpeed)
  private handleSpeed(delta: number) {
      if (!this.speedOpt) return;

      const currentSpeedSq = this.velX * this.velX + this.velY * this.velY;
      if (currentSpeedSq === 0) return; 

      const currentSpeed = Math.sqrt(currentSpeedSq);
      
      // 1秒あたりの変化量 (rate) に delta を乗じて、新しい速度を計算
      let newSpeed = currentSpeed + this.speedOpt.rate * delta;
      
      if (newSpeed <= 0) {
          // 速度がゼロ以下になった場合、弾を停止/非アクティブ化
          this.active = false; 
          this.sprite.visible = false;
          return;
      }
      
      // 速度比率を計算 (新しい速度 / 現在の速度)
      const ratio = newSpeed / currentSpeed; 
      
      // 速度成分に比率を適用し、方向を維持したまま速度を更新
      this.velX *= ratio; 
      this.velY *= ratio; 
  }

  // サイズ変化ロジック (handleScale)
  private handleScale(delta: number) {
      if (!this.scaleOpt) return;
      let newScale = this.sprite.scale.x;
      const opt = this.scaleOpt;
      const maxScale = opt.maxScale ?? BULLET_CONFIG.DEFAULT_SCALE; // 💡 定数利用

      if (opt.mode === ScaleModes.SINE) { // 💡 定数化
          const minScale = opt.minScale ?? BULLET_CONFIG.DEFAULT_MIN_SCALE; // 💡 定数化
          const range = maxScale - minScale;
          const base = minScale + range / 2;
          newScale = base + (range / 2) * Math.sin(this.lifeTime * opt.rate);
      } else { // 'LINEAR' または未指定の場合
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
      
      if (newScale <= this.currentMinScale * BULLET_CONFIG.DEACTIVATE_THRESHOLD_RATIO) { // 💡 定数化
          this.active = false;
          this.sprite.visible = false;
      }
  }

  update(delta: number) {
    if (!this.active) return;
    this.lifeTime += delta; 

    this.handleScale(delta); 
    this.handleSpeed(delta); 

    // 移動処理
    this.sprite.x += this.velX * delta;
    this.sprite.y += this.velY * delta;

    // 画面外チェック (省略)
    if (
      this.sprite.x < -CONFIG.SCREEN.MARGIN ||
      this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN ||
      this.sprite.y < -CONFIG.SCREEN.MARGIN ||
      this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN
    ) {
      this.active = false;
      this.sprite.visible = false;
    }
  }
}