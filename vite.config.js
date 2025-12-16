// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // 1. パス解決: GitHub Pagesのサブディレクトリに対応するため、相対パス './' を設定
  base: './', 
  
  // 2. 出力フォルダ: GitHub Pagesで許可されている 'docs' フォルダに出力先を変更
  build: {
    outDir: 'docs',
  },
});