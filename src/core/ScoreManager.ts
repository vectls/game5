// src/core/ScoreManager.ts

// 💡 PixiJSのEventEmitterをインポートする
import { EventEmitter } from "pixi.js";

export class ScoreManager extends EventEmitter{
    private score: number = 0;

    public static readonly SCORE_CHANGED_EVENT = "scoreChanged"; // イベント名

    public getScore(): number {
        return this.score;
    }

    public addScore(points: number): void {
        this.score += points;
        this.notifyScoreUpdate();
    }

    private notifyScoreUpdate() {
        console.log(`Score: ${this.score}`);
        // イベントを発火してリスナーに通知
        this.emit(ScoreManager.SCORE_CHANGED_EVENT, this.score);
    }
}
