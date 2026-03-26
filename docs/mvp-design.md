# 対戦型トレードゲーム MVP 設計

## 1. システム構成（MVP）
- **Mobile App (React Native + Expo)**
  - ホーム / 対戦 / 結果画面
  - REST API 呼び出し
- **Game API (Node.js + TypeScript + Express)**
  - 対戦作成、ターン処理、勝敗判定、報酬配布
  - 対戦ロジックはサーバ側で一元管理
- **DB (PostgreSQL + Prisma)**
  - ユーザ、対戦、ターン、行動履歴、アイテム在庫、報酬

### 将来拡張ポイント
- PvP リアルタイム化: WebSocket 導入
- 団体戦: `Team`, `TeamMember`, `TeamMatch` 追加
- ランキング: 日次/週次の集計テーブル
- バランス調整: `GameBalanceConfig` テーブル化

## 2. MVP ゲームパラメータ
- 初期資金: 1000
- 初期価格: 100
- 上側目標価格: 110
- 下側目標価格: 90
- 最大ターン数: 10
- 1ターン投入上限: 300
- CPU: Easy / Normal / Hard
- アイテム: 3種類（Price Spike, Shield, Double Force）
- 1試合消費LP: 30
- ログインボーナス: 150 LP

## 3. API 一覧（MVP）
- `GET /api/home?userId=...`
  - ユーザ情報、ライフ、所持アイテム
- `POST /api/login-bonus`
  - 当日未受取なら +150 LP
- `POST /api/matches/cpu`
  - CPU戦開始（LP 30消費）
- `GET /api/matches/:matchId`
  - 対戦の現状態とローソク足履歴
- `POST /api/matches/:matchId/actions`
  - プレイヤー行動送信（Buy/Sell/Hold/Item）
  - サーバ側で CPU 行動も決定し、価格更新・勝敗判定

## 4. 画面一覧（MVP）
- **ホーム画面**
  - ユーザ名 / アバター / LP / ボーナス受取 / 対戦開始
- **対戦画面**
  - 価格、目標価格、ターン数、行動ボタン（Buy/Sell/Hold）
  - MVP では簡易表示（次段階でチャート実装）
- **結果画面**
  - 勝敗、最終価格、報酬、再戦導線

## 5. ディレクトリ構成
```
apps/
  mobile/
    app/
    services/
    constants/
  server/
    prisma/
    src/
      config/
      controllers/
      routes/
      services/
docs/
  mvp-design.md
```

## 6. 実装優先順位
1. Prisma スキーマ + DB マイグレーション
2. 対戦開始API + ターン解決ロジック
3. 勝敗判定・報酬配布・LP消費/付与
4. Mobile: ホーム → 対戦 → 結果の最短導線
5. アイテム効果（3種中まず Price Spike 有効化）
6. PvP マッチング（次フェーズ）
