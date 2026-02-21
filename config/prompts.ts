/**
 * AI記事生成用プロンプトテンプレート
 * YouTube動画の文字起こしから記事を生成する際に使用
 */

import { CategoryId, CATEGORIES } from "./default.js";

/**
 * 記事生成用のシステムプロンプト
 */
export const SYSTEM_PROMPT = `あなたはBrightyのブログ記事ライターです。
Brightyはコーチングプラットフォームで、コーチを探している人とコーチをマッチングするサービスです。

以下の方針で記事を執筆してください：
- 読者は「自分を変えたい」「キャリアに悩んでいる」「コーチングに興味がある」人々
- 専門用語は避け、わかりやすい日本語で書く
- 具体例やストーリーを交えて共感を得る文章にする
- 最後にコーチングへの興味を自然に喚起する締めくくりにする
- 押し売り感は出さない`;

/**
 * YouTube動画から記事を生成するプロンプト
 */
export function getArticleGenerationPrompt(params: {
  transcript: string;
  category: CategoryId;
  additionalInstructions?: string;
}): string {
  const categoryInfo = CATEGORIES[params.category];

  return `以下のYouTube動画の文字起こしをもとに、ブログ記事を作成してください。

## カテゴリ
${categoryInfo.label}（${params.category}）

## 文字起こし内容
---
${params.transcript}
---

## 出力フォーマット
以下のJSON形式で出力してください：

\`\`\`json
{
  "title": "記事タイトル（100文字以内）",
  "slug": "url-friendly-slug（半角英数字とハイフンのみ）",
  "excerpt": "記事の要約（200文字以内）",
  "body": [
    { "type": "h2", "text": "見出し" },
    { "type": "p", "text": "段落テキスト" },
    { "type": "h3", "text": "小見出し" },
    { "type": "p", "text": "段落テキスト" }
  ],
  "metaDescription": "SEO用の説明文（160文字以内）",
  "ogpText": "SNSシェア用テキスト（80文字程度）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}
\`\`\`

## 注意事項
- titleは読者の興味を引く魅力的なものに
- slugは内容を表す英語で、単語はハイフンで区切る
- bodyは必ずh2で始め、適度にh3を使って構造化する
- 文字起こしの内容を要約・再構成し、ブログ記事として読みやすくする
- 動画特有の言い回し（「えーと」「今日は」など）は除去する
${params.additionalInstructions ? `\n## 追加指示\n${params.additionalInstructions}` : ""}`;
}

/**
 * タイトル改善用プロンプト
 */
export function getTitleImprovementPrompt(originalTitle: string): string {
  return `以下のブログ記事タイトルを、よりクリック率が高くなるように改善してください。
3つの候補を提案してください。

元のタイトル: ${originalTitle}

条件：
- 100文字以内
- 数字を含めると効果的
- 読者の悩みや願望に訴えかける
- 誇張しすぎない

JSON形式で出力：
\`\`\`json
{
  "suggestions": [
    "タイトル候補1",
    "タイトル候補2",
    "タイトル候補3"
  ]
}
\`\`\``;
}

/**
 * 要約生成用プロンプト
 */
export function getExcerptPrompt(body: string): string {
  return `以下のブログ記事本文から、200文字以内の要約（excerpt）を作成してください。
一覧ページで表示されるので、読者が「続きを読みたい」と思うような文章にしてください。

本文：
---
${body}
---

要約のみを出力してください（JSON不要）。`;
}

/**
 * メタディスクリプション生成用プロンプト
 */
export function getMetaDescriptionPrompt(title: string, body: string): string {
  return `以下のブログ記事から、SEO用のメタディスクリプションを作成してください。

タイトル: ${title}

本文（冒頭）:
---
${body.slice(0, 500)}
---

条件：
- 160文字以内
- 記事の内容を簡潔に伝える
- 検索結果でクリックしたくなる文章

メタディスクリプションのみを出力してください（JSON不要）。`;
}
