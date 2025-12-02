// src/entities/GameObject.ts
import { Sprite, Texture } from "pixi.js";
import type { Poolable } from "../core/ObjectPool";

export abstract class GameObject implements Poolable {
  public sprite: Sprite;
  public active: boolean = false;

  constructor(texture: Texture) {
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
  }

  abstract update(delta: number): void;
  abstract reset(...args: any[]): void;

  // 衝突判定
  public collidesWith(other: GameObject): boolean {
    if (!this.active || !other.active) return false;
    
    const a = this.sprite.getBounds();
    const b = other.sprite.getBounds();
    
    return (
      a.x + a.width > b.x &&
      a.x < b.x + b.width &&
      a.y + a.height > b.y &&
      a.y < b.y + b.height
    );
  }
}
