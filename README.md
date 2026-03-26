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
cp .env.example .env
npm run start
```

Expo の QR コードから iOS/Android シミュレータまたは実機で起動します。
実機で Expo Go を使う場合、`apps/mobile/.env` の `EXPO_PUBLIC_API_BASE_URL` は `localhost` ではなくPCのローカルIP（例: `http://192.168.0.12:4000`）を設定してください。
Android エミュレータ利用時は、未指定の場合 `http://10.0.2.2:4000/api` をデフォルト利用します。

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

### 外部デバッグメッセージ送信（Debug画面確認用）
```bash
curl -X POST http://localhost:4000/api/debug/messages \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello from curl","source":"curl"}'
```
※ Debug系APIは `NODE_ENV=production` では無効です。

### 外部デバッグメッセージ確認（API）
```bash
curl "http://localhost:4000/api/debug/messages?limit=20"
```

### 外部デバッグメッセージ全削除（API）
```bash
curl -X DELETE "http://localhost:4000/api/debug/messages"
```
