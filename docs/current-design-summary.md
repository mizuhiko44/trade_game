# 現状の設計仕様サマリ（2026-03-28）

## 1. システム構成
- **Mobile**: React Native + Expo Router
  - 画面: Home / Battle / Result / Debug
  - Battle: ローソク足表示 + 約定マーカー + チャートタップ注文 + 約定一覧テーブル
  - 画面下部に診断情報（API URL / URL決定元 / UI Revision / autoStartログ）
- **Backend**: Node.js + TypeScript + Express
  - 対戦ロジックはサーバ集中管理（CPU、価格更新、勝敗、報酬）
  - Debug API、PvPキュー、ランキングAPIを提供
- **DB**: PostgreSQL + Prisma
  - User / Match / MatchTurn / TurnAction / Item / Reward
  - 拡張用に Team / TeamMember / TeamMatch を定義

## 2. バトル仕様（現在）
### ターン / ローソク足
- 1本のローソク足につき **3サブターン**（1/3, 2/3, 3/3）
- サブターン完了ごとに同一ローソク足の OHLC を更新
- マッチ最大ターン数: **5ターン**

### 注文 / 決済
- チャートタップで注文アクション（Buy/Sell/Hold）
- 約定一覧テーブルで個別決済（成行）
- 「オール決済」でOPENポジションを一括成行決済
- 決済時の損益表示あり

### ロット
- デフォルト上限: **1000**
- UIは横スクロール選択（50刻み）
- 将来拡張: アバターレベルに応じた上限加算フックあり

### 勝敗 / 損益表示
- 画面上で BUY/SELL 合計損益を表示
- アバター行で 自分/相手 の損益を表示
- 対戦終了時はアバター行に WIN/LOSE/DRAW を表示

## 3. ネットワーク運用（現在）
- API URL を実行環境に応じて解決（env > expo-host > fallback）
- Android では loopback（localhost/127.0.0.1）を 10.0.2.2 系へ補正
- APIクライアントに traceId 付きログ出力

## 4. 制約
- WebSocketリアルタイム同期は未実装
- PvPキューはインメモリ（再起動で消える）
- 注文執行（指値/成行/決済）の完全サーバ権威化は未完
- ロット上限のレベルアップ連動はフロントの拡張フックのみ（サーバ実装未着手）
