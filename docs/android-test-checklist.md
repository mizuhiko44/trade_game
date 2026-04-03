# Android実機テスト チェックリスト（Expo）

このドキュメントは `apps/mobile` を Android 実機で検証するときの最短手順と、`NETWORK_ERROR: request failed` が出たときの切り分け手順をまとめたものです。

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

### 5分でできる確認手順

1. PC で `curl http://localhost:4000/health` が通るか確認
2. スマホブラウザで `http://<PCのLAN_IP>:4000/health` を開けるか確認
3. 開けない場合はネットワーク/ファイアウォール問題
4. 開けるのにアプリだけ失敗する場合は `.env` と Metro キャッシュを再確認

## 7. 完了条件（Definition of Done）

- [ ] Android 実機でホーム画面が表示される
- [ ] API 呼び出し時に `NETWORK_ERROR` が発生しない
- [ ] CPU 戦開始まで進める
- [ ] 再起動後も同じ手順で再現可能
