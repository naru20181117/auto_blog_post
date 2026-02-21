/**
 * Cloudinaryを使ったサムネイル画像生成ユーティリティ
 */

const CLOUDINARY_CLOUD_NAME = "dwqlqq6py";

// カテゴリー別の背景画像
const BACKGROUND_IMAGES = {
  // 強めの印象（行動・決断・変革）
  strong: "public/Brighty_blog_background",
  // 柔らかめ（内省・学び・対話）
  soft: "public/brighty_background_blog_image",
};

// カテゴリーの型定義
export type Category = "psychology" | "career" | "coaching-story" | "tips" | "interview";

type ThemeStyle = {
  background: string;
  textColor: string;
  shadowColor: string;
};

const getThemeStyle = (category: Category): ThemeStyle => {
  switch (category) {
    case "career":
    case "coaching-story":
      // 強めの背景（暗い）→ 白文字 + 黒い影
      return {
        background: BACKGROUND_IMAGES.strong,
        textColor: "white",
        shadowColor: "black",
      };
    case "psychology":
    case "tips":
    case "interview":
    default:
      // 柔らかめの背景（明るい）→ 黒文字 + 白い影
      return {
        background: BACKGROUND_IMAGES.soft,
        textColor: "black",
        shadowColor: "white",
      };
  }
};

/**
 * 適切な改行位置を見つける（句読点、助詞などで区切る）
 */
const findBreakPoint = (text: string, maxLength: number): number => {
  if (text.length <= maxLength) return -1;

  // 優先的に区切りたい文字（句読点、助詞など）
  const breakChars = ["、", "。", "！", "？", "の", "を", "に", "で", "が", "は", "と"];

  // maxLength付近で区切り文字を探す
  for (let i = maxLength; i >= maxLength - 5 && i > 0; i--) {
    if (breakChars.includes(text[i])) {
      return i + 1;
    }
  }

  // 見つからなければmaxLengthで区切る
  return maxLength;
};

/**
 * タイトルをフォーマット（改行・切り詰め処理）
 */
export const formatTitle = (title: string): string => {
  const maxTotalLength = 24;
  const lineBreakAt = 12;

  // 長すぎる場合は切り詰め
  let formatted = title.length > maxTotalLength
    ? title.slice(0, maxTotalLength - 3) + "..."
    : title;

  // 12文字を超える場合は改行を追加
  if (formatted.length > lineBreakAt) {
    const breakPoint = findBreakPoint(formatted, lineBreakAt);
    if (breakPoint > 0) {
      const firstLine = formatted.slice(0, breakPoint);
      const secondLine = formatted.slice(breakPoint);
      formatted = `${firstLine}\n${secondLine}`;
    }
  }

  return formatted;
};

/**
 * 文字数に応じたフォントサイズを取得（1行あたりの文字数で判断）
 */
export const getFontSize = (text: string): number => {
  const lines = text.split("\n");
  const maxLineLength = Math.max(...lines.map((l) => l.length));

  if (maxLineLength <= 8) return 100;
  if (maxLineLength <= 10) return 90;
  if (maxLineLength <= 12) return 80;
  return 70;
};

/**
 * 記事タイトルとカテゴリーからCloudinaryサムネイルURLを生成
 * 背景画像にタイトルテキストをオーバーレイ（ぼかし影付き）
 * カテゴリーに応じて背景画像と文字色を切り替え
 */
export const getBlogThumbnailUrl = (title: string, category: Category = "tips"): string => {
  // タイトルをフォーマット（改行・切り詰め）
  const formattedTitle = formatTitle(title);

  // 文字数に応じてフォントサイズを調整
  const fontSize = getFontSize(formattedTitle);

  // 改行を %0A に変換してURLエンコード
  const encodedTitle = encodeURIComponent(formattedTitle).replace(/%0A/g, "%0A");

  // カテゴリーに応じたテーマスタイルを取得
  const theme = getThemeStyle(category);

  // Cloudinary URL構築（ぼかし影 + テキスト、行間20）
  const transformations = [
    "c_fill,w_1200,h_630",
    // 影レイヤー（背景に応じた色、ぼかし、半透明）
    `l_text:TakaoExGothic_${fontSize}_bold_line_spacing_20:${encodedTitle},co_${theme.shadowColor},g_center,e_blur:500,o_80`,
    "fl_layer_apply",
    // 本体レイヤー（背景に応じた色）
    `l_text:TakaoExGothic_${fontSize}_bold_line_spacing_20:${encodedTitle},co_${theme.textColor},g_center`,
    "fl_layer_apply",
  ].join("/");

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${theme.background}`;
};

// デフォルトサムネイル（タイトルなしの背景のみ）
export const DEFAULT_THUMBNAIL_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_1200,h_630/${BACKGROUND_IMAGES.soft}`;
