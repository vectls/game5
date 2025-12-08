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
        // 🚀 新規追加: 扇形ショットの設定
        FAN_SHOT: {
            COUNT: 10,        // 弾丸の数
            ARC_DEGREES: 60, // 扇形の角度 (60度)
            // 🚀 【新規追加】扇形ショットの角度を波状に変化させる設定
            WAVY_ARC: {
                BASE_ARC: 30,  // 角度変動の基点となる最小角度
                AMPLITUDE: 45, // 角度変動の振幅 (最大角度は BASE_ARC + AMPLITUDE)
                PERIOD_MS: 1200, // 角度が最小から最大、最小に戻るまでの時間 (ミリ秒)
            }
        },
        // 🚀 修正: ロータリーショットの設定
        ROTARY_SHOT: {
            COUNT: 2,              // 🚀 復活: 1度に発射する弾丸の数 (8発)
            ROTATION_SPEED: 720,   // 🚀 調整: 回転速度 (180度/秒)
            SHOT_INTERVAL_MS: 15, // 🚀 調整: バースト発射に適した間隔 (100ms)
        },
        // 🚀 2. 波状ロータリーショット（KeyC）：サイン波で滑らかに方向転換
        WAVY_ROTARY_SHOT: {
            COUNT: 4,                 
            ROTATION_SPEED: 600,       
            SHOT_INTERVAL_MS: 33,      // 🚀 調整: 発射間隔を短くする (50 -> 33)
            ROTATION_CHANGE_INTERVAL_MS: 1000, // 🚀 調整: 波の半周期を長くする (750 -> 1000)
        },
        // 💡 成長ショットの設定
        GROWING_SHOT: {
            INITIAL_SCALE: 0.5, // 変更なし
            MAX_SCALE: 15.0,     // 🚀 調整: 最大サイズを大きくする (例: 2.0 -> 3.0)
            GROWTH_RATE: 3.6,   // 🚀 調整: 成長率を上げる (例: 0.5 -> 1.5)
            SHOT_INTERVAL_MS: 300, // 変更なし
        }
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
