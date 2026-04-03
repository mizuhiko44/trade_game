# Android実機テスト チェックリスト（Expo）

このドキュメントは `apps/mobile` を Android 実機で検証するときの最短手順と、`NETWORK_ERROR: request failed` が出たときの原因推定・対策をまとめたものです。

## 1. 事前条件

- [ ] Android スマホに **Expo Go** をインストール済み
- [ ] PC とスマホが同じ Wi-Fi（社内/学校 Wi-Fi の隔離設定がある場合は注意）
- [ ] VPN / Proxy を一時的に OFF

## 2. サーバ起動チェック

```bash
cd apps/server
npm run dev
```

別ターミナルでヘルスチェック:

```bash
curl http://localhost:4000/health
```

- [ ] `{"ok":true}` が返る

## 3. 実機用 API URL 設定

`apps/mobile/.env` を編集:

```env
EXPO_PUBLIC_API_BASE_URL=http://<PCのLAN_IP>:4000
```

例:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.12:4000
```

> 実機で `localhost` は使わない（端末自身を指してしまうため）。

## 4. モバイル起動（キャッシュクリア）

```bash
cd apps/mobile
npm run start:clear
```

- [ ] Expo Go 内のスキャナで QR を読む（標準カメラではなく）
- [ ] 接続できない場合は Expo 接続モードを `Tunnel` に切り替えて再試行
- [ ] Metroポートが `8881` ではなく `8882` になっても問題なし（Expo開発サーバのポートであり、APIポート `4000` とは別）

## 5. 依存関係の整合チェック（SDK更新後）

```bash
cd apps/mobile
npm ls react react-dom react-native expo --all
npx expo-doctor --verbose
```

- [ ] `invalid` / `ELSPROBLEMS` が出ない

必要に応じて補正:

```bash
cd apps/mobile
npx expo install --fix
npm install
```

## 6. `NETWORK_ERROR: request failed` の原因推定と切り分け

`apps/mobile/services/api.ts` は通信失敗時に `NETWORK_ERROR: ... (url=...)` を投げます。まず URL をログで確認してください。

### よくある原因（優先度順）

1. **API の向き先が誤り**
   - `EXPO_PUBLIC_API_BASE_URL` が `localhost` のまま
   - PostgreSQL ポート `5432` を指定してしまっている（APIは `4000`）
   - 端末から到達できない IP / ポートになっている

2. **サーバ未起動 / 起動ポート違い**
   - `apps/server` が起動していない
   - `PORT` を変更していて 4000 で待ち受けていない

3. **ネットワーク遮断**
   - PC 側ファイアウォールが 4000 を遮断
   - Wi-Fi のクライアント分離で端末→PC が到達不可
   - VPN / セキュリティソフトの通信制限

4. **キャッシュ残り**
   - `.env` 修正後に Metro を再起動していない

### 実装仕様ベースの重要ポイント（このプロジェクト固有）

- `EXPO_PUBLIC_API_BASE_URL` が未設定または不正だと、Android は `http://10.0.2.2:4000/api` をフォールバックに使います。これは**エミュレータ向け**なので、実機では到達不能です。
- `localhost` / `127.0.0.1` が設定されている場合、ランタイムでURL書き換えが走りますが、最終的に実機から到達できるURLになっているかはログで要確認です。
- API呼び出し時に `[API] ...` ログが出るので、`network_error` ログに含まれる `url=...` がそのまま原因特定の手掛かりになります。

### 症状別の推定原因と対策

| 症状 | 推定原因 | 対策 |
|---|---|---|
| `localhost:5432` に届かないエラー | DBポートをAPI URLに設定している | `.env` の `EXPO_PUBLIC_API_BASE_URL` を `http://<PC_IP>:4000` に修正 |
| APIレスポンスが `DB_UNREACHABLE` / `Can't reach database server at localhost:5432` | APIサーバからPostgreSQLへ接続できない | PostgreSQL起動、`apps/server/.env` の `DATABASE_URL` を確認、`npx prisma migrate dev` と `npm run seed` を再実行 |
| どのAPIも即 `NETWORK_ERROR` | URL向き先誤り（`localhost` / `10.0.2.2` / 別IP） | `.env` を PC LAN IP にし、`npm run start:clear` で再起動 |
| PCの `curl localhost:4000/health` は成功、実機だけ失敗 | 端末→PC通信が遮断 | スマホブラウザで `http://<PC_IP>:4000/health` を確認。失敗ならFW/VPN/Wi-Fi分離を疑う |
| Expo Goでは起動するがAPIだけ失敗 | `.env`変更が反映されていない | Metro再起動（`start:clear`）と Expo Go 再起動 |
| ときどき失敗する | ネットワーク品質 / 省電力でWi-Fi切替 | テスト中は同一Wi-Fi固定・省電力OFF・5GHz/2.4GHzの切替抑制 |
| `Unable to activate keep awake` が出る | Expoランタイム側の keep-awake 失敗（環境依存） | Expo Go再起動/端末再起動。ログノイズ化を防ぐためアプリ側でこの警告を無視 |

### 5分でできる確認手順

1. PC で `curl http://localhost:4000/health` が通るか確認
2. スマホブラウザで `http://<PCのLAN_IP>:4000/health` を開けるか確認
3. APIエラー本文に `DB_UNREACHABLE` が出る場合、`apps/server` でDB接続を確認（Postgres起動・`DATABASE_URL`）
4. 開けない場合はネットワーク/ファイアウォール問題
5. 開けるのにアプリだけ失敗する場合は `.env` と Metro キャッシュを再確認
6. Metroログの `NETWORK_ERROR ... (url=...)` を確認し、実際に叩いているURLが期待通りか確認

### 追加の実践対策（Android実機向け）

- PCのファイアウォールで TCP `4000` を許可
- セキュリティソフトのネットワーク保護機能を一時的に無効化して再確認
- 社内/学校Wi-Fiの場合は `Tunnel` 接続を優先
- 可能ならサーバ起動を `HOST=0.0.0.0` で固定（環境依存の待受制約を回避）
- 端末ログで `[API] base_url_resolved` を確認し、`API_BASE_URL` が `:4000/api` になっていることを確認

## 7. 完了条件（Definition of Done）

- [ ] Android 実機でホーム画面が表示される
- [ ] API 呼び出し時に `NETWORK_ERROR` が発生しない
- [ ] CPU 戦開始まで進める
- [ ] 再起動後も同じ手順で再現可能
