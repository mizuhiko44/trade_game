# trade_game MVP

スマホ向け対戦型トレードゲームの MVP 実装です。

## 技術スタック
- Frontend: React Native + Expo Router
- Backend: Node.js + TypeScript + Express
- DB: PostgreSQL + Prisma

## モノレポ構成
- `apps/mobile`: Expo アプリ
- `apps/server`: API サーバ
- `docs/mvp-design.md`: 設計・API・優先順位

## ローカル起動手順

### 1) PostgreSQL 起動（例: Docker）
```bash
docker run --name trade-game-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=trade_game -p 5432:5432 -d postgres:16
```

### 2) サーバ起動
```bash
cd apps/server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

- API: `http://localhost:4000`
- Health check: `GET /health`

### 3) モバイル起動
```bash
cd apps/mobile
npm install
npm run start
```

Expo の QR コードから iOS/Android シミュレータまたは実機で起動します。

## MVP でできること
- ホーム画面でユーザ情報確認
- ログインボーナス受け取り（1日1回）
- CPU戦開始（ライフポイント 30 消費）
- Buy / Sell / Hold によるターン進行
- 上下目標価格、または最大ターン到達で勝敗判定
- 勝敗に応じてコイン報酬

## API サンプル
### CPU戦開始
```bash
curl -X POST http://localhost:4000/api/matches/cpu \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo-user","botLevel":"NORMAL"}'
```

### ターン行動送信
```bash
curl -X POST http://localhost:4000/api/matches/<matchId>/actions \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo-user","actionType":"BUY","amount":100}'
```
