// src/entities/GameObject.ts
import { Sprite, Texture } from "pixi.js";
import type { Poolable } from "../core/ObjectPool";

export abstract class GameObject implements Poolable {
  public sprite: Sprite;
  public active: boolean = false;

  // 衝突判定のために位置とサイズを公開
  public get x() { return this.sprite.x; }
  public get y() { return this.sprite.y; }
  // 例: 衝突判定用の幅と高さ
  public get hitWidth() { return this.sprite.width; }
  public get hitHeight() { return this.sprite.height; }

  constructor(texture: Texture) {
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
  }

  abstract update(delta: number): void;
  abstract reset(...args: any[]): void;
}
