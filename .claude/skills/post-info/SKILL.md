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
     "slug": "yyyy-mm-dd-keyword-keyword",
     "type": ["リリース"],
     "published_at": "YYYY-MM-DD",
     "body": [
       { "type": "p", "text": "概要説明" },
       { "type": "h2", "text": "見出し" },
       { "type": "p", "text": "詳細説明" }
     ],
     "metaDescription": "SEO用の説明（160文字以内）",
     "excerpt": "一覧表示用の要約（200文字以内）",
     "important": false
   }
   ```

3. **slug命名規則**
   - 形式: `YYYY-MM-DD-keyword-keyword`
   - 例: `2026-02-22-new-feature-plan-search`
   - 半角英小文字、数字、ハイフンのみ

4. **metaDescription作成**
   - 形式: `Brighty[タイプ]: [タイトルの要約]`
   - 160文字以内
   - 例: `Brightyリリース: プラン検索機能をリリースしました。コーチのプランを条件で絞り込み検索できます。`

5. **body構成**
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

6. **Contentfulに投稿**
   ```bash
   pnpm tsx scripts/publish-info.ts --file="[slug].json"
   ```

   公開も同時に行う場合:
   ```bash
   pnpm tsx scripts/publish-info.ts --file="[slug].json" --publish
   ```

7. **結果を報告**
   - Contentful URL
   - 設定したSEO項目のサマリー
   - info.brighty.site での公開URL（slug使用時）

## 例

```bash
# ユーザー入力
/post-info プラン検索機能をリリースしました

# 生成されるJSON
{
  "title": "新機能「プラン検索」がリリースされました",
  "slug": "2026-02-22-new-feature-plan-search",
  "type": ["リリース"],
  "published_at": "2026-02-22",
  "body": [
    { "type": "p", "text": "コーチのプランを条件で絞り込み検索できる「プラン検索」機能をリリースしました。" },
    { "type": "h2", "text": "主な機能" },
    { "type": "p", "text": "・カテゴリで絞り込み" },
    { "type": "p", "text": "・価格帯で絞り込み" },
    { "type": "p", "text": "・キーワード検索" }
  ],
  "metaDescription": "Brightyリリース: プラン検索機能をリリースしました。コーチのプランを条件で絞り込み検索できます。",
  "important": false
}
```
