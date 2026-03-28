# 現状の設計仕様サマリ（2026-03-26）

## 1. システム構成
- **Mobile**: React Native + Expo Router
  - 画面: Home / Battle / Result / Debug
  - Battleでローソク足表示、注文方式（成行/指値）、5秒ティック更新
- **Backend**: Node.js + TypeScript + Express
  - 対戦ロジックはサーバ集中管理（CPU、価格更新、勝敗、報酬）
  - Debug API、PvPキュー、ランキングAPIを提供
- **DB**: PostgreSQL + Prisma
  - User / Match / MatchTurn / TurnAction / Item / Reward
  - 拡張用に Team / TeamMember / TeamMatch を定義

## 2. ドメイン機能（現状）
### 対戦
- CPU戦開始、ターン行動（Buy/Sell/Hold/Item）
- 価格更新: buyTotal - sellTotal の差分
- 勝敗: 目標価格到達 or 最大ターン到達

### アイテム
- PRICE_SPIKE: 価格即時ジャンプ
- SHIELD: 次ターン相手影響を軽減
- DOUBLE_FORCE: 次ターン自分影響を増幅

### PvP
- PvPキュー参加API
- 2人揃ったらPVPマッチ自動作成（現状はインメモリキュー）

### ランキング
- coins降順のランキング取得API

## 3. 運用・品質
- CI: push / PR で server(typecheck+build), mobile(typecheck)
- エラーハンドリング統一（server middleware）
- 監査ログ（試合作成、ターン解決、終了）

## 4. 制約
- WebSocketリアルタイム同期は未実装
- PvPキューはインメモリ（再起動で消える）
- 注文執行（指値/成行）は現状クライアント判定が中心
