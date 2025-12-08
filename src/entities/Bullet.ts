// src/entities/Bullet.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Bullet extends GameObject {
  private velX: number = 0; 
  private velY: number = 0; 

  // 💡 【プロパティ】成長ショット用のプロパティを保持
  private growthRate: number = 0;   
  private maxScale: number = 1.0;   

  constructor(texture: Texture) {
    // 💡 【コンストラクタ】初期スケールを適用
    const initialScale = CONFIG.PLAYER.GROWING_SHOT?.INITIAL_SCALE || 0.5; 
    super(texture, texture.width * initialScale * 0.5, texture.height * initialScale * 0.5);
    this.sprite.scale.set(initialScale); 
  }

  // 🚀 【reset】成長用の引数 (growthRate, maxScale) を追加
  reset(x: number, y: number, velX: number, velY: number, growthRate: number = 0, maxScale: number = 1.0) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.velX = velX;
    this.velY = velY;
    this.active = true; 
    this.sprite.visible = true; 

    // 💡 成長パラメータを保存
    this.growthRate = growthRate;
    this.maxScale = maxScale;

    // 💡 成長ショットの場合、初期スケールに戻す
    const scale = this.growthRate > 0 ? CONFIG.PLAYER.GROWING_SHOT.INITIAL_SCALE || 0.5 : 1.0;
    this.sprite.scale.set(scale);
    
    // ヒットボックスをスケールに合わせて更新
    this._hitWidth = this.sprite.texture.width * scale * 0.5;
    this._hitHeight = this.sprite.texture.height * scale * 0.5;
    
    this.sprite.rotation = Math.atan2(velY, velX) + Math.PI / 2;
  }

  update(delta: number) {
    if (!this.active) return;

    // 💡 【update】サイズ成長ロジック (deltaを使用)
    if (this.growthRate > 0) {
        let currentScale = this.sprite.scale.x;
        // 1秒あたり growthRate の割合でスケール増加
        const newScale = Math.min(this.maxScale, currentScale + this.growthRate * delta);

        if (newScale !== currentScale) {
            this.sprite.scale.set(newScale);
            // ヒットボックスのサイズも更新
            this._hitWidth = this.sprite.texture.width * newScale * 0.5;
            this._hitHeight = this.sprite.texture.height * newScale * 0.5;
        }
    }

    // 移動処理
    this.sprite.x += this.velX * delta;
    this.sprite.y += this.velY * delta;

    // 画面外チェック (既存)
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