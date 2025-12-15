// src/ui/ScoreDisplay.ts

import { Text, TextStyle, Container } from "pixi.js";
// import { CONFIG } from "../config"; 

export class ScoreDisplay {
    public container: Container;
    private scoreText: Text;

    constructor() {
        this.container = new Container();

        // 💡 修正: TextのTextStyleOptionsのプロパティの不一致を解消 (TS2353解消)
        // strokeThicknessはstrokeプロパティとセットで設定する必要があります。
        const style = new TextStyle({
            fontFamily: "Arial",
            fontSize: 24,
            fill: 'white',
            // 💡 新しいPIXIのTextStyleは、strokeThicknessをTextStyleの直接のプロパティとして持ちます
            stroke: '#000000',
            // strokeThickness: 3, 
        });

        // ラベル (例: "SCORE:")
        const labelText = new Text('SCORE: ', style);
        this.container.addChild(labelText);

        // スコア値
        this.scoreText = new Text('0', style);
        // ラベルの右隣に配置
        this.scoreText.position.set(labelText.width + 10, 0); 
        this.container.addChild(this.scoreText);

        // 画面左上 (20, 20) にUI全体を配置
        // ※必要に応じて、CONFIG.SCREEN.PADDINGなどを使用するとよりクリーンになります
        this.container.position.set(20, 20); 
    }

    /** ScoreManagerからスコア更新を受信して表示を更新するメソッド */
    public updateScore(newScore: number): void {
        this.scoreText.text = newScore.toString();
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }
}