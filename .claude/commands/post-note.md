# note記事をContentfulに投稿

noteのURLから記事を取得し、SEO最適化を行い、Contentfulに投稿します。

## 入力
- $ARGUMENTS: noteのURL (例: https://note.com/brighty/n/nce9b4a364809)

## 手順

1. **カテゴリを判断**
   記事の内容に応じて以下から選択:
   - `psychology`: 心理学・自己理解系
   - `career`: キャリア・転職系
   - `coaching-story`: コーチング体験談・創業ストーリー
   - `tips`: ノウハウ・Tips系
   - `interview`: インタビュー・コーチ紹介

2. **記事を取得**
   ```bash
   pnpm run fetch-note --url="$ARGUMENTS" --category="[選択したカテゴリ]"
   ```

3. **SEO最適化**
   生成されたJSONファイル (`articles/pending/pending-*.json`) を読み込み、以下を設定:

   **slug** (config/seo.ts参照):
   - 半角英小文字、数字、ハイフンのみ
   - 3〜5単語で記事の主題を表現
   - 検索キーワードを含める

   **excerpt** (200文字以内):
   - 読者の悩み・関心に直接訴えかける
   - 記事を読むベネフィットを明示
   - 「〜とは」で終わる説明文ではなく誘導文に

   **metaDescription** (160文字以内):
   - 検索キーワードを自然に含める
   - ターゲット読者が「自分のことだ」と思える表現

   **tags** (3〜6個):
   - 検索されやすいキーワードを選定

4. **ファイルをリネーム**
   ```bash
   mv articles/pending/pending-*.json articles/pending/[slug].json
   ```

5. **Contentfulに投稿**
   ```bash
   pnpm run publish --file="[slug].json"
   ```

6. **結果を報告**
   - Contentful URL
   - 設定したSEO項目のサマリー
