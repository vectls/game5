// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pagesに対応するため、アセットへのパスを「相対パス」に設定します。
  base: './', 
});