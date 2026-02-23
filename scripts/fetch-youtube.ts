/**
 * YouTube動画から字幕とメタデータを取得してContentful用のJSON形式に変換するスクリプト
 *
 * 使い方:
 *   pnpm run fetch-youtube --url="https://www.youtube.com/watch?v=xxxxx" --category="tips"
 *
 * 環境変数:
 *   YOUTUBE_API_KEY - YouTube Data API v3 のAPIキー（オプション、メタデータ取得に使用）
 *
 * 注意:
 *   取得後、Claude Codeで記事を作成し、slug/excerpt/metaDescription を設定する必要があります
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CategoryId, CATEGORIES } from "../config/default.js";
import {
  extractVideoId,
  fetchTranscript,
  mergeTranscript,
  getTranscriptDuration,
  formatDuration,
  fetchVideoMetadata,
  VideoMetadata,
} from "../utils/youtube.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

interface YouTubeArticle {
  title: string;
  slug: string;
  category: CategoryId;
  excerpt: string;
  body: { type: "h2" | "h3" | "p"; text: string }[];
  metaDescription: string;
  ogpText: string;
  ctaType: string;
  tags: string[];
  youtubeUrl: string;
  _meta: {
    fetchedAt: string;
    source: "youtube";
    videoId: string;
    transcript: string;
    transcriptLength: number;
    duration: string;
    // YouTube Data API から取得したメタデータ
    videoMetadata?: {
      title: string;
      description: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      thumbnails: {
        default?: string;
        medium?: string;
        high?: string;
        maxres?: string;
      };
      tags: string[];
      viewCount: number;
      likeCount: number;
      commentCount: number;
    };
    needsReview: string[];
    reviewGuidance: {
      title: string;
      slug: string;
      excerpt: string;
      metaDescription: string;
      tags: string;
      body: string;
    };
  };
}

interface FetchOptions {
  url: string;
  category: CategoryId;
}

function parseArgs(): FetchOptions {
  const args = process.argv.slice(2);
  const options: FetchOptions = {
    url: "",
    category: "tips",
  };

  for (const arg of args) {
    if (arg.startsWith("--url=")) {
      options.url = arg.replace("--url=", "");
    } else if (arg.startsWith("--category=")) {
      const cat = arg.replace("--category=", "") as CategoryId;
      if (cat in CATEGORIES) {
        options.category = cat;
      }
    }
  }

  if (!options.url) {
    console.error("❌ URLを指定してください: --url=https://www.youtube.com/watch?v=xxxxx");
    process.exit(1);
  }

  return options;
}

async function fetchYouTubeArticle(url: string, category: CategoryId): Promise<YouTubeArticle> {
  console.log(`📥 YouTube動画からデータを取得中: ${url}`);

  // Video ID抽出
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("有効なYouTube URLではありません");
  }
  console.log(`📝 Video ID: ${videoId}`);

  // YouTube Data API でメタデータ取得
  console.log("🔄 メタデータを取得中...");
  const metadata = await fetchVideoMetadata(videoId);

  if (metadata) {
    console.log(`✅ メタデータ取得完了`);
    console.log(`   タイトル: ${metadata.title}`);
    console.log(`   チャンネル: ${metadata.channelTitle}`);
    console.log(`   再生回数: ${metadata.viewCount.toLocaleString()}回`);
    console.log(`   いいね: ${metadata.likeCount.toLocaleString()}`);
  }

  // 字幕取得
  console.log("🔄 字幕を取得中...");
  const transcriptItems = await fetchTranscript(videoId);

  if (transcriptItems.length === 0) {
    throw new Error("字幕が見つかりませんでした。この動画には字幕がないか、取得に失敗しました。");
  }

  const transcript = mergeTranscript(transcriptItems);
  const duration = getTranscriptDuration(transcriptItems);

  console.log(`✅ 字幕取得完了: ${transcriptItems.length}セグメント (${formatDuration(duration)})`);
  console.log(`📄 文字数: ${transcript.length}文字`);

  // カテゴリのデフォルト設定
  const categoryInfo = CATEGORIES[category];

  // 一時的なスラッグ
  const tempSlug = `NEEDS-REVIEW-${videoId}`;

  // メタデータがある場合はタイトルとタグを自動設定
  const title = metadata?.title || "[要設定] YouTube動画のタイトル";
  const ogpText = metadata?.title?.slice(0, 80) || "";
  const tags = metadata?.tags?.length
    ? [...new Set([...categoryInfo.defaultTags, ...metadata.tags.slice(0, 5)])]
    : [...categoryInfo.defaultTags];

  // needsReviewからtitleを除外（メタデータがある場合）
  const needsReview = metadata?.title
    ? ["slug", "excerpt", "metaDescription", "tags", "body"]
    : ["title", "slug", "excerpt", "metaDescription", "tags", "body"];

  return {
    title,
    slug: tempSlug,
    category,
    excerpt: "[要設定]",
    body: [
      { type: "h2", text: "[Claude Codeで記事化してください]" },
      { type: "p", text: transcript.slice(0, 500) + "..." },
    ],
    metaDescription: "[要設定]",
    ogpText,
    ctaType: categoryInfo.defaultCta,
    tags,
    youtubeUrl: url,
    _meta: {
      fetchedAt: new Date().toISOString(),
      source: "youtube",
      videoId,
      transcript,
      transcriptLength: transcript.length,
      duration: metadata?.duration || formatDuration(duration),
      videoMetadata: metadata
        ? {
            title: metadata.title,
            description: metadata.description,
            channelTitle: metadata.channelTitle,
            channelId: metadata.channelId,
            publishedAt: metadata.publishedAt,
            thumbnails: metadata.thumbnails,
            tags: metadata.tags,
            viewCount: metadata.viewCount,
            likeCount: metadata.likeCount,
            commentCount: metadata.commentCount,
          }
        : undefined,
      needsReview,
      reviewGuidance: {
        title: "動画の内容を表す魅力的なタイトルを設定（100文字以内）",
        slug: "記事内容を表す英語スラッグを設定（例: coaching-career-tips）",
        excerpt: "読者の興味を引く200文字以内の要約。ベネフィットを明示",
        metaDescription: "検索キーワードを含む160文字以内のSEO説明文",
        tags: "検索されやすいキーワード3-6個",
        body: "字幕テキストを読みやすいブログ記事に再構成",
      },
    },
  };
}

async function main() {
  console.log("📺 YouTube字幕取得スクリプト");
  console.log("=============================\n");

  const options = parseArgs();

  console.log(`📂 カテゴリ: ${CATEGORIES[options.category].label}`);

  try {
    const article = await fetchYouTubeArticle(options.url, options.category);

    // 出力ファイルパス
    const outputDir = path.join(ROOT_DIR, "articles", "pending");
    const fileName = `youtube-${article._meta.videoId}.json`;
    const outputFile = path.join(outputDir, fileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(article, null, 2), "utf-8");

    console.log(`\n✅ 記事データを保存しました`);
    console.log(`   ファイル: ${outputFile}`);
    console.log(`\n📊 取得結果:`);
    console.log(`   Video ID: ${article._meta.videoId}`);
    console.log(`   動画時間: ${article._meta.duration}`);
    console.log(`   字幕文字数: ${article._meta.transcriptLength}文字`);

    if (article._meta.videoMetadata) {
      const meta = article._meta.videoMetadata;
      console.log(`\n📹 動画メタデータ:`);
      console.log(`   タイトル: ${meta.title}`);
      console.log(`   チャンネル: ${meta.channelTitle}`);
      console.log(`   公開日: ${new Date(meta.publishedAt).toLocaleDateString("ja-JP")}`);
      console.log(`   再生回数: ${meta.viewCount.toLocaleString()}回`);
      console.log(`   いいね: ${meta.likeCount.toLocaleString()}`);
      console.log(`   コメント: ${meta.commentCount.toLocaleString()}`);
      if (meta.tags.length > 0) {
        console.log(`   タグ: ${meta.tags.slice(0, 5).join(", ")}`);
      }
      if (meta.thumbnails.maxres) {
        console.log(`   サムネイル: ${meta.thumbnails.maxres}`);
      }
    }

    console.log(`\n⚠️  以下の項目はClaude Codeで設定が必要です:`);
    console.log(`   ────────────────────────────────────`);
    console.log(`   title: ${article._meta.reviewGuidance.title}`);
    console.log(`   slug: ${article._meta.reviewGuidance.slug}`);
    console.log(`   excerpt: ${article._meta.reviewGuidance.excerpt}`);
    console.log(`   metaDescription: ${article._meta.reviewGuidance.metaDescription}`);
    console.log(`   tags: ${article._meta.reviewGuidance.tags}`);
    console.log(`   body: ${article._meta.reviewGuidance.body}`);
    console.log(`   ────────────────────────────────────`);

    console.log(`\n📋 次のステップ:`);
    console.log(`   1. Claude Codeで「${fileName}の字幕から記事を作って」と依頼`);
    console.log(`   2. pnpm run validate --file="${fileName}" でバリデーション`);
    console.log(`   3. pnpm run publish --file="{slug}.json" で投稿`);
  } catch (error) {
    console.error("❌ エラーが発生しました:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main();
