// src/core/ObjectPool.ts
import { Container } from "pixi.js"; 

// Tのresetメソッドの引数を抽出するためのヘルパー型
type ResetArgs<T extends Poolable> = T extends { reset(...args: infer A): void } ? A : never;

// プールで管理するオブジェクトが満たすべき条件
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

  // プールからオブジェクトを取得（なければ生成）
  public get(...args: ResetArgs<T>): T {
    let obj = this.freeObjects.pop();

    if (!obj) {
      this.expand(5); // 足りなければ5個ずつ拡張
      obj = this.freeObjects.pop()!;
    }
    
    obj.active = true;
    obj.sprite.visible = true;
    
    // 🚀 【修正】冗長な型アサーションを削除
    obj.reset(...args);
    return obj;
  }

  // オブジェクトを返却（非アクティブ化）
  public release(obj: T) {
    obj.active = false;
    obj.sprite.visible = false;
    this.freeObjects.push(obj);
  }
}