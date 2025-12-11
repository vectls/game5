// src/entities/Explosion.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Explosion extends GameObject {
  private _lifeTimeMs = 0; 

  constructor(texture: Texture) {
    super(texture,0,0);
    this.sprite.scale.set(0.5); 

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
    
    const deltaMS = delta * 1000;
    this._lifeTimeMs -= deltaMS;
    
    if (this._lifeTimeMs <= 0) {
      this.active = false;
    }
  }
}