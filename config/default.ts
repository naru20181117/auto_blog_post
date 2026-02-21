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
