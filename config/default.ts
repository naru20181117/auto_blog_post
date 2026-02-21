/**
 * デフォルト設定
 * 記事生成・投稿時に使用するデフォルト値を定義
 */

// カテゴリ定義
export const CATEGORIES = {
  psychology: {
    label: "心理学",
    defaultCta: "find-coach",
    defaultTags: ["コーチング", "心理学"],
  },
  career: {
    label: "キャリア",
    defaultCta: "find-coach",
    defaultTags: ["キャリア", "キャリアコーチング"],
  },
  "coaching-story": {
    label: "体験談",
    defaultCta: "find-coach",
    defaultTags: ["コーチング", "体験談"],
  },
  tips: {
    label: "Tips",
    defaultCta: "find-coach",
    defaultTags: ["コーチング", "Tips"],
  },
  interview: {
    label: "インタビュー",
    defaultCta: "register-coach",
    defaultTags: ["コーチング", "インタビュー"],
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

// CTA タイプ
export const CTA_TYPES = {
  "find-coach": "コーチを探す",
  "register-coach": "コーチ登録",
  "free-trial": "無料体験",
} as const;

export type CtaType = keyof typeof CTA_TYPES;

// サムネイル画像設定
export const THUMBNAIL = {
  // プレースホルダー画像のベースURL
  placeholderBaseUrl: "https://placehold.co",
  // 画像サイズ
  width: 1200,
  height: 630,
  // カテゴリ別の色設定
  colors: {
    psychology: { bg: "2F5496", text: "white" },
    career: { bg: "1E8449", text: "white" },
    "coaching-story": { bg: "D35400", text: "white" },
    tips: { bg: "8E44AD", text: "white" },
    interview: { bg: "2C3E50", text: "white" },
  } as Record<CategoryId, { bg: string; text: string }>,
} as const;

/**
 * カテゴリに応じたプレースホルダー画像URLを生成
 */
export function getThumbnailUrl(category: CategoryId, text?: string): string {
  const { width, height, placeholderBaseUrl, colors } = THUMBNAIL;
  const color = colors[category] || colors.psychology;
  const displayText = encodeURIComponent(text || "Brighty Blog");
  return `${placeholderBaseUrl}/${width}x${height}/${color.bg}/${color.text}?text=${displayText}`;
}

// 記事のデフォルト値
export const ARTICLE_DEFAULTS = {
  // メタディスクリプションの最大文字数
  metaDescriptionMaxLength: 160,
  // 抜粋の最大文字数
  excerptMaxLength: 200,
  // タイトルの最大文字数
  titleMaxLength: 100,
  // デフォルトのCTA
  defaultCtaType: "find-coach" as CtaType,
} as const;

// Contentful設定（.envから読み込む値のフォールバック）
export const CONTENTFUL = {
  spaceId: process.env.CONTENTFUL_SPACE_ID || "",
  environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID || "master",
  contentTypeId: process.env.CONTENTFUL_CONTENT_TYPE_ID || "coachingBlogPost",
} as const;
