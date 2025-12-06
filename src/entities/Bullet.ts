// src/entities/Bullet.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Bullet extends GameObject {
  private velX: number = 0; // 🚀 追加：X方向の速度
  private velY: number = 0; // 🚀 追加：Y方向の速度

  constructor(texture: Texture) {
    super(texture, texture.width * 0.5, texture.height * 0.5);
  }

  // 🚀 修正: 速度(X, Y)を受け取るようにresetメソッドを拡張
  reset(x: number, y: number, velX: number, velY: number) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.velX = velX;
    this.velY = velY;
    this.active = true; // resetされたらアクティブにする
    this.sprite.visible = true; // resetされたら可視化する
    
    // 弾丸の向きを速度ベクトルに合わせて設定
    // Math.atan2(y, x) はラジアンを返す
    // Math.PI / 2 (90度)を足すのは、通常Spriteが上向きに描画されていることを想定
    this.sprite.rotation = Math.atan2(velY, velX) + Math.PI / 2;
  }

  update(delta: number) {
    if (!this.active) return;
    
    // 🚀 修正: 速度ベクトルに基づいて移動する
    this.sprite.x += this.velX * delta;
    this.sprite.y += this.velY * delta;
    
    // 画面外チェック (上下左右)
    if (
        this.sprite.y < -CONFIG.SCREEN.MARGIN || 
        this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN ||
        this.sprite.x < -CONFIG.SCREEN.MARGIN ||
        this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN
    ) {
      this.active = false;
    }
  }
}