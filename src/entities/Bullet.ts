// src/entities/Bullet.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Bullet extends GameObject {
  constructor(texture: Texture) {
    super(texture);
  }

  reset(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  update(delta: number) {
    if (!this.active) return;
    
    this.sprite.y -= CONFIG.BULLET.SPEED * delta;
    
    // 画面上部のマージンを超えたら非アクティブ化
    if (this.sprite.y < -CONFIG.SCREEN.MARGIN) {
      this.active = false;
    }
  }
}
