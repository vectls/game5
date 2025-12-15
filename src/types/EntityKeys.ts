// src/types/EntityKeys.ts

/**
 * EntityManagerによって管理される各種エンティティを一意に識別するためのキー
 */
export const ENTITY_KEYS = {
    BULLET: "bullet", 
    PLAYER: "player",
    ENEMY: "enemy",
    // 🚀 修正: 敵弾と爆発のキーを追加 (エラー 2339 対策)
    ENEMY_BULLET: "enemy_bullet", 
    EXPLOSION: "explosion", 
} as const;

/** ENTITY_KEYSの全ての値からなる型 */
export type ENTITY_KEYS = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];