// src/core/ScoreManager.ts

import { EventEmitter } from "pixi.js";

export class ScoreManager extends EventEmitter{
    private score: number = 0;

    public static readonly SCORE_CHANGED_EVENT = "scoreChanged";

    public getScore(): number {
        return this.score;
    }

    public addScore(points: number): void {
        this.score += points;
        this.notifyScoreUpdate();
    }

    private notifyScoreUpdate() {
        // 🚀 【修正】console.logを削除
        // イベントを発火してリスナーに通知
        this.emit(ScoreManager.SCORE_CHANGED_EVENT, this.score);
    }
}