# 残課題バックログ（優先度 x 重要度）

| ID | 課題 | 優先度 | 重要度 | 状態 |
|---|---|---|---|---|
| TG-001 | WebSocketリアルタイム同期（PvP/観戦） | P0 | High | TODO |
| TG-002 | PvPキュー永続化（Redis/DB） | P0 | High | TODO |
| TG-003 | 指値/成行/決済のサーバ権威化 | P0 | High | TODO |
| TG-004 | API統合テスト（home/cpu/actions/pvp） | P1 | High | TODO |
| TG-005 | レーティング計算 + ランキング日次集計 | P1 | Medium | TODO |
| TG-006 | 団体戦API（TeamMatch作成/進行） | P1 | Medium | TODO |
| TG-007 | 不正対策（リクエスト署名・レート制限） | P1 | Medium | TODO |
| TG-010 | 接続先自己診断フロー（環境別接続テスト/ガイド） | P1 | Medium | TODO |
| TG-011 | ロット上限のアバターレベル連動（server+mobile） | P1 | Medium | TODO |
| TG-008 | チャート描画最適化（大量ターン対応） | P2 | Medium | TODO |
| TG-009 | Debug API の管理UI化/運用権限制御 | P2 | Low | TODO |

## 直近サマリ（2026-04-04 時点）

### 進捗
- Android 実機で「ライフ取得」「ログインボーナス」「CPU戦開始」までの主要導線は動作確認済み。
- 接続/DBトラブル時の診断導線（`/health/db`、エラーコード、チェックリスト）を整備済み。

### 残課題（優先順）
1. **P0: 対戦基盤の本番耐性**
   - TG-001 WebSocketリアルタイム同期
   - TG-002 PvPキュー永続化
   - TG-003 注文処理のサーバ権威化
2. **P1: 品質担保**
   - TG-004 主要API統合テストの自動化
   - TG-010 接続先自己診断フロー
3. **P1: ゲーム拡張**
   - TG-011 ロット上限のレベル連動
   - TG-005 レーティング計算 + 日次集計
