// src/utils/CollisionUtils.ts (P2 適用)

// 🚀 P1で定義したColliderインターフェースをインポートする
import type { Collider } from "../entities/GameObject"; 

/**
 * 2つのGameObjectのAABB（軸並行境界ボックス）衝突をチェックする。
 * @param objA 衝突判定を行うGameObject A
 * @param objB 衝突判定を行うGameObject B
 * @returns 衝突している場合は true
 */
// 🚀 変更点: 引数をColliderインターフェースに変更
export function checkAABBCollision(objA: Collider, objB: Collider): boolean {
    // 🚀 変更点: top, bottom, left, right ゲッターを使用して境界線比較を行うロジックに
    return (
        objA.left < objB.right &&
        objA.right > objB.left &&
        objA.top < objB.bottom &&
        objA.bottom > objB.top
    );
}