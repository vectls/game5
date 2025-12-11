// src/core/ObjectPool.ts (修正後)

import { Container } from "pixi.js"; 

// 💡 修正: EntityManagerで利用するため export する
export type ResetArgs<T extends Poolable> = T extends { reset(...args: infer A): void } ? A : never;

export interface Poolable {
  active: boolean;
  sprite: Container;
  reset(...args: any[]): void; 
}

export class ObjectPool<T extends Poolable> {
  private freeObjects: T[] = [];
  private allObjects: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 10) {
    this.factory = factory;
    this.expand(initialSize);
  }

  private expand(count: number) {
    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      obj.active = false;
      obj.sprite.visible = false;
      this.freeObjects.push(obj);
      this.allObjects.push(obj);
    }
  }

  public get(...args: ResetArgs<T>): T {
    let obj = this.freeObjects.pop();

    if (!obj) {
      this.expand(5);
      obj = this.freeObjects.pop()!;
    }
    
    obj.active = true;
    obj.sprite.visible = true;
    
    obj.reset(...args);
    
    return obj;
  }
  
  public release(obj: T) {
    obj.active = false;
    obj.sprite.visible = false;
    this.freeObjects.push(obj);
  }

  // 🚀 修正箇所 1: EntityManagerで使用されている getAllObjects を追加
  public getAllObjects(): T[] {
    return this.allObjects;
  }
}