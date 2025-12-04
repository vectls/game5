// src/entities/Explosion.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Explosion extends GameObject {
  private _lifeTimeMs = 0; // 残り表示時間 (ms)

  constructor(texture: Texture) {
    super(texture,0,0);
    this.sprite.scale.set(0.5); // 適切なサイズに調整

    // Explosionのヒットボックスをスケールに合わせて調整
    this._hitWidth = texture.width * 0.5;
    this._hitHeight = texture.height * 0.5;
  }

  reset(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
    this._lifeTimeMs = CONFIG.EXPLOSION.LIFETIME_MS;
  }

  update(delta: number) {
    if (!this.active) return;
    
    // deltaは秒なので、ミリ秒(ticker.deltaMS)で計算するために秒をミリ秒に戻す
    const deltaMS = delta * 1000;
    this._lifeTimeMs -= deltaMS;
    
    // ライフタイムがゼロになったら非アクティブ化
    if (this._lifeTimeMs <= 0) {
      this.active = false;
    }
  }
}