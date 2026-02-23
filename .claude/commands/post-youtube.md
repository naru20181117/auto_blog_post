# YouTube動画からContentfulに記事を投稿

YouTube動画のURLから字幕を取得し、ブログ記事に再構成してContentfulにドラフト投稿します。

## 動作ルール
- JSONファイルの編集は確認なしで即座に反映すること
- 「Do you want to make this edit?」などの確認質問はしない
- 字幕の「えーと」「あのー」などの口語表現は除去する
- 記事は読みやすく構造化する

## 入力
- $ARGUMENTS: YouTubeのURL (例: https://www.youtube.com/watch?v=xxxxx)

## 手順

1. **字幕とメタデータを取得**
   カテゴリは後で設定するので、まず tips で取得:
   ```bash
   pnpm run fetch-youtube --url="$ARGUMENTS" --category="tips"
   ```

2. **生成されたJSONを確認**
   `articles/pending/youtube-{videoId}.json` を読み込み、`_meta.transcript` と `_meta.videoMetadata` を確認

3. **カテゴリを判断**
   字幕の内容に応じて以下から選択:
   - `psychology`: 心理学・自己理解系
   - `career`: キャリア・転職系
   - `coaching-story`: コーチング体験談・創業ストーリー
   - `tips`: ノウハウ・Tips系
   - `interview`: インタビュー・コーチ紹介

4. **記事を再構成**
   `_meta.transcript` の字幕テキストを元に、以下のルールでブログ記事を作成:

   **body** (h2/h3/p形式):
   - 必ず h2 から始める
   - 適度に h3 で小見出しを追加
   - 動画特有の言い回し（「えーと」「今日は」「えっと」など）は除去
   - 話の流れを整理し、読みやすい段落に再構成
   - 1つの p に200〜400文字程度を目安に
   - 最後はコーチングへの興味を喚起する締めくくり

   **title** (100文字以内):
   - 動画タイトルがあればそれを参考に
   - 読者の興味を引く魅力的なタイトルに

   **slug** (半角英小文字・数字・ハイフンのみ):
   - 3〜5単語で記事の主題を表現
   - 検索キーワードを含める
   - 例: coaching-startup-career-choice

   **excerpt** (200文字以内):
   - 読者の悩み・関心に直接訴えかける
   - 記事を読むベネフィットを明示
   - 「〜とは」で終わる説明文ではなく誘導文に

   **metaDescription** (160文字以内):
   - 検索キーワードを自然に含める
   - ターゲット読者が「自分のことだ」と思える表現

   **tags** (3〜6個):
   - 検索されやすいキーワードを選定
   - カテゴリのデフォルトタグ + 記事固有のキーワード

5. **JSONファイルを更新**
   JSONファイルの全フィールドを更新（_meta以外）
   - `_meta` フィールドは削除すること（投稿時にエラーになるため）

6. **ファイルをリネーム**
   ```bash
   mv articles/pending/youtube-{videoId}.json articles/pending/{slug}.json
   ```

7. **バリデーション**
   ```bash
   pnpm run validate --file="{slug}.json"
   ```

8. **Contentfulにドラフト投稿**
   ```bash
   pnpm run publish --file="{slug}.json"
   ```

9. **結果を報告**
   - Contentful URL
   - 設定したSEO項目のサマリー
   - 元動画へのリンク

## 記事構成の参考例

```json
{
  "title": "大企業よりスタートアップを選んだ理由｜「鶏口牛後」の考え方",
  "slug": "startup-vs-big-company-career-choice",
  "category": "career",
  "excerpt": "大企業か、スタートアップか。就活で悩むあなたへ。大企業のインターンを経てスタートアップを選んだエンジニア社長が、その決断の理由と「好きを仕事にする」大切さを語ります。",
  "body": [
    { "type": "h2", "text": "大企業志望だった学生時代" },
    { "type": "p", "text": "学生の頃は、とにかく大企業に行くものだと思っていました..." },
    { "type": "h2", "text": "インターンで感じた違和感" },
    { "type": "p", "text": "..." },
    { "type": "h2", "text": "「鶏口牛後」という考え方" },
    { "type": "p", "text": "..." },
    { "type": "h2", "text": "好きなことを仕事にする" },
    { "type": "p", "text": "..." }
  ],
  "metaDescription": "大企業かスタートアップか悩む就活生へ。インターン経験から大企業を選ばなかった理由と、「好きを仕事に」の大切さを解説。",
  "ogpText": "大企業よりスタートアップを選んだ理由",
  "ctaType": "find-coach",
  "tags": ["キャリア", "就活", "スタートアップ", "コーチング", "起業"],
  "youtubeUrl": "https://www.youtube.com/watch?v=xxxxx"
}
```
