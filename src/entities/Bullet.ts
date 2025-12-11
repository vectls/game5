// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
// 💡 修正: ScaleModes 定数と型をインポート
import { ScaleModes, type ScaleOption, type SpeedOption } from "../types/ShotTypes"; 

export class Bullet extends GameObject {
  private velX: number = 0; 
  private velY: number = 0; 
  private lifeTime: number = 0; 

  // サイズ変化用のプロパティ
  private scaleOpt: ScaleOption | null = null;
  private currentMinScale: number = 0.1; 

  // 速度変化用のプロパティ
  private speedOpt: SpeedOption | null = null; 

  constructor(texture: Texture) {
    const initialScale = 1.0; 
    super(texture, texture.width * initialScale * 0.5, texture.height * initialScale * 0.5);
    this.sprite.scale.set(initialScale); 
  }

  // 💡 新規追加: 外部からテクスチャを設定し、ヒットボックスを更新する
  public setTexture(texture: Texture): void {
      this.sprite.texture = texture;
      // 現在のスケールを維持し、新しいテクスチャのサイズに合わせてヒットボックスを更新
      this.updateHitbox(this.sprite.scale.x); 
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
    const initialScale = scaleOpt?.initial ?? 1.0;
    this.currentMinScale = scaleOpt?.minScale ?? 0.1; 
    this.sprite.scale.set(initialScale);
    
    this.velX = velX;
    this.velY = velY;

    this.updateHitbox(initialScale);
    this.sprite.rotation = Math.atan2(velY, velX) + Math.PI / 2;
  }

  private updateHitbox(newScale: number) {
    this._hitWidth = this.sprite.texture.width * newScale * 0.5;
    this._hitHeight = this.sprite.texture.height * newScale * 0.5;
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
      const maxScale = opt.maxScale ?? 1.0;

      // 💡 修正: ScaleModes.SINE 定数を使用
      if (opt.mode === ScaleModes.SINE) {
          const minScale = opt.minScale ?? 0.1;
          const range = maxScale - minScale;
          const base = minScale + range / 2;
          newScale = base + (range / 2) * Math.sin(this.lifeTime * opt.rate);
      } else { 
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