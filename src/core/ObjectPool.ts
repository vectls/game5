// src/core/ObjectPool.ts
import { Container } from "pixi.js";

// プールで管理するオブジェクトが満たすべき条件
export interface Poolable {
  active: boolean;
  sprite: Container;
  reset(...args: any[]): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 10) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      const obj = this.createObject();
      this.pool.push(obj);
    }
  }

  private createObject(): T {
    const obj = this.factory();
    obj.active = false;
    obj.sprite.visible = false;
    return obj;
  }

  // プールからオブジェクトを取得（なければ生成）
  public get(...args: any[]): T {
    let obj = this.pool.find((p) => !p.active);
    if (!obj) {
      obj = this.createObject();
      this.pool.push(obj);
    }
    
    obj.active = true;
    obj.sprite.visible = true;
    obj.reset(...args);
    return obj;
  }

  // オブジェクトを返却（非アクティブ化）
  public release(obj: T) {
    obj.active = false;
    obj.sprite.visible = false;
  }
}
