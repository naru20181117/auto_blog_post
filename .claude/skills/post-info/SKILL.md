---
name: post-info
description: Brighty Infoにお知らせ/リリースノートを投稿
allowed-tools: Bash(pnpm run publish:info:*), Bash(pnpm tsx scripts/publish-info.ts:*), Read, Edit, Write
---

# Brighty Infoにお知らせ/リリースノートを投稿

info.brighty.site にお知らせやリリースノートを投稿します。

## 動作ルール
- JSONファイルの編集は確認なしで即座に反映すること
- 「Do you want to make this edit?」などの確認質問はしない
- サービス名は「ブライティー」とカタカナで表記（「Brighty」は使用しない）

## 入力
- $ARGUMENTS: お知らせの内容（タイトルや概要）

## 手順

1. **タイプを判断**
   内容に応じて以下から選択:
   - `リリース`: 新機能・機能改善・アップデート
   - `お知らせ`: 運営からの告知・キャンペーン・重要なお知らせ

2. **JSONファイルを作成**
   `info/pending/` に以下の形式でJSONファイルを作成:

   ```json
   {
     "title": "機能名やお知らせのタイトル",
     "slug": "keyword-keyword",
     "type": ["リリース"],
     "published_at": "YYYY-MM-DD",
     "body": [
       { "type": "p", "text": "概要説明" },
       { "type": "h2", "text": "見出し" },
       { "type": "p", "text": "詳細説明" }
     ],
     "metaDescription": "SEO用の説明（160文字以内）",
     "excerpt": "一覧表示用の要約（200文字以内）",
     "tags": ["新機能"],
     "important": false
   }
   ```

3. **slug命名規則**
   - 形式: `keyword-keyword`（日付は不要）
   - 例: `plan-search-release`, `footprint-update`
   - 半角英小文字、数字、ハイフンのみ
   - 3〜5単語程度

4. **tags（必須）**
   以下から選択（複数可）:
   - 新機能, UI改善, 検索機能, カレンダー連携, 通知機能
   - プロフィール, メッセージ, セッション管理, クライアント管理
   - AI機能, SNS連携, 決済・換金, キャンペーン, お知らせ
   - プラン機能, ダッシュボード, 外部連携, モニター募集

5. **metaDescription作成**
   - 形式: `ブライティー[タイプ]: [タイトルの要約]`
   - 160文字以内
   - 例: `ブライティーリリース: プラン検索機能をリリースしました。コーチのプランを条件で絞り込み検索できます。`

6. **body構成**
   - `p`: 段落
   - `h2`: 大見出し
   - `h3`: 小見出し
   - リンクを含める場合:
     ```json
     {
       "type": "p",
       "text": "",
       "segments": [
         { "text": "詳細は" },
         { "text": "こちら", "link": { "url": "https://..." } },
         { "text": "をご覧ください。" }
       ]
     }
     ```

7. **Contentfulに投稿（下書き）**
   ```bash
   pnpm tsx scripts/publish-info.ts --file="[slug].json"
   ```

   ※ デフォルトは下書き状態。ユーザー確認後に公開を依頼された場合のみ:
   ```bash
   pnpm tsx scripts/publish-info.ts --file="[slug].json" --publish
   ```

8. **結果を報告**
   - Contentful URL
   - 設定したSEO項目のサマリー
   - info.brighty.site での公開URL（slug使用時）

9. **SNS投稿文を生成・提示**
   `config/sns.ts` のガイドラインに従い、X/Threads用の投稿文を生成して提示する。

   **ガイドライン要点:**
   - 記事の焦点を1〜2点に絞る（全部盛り込まない）
   - 箇条書きで簡潔に
   - ユーザー視点のベネフィットを明示
   - ハッシュタグ `#コーチング` を付ける
   - リンクはリプライで貼るため、メイン投稿には含めない

   **提示フォーマット:**
   ```
   📱 SNS投稿文（メイン）
   ─────────────────────────────
   {投稿文}

   #コーチング
   ─────────────────────────────

   📎 リプライ用
   ─────────────────────────────
   詳しくはこちら👇
   {公開URL}
   ─────────────────────────────

   ※ 画像/動画を追加して投稿してください
   ```

## 例

```bash
# ユーザー入力
/post-info プラン検索機能をリリースしました

# 生成されるJSON
{
  "title": "新機能「プラン検索」がリリースされました",
  "slug": "plan-search-release",
  "type": ["リリース"],
  "published_at": "2026-02-22",
  "body": [
    { "type": "p", "text": "コーチのプランを条件で絞り込み検索できる「プラン検索」機能をリリースしました。" },
    { "type": "h2", "text": "主な機能" },
    { "type": "p", "text": "・カテゴリで絞り込み" },
    { "type": "p", "text": "・価格帯で絞り込み" },
    { "type": "p", "text": "・キーワード検索" }
  ],
  "metaDescription": "ブライティーリリース: プラン検索機能をリリースしました。コーチのプランを条件で絞り込み検索できます。",
  "tags": ["新機能", "検索機能", "プラン機能"],
  "important": false
}
```
