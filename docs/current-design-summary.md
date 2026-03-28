# 現状の設計仕様サマリ（2026-03-28）

## 1. システム構成
- **Mobile**: React Native + Expo Router
  - 画面: Home / Battle / Result / Debug
  - Battle: ローソク足表示 + 約定マーカー + チャートタップ操作
  - 画面内に診断情報（UI Revision / API URL / 起動ログ）を表示
- **Backend**: Node.js + TypeScript + Express
  - 対戦ロジックはサーバ集中管理（CPU、価格更新、勝敗、報酬）
  - Debug API、PvPキュー、ランキングAPIを提供
- **DB**: PostgreSQL + Prisma
  - User / Match / MatchTurn / TurnAction / Item / Reward
  - 拡張用に Team / TeamMember / TeamMatch を定義

## 2. ドメイン機能（現状）
### 対戦
- CPU戦開始、ターン行動（Buy/Sell/Hold/Item）
- 価格更新: 1ターン内で「自分行動→CPU行動」を逐次反映しOHLCを生成
- 勝敗: 目標価格到達 or 最大ターン到達
- 約定マーカーをタップしてポジション詳細確認、成行決済

### アイテム
- PRICE_SPIKE: 価格即時ジャンプ
- SHIELD: 次ターン相手影響を軽減
- DOUBLE_FORCE: 次ターン自分影響を増幅

### PvP
- PvPキュー参加API
- 2人揃ったらPVPマッチ自動作成（現状はインメモリキュー）

### ランキング
- coins降順のランキング取得API

## 3. モバイル運用・診断強化（反映済み）
- Home/Battle に UI Revision 表示
- Home/Battle に API 接続先 URL と URL決定元（env / expo-host / fallback）表示
- APIクライアントに traceId 付きリクエストログ
- Android 実行時は `localhost` / `127.0.0.1` を `10.0.2.2` 系へ補正
- Battle は `ScrollView` 化し、下部UI（約定詳細）が切れない構成

## 4. 制約
- WebSocketリアルタイム同期は未実装
- PvPキューはインメモリ（再起動で消える）
- 注文執行（指値/成行/決済）の完全サーバ権威化は未完
- 接続先推定ロジックは実行環境依存要素が残るため、運用手順の標準化が必要
