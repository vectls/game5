// src/config.ts
export const CONFIG = {
    SCREEN: {
        WIDTH: 800,
        HEIGHT: 600,
        BG_COLOR: 0x000000,
        MARGIN: 50, // 画面外判定のマージン（スポーン/デスポーン用）
    },
    ASSETS: {
        SHEET: "sprites/sheet.json",
        TEXTURES: {
            PLAYER: "playerShip1_blue.png",
            BULLET: "laserBlue07.png",
            ENEMY: "enemyBlack5.png",
            EXPLOSION: "meteorGrey_big1.png",
            ENEMY_BULLET: "laserRed07.png",
        },
    },
    PLAYER: {
        SPEED: 300,
        SHOT_INTERVAL_MS: 150,
        INITIAL_X_RATIO: 0.5, // 画面幅に対する比率 (0.5 = 中央)
        INITIAL_Y: 500, // 初期Y座標
        BULLET_OFFSET_Y: 20, // 機体から弾が出る位置のオフセット
    },
    BULLET: {
        SPEED: 600,
        POOL_SIZE: 30, // 同時に出せる弾の上限数
    },
    ENEMY: {
        SPEED: 120,
        SPAWN_INTERVAL_MS: 2000,
        POOL_SIZE: 10, // 同時に出せる敵の上限数
        SCORE_VALUE: 100,
        INITIAL_Y: 50,
        FIRE_RATE_MS: 1500, // 👈 【追加】敵の発射間隔 (ms)
    },
    EXPLOSION: {
        // 🚀 新規追加
        LIFETIME_MS: 300, // 爆発の表示時間（ミリ秒）
        POOL_SIZE: 15,
    },
    ENEMY_BULLET: {
        WIDTH: 10,
        HEIGHT: 20,
        SPEED: 400, // 敵弾の速度 (PlayerBulletより速くても良い)
        POOL_SIZE: 50,
    },
    INPUT: {
        MOVE_LEFT: "ArrowLeft",
        MOVE_RIGHT: "ArrowRight",
        SHOOT: "Space",
    },
} as const;
