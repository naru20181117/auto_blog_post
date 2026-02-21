/**
 * articles/pending/ のJSONファイルをContentfulに投稿するスクリプト
 *
 * 使い方:
 *   pnpm run publish:article --file="note-nce9b4a364809.json"
 *   pnpm run publish:article --file="note-nce9b4a364809.json" --publish
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import contentfulManagement from "contentful-management";
import type { Environment, Asset, Entry, Document } from "contentful-management";
import { getBlogThumbnailUrl, type Category } from "../utils/thumbnail.js";

const { createClient } = contentfulManagement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// 環境変数
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const CONTENT_TYPE_ID = process.env.CONTENTFUL_CONTENT_TYPE_ID!;

interface TextSegment {
  text: string;
  link?: {
    url: string;
    title?: string;
  };
}

interface BodyBlock {
  type: "h2" | "h3" | "p";
  text: string;
  segments?: TextSegment[]; // リンクを含む場合に使用
}

interface ArticleData {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: BodyBlock[];
  metaDescription: string;
  ogpText?: string;
  ctaType?: string;
  tags?: string[];
  youtubeUrl?: string;
  sourceUrl?: string;
}

interface PublishOptions {
  file: string;
  shouldPublish: boolean;
  shouldUpdate: boolean;
}

function parseArgs(): PublishOptions {
  const args = process.argv.slice(2);
  const options: PublishOptions = {
    file: "",
    shouldPublish: args.includes("--publish"),
    shouldUpdate: args.includes("--update"),
  };

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      options.file = arg.replace("--file=", "");
    }
  }

  if (!options.file) {
    console.error("❌ ファイルを指定してください: --file=article.json");
    process.exit(1);
  }

  return options;
}

/**
 * セグメント配列をContentful Rich Textのコンテンツに変換
 */
function segmentsToRichTextContent(segments: TextSegment[]): Array<{
  nodeType: "text" | "hyperlink";
  value?: string;
  marks?: never[];
  data: { uri?: string };
  content?: Array<{ nodeType: "text"; value: string; marks: never[]; data: Record<string, never> }>;
}> {
  return segments.map((segment) => {
    if (segment.link) {
      return {
        nodeType: "hyperlink" as const,
        data: { uri: segment.link.url },
        content: [
          {
            nodeType: "text" as const,
            value: segment.text,
            marks: [] as never[],
            data: {} as Record<string, never>,
          },
        ],
      };
    } else {
      return {
        nodeType: "text" as const,
        value: segment.text,
        marks: [] as never[],
        data: {},
      };
    }
  });
}

/**
 * body配列をContentful Rich Text形式に変換
 */
function bodyToRichText(body: BodyBlock[]): Document {
  const content: Document["content"] = body.map((block) => {
    switch (block.type) {
      case "h2":
        return {
          nodeType: "heading-2" as const,
          content: [{ nodeType: "text" as const, value: block.text, marks: [], data: {} }],
          data: {},
        };
      case "h3":
        return {
          nodeType: "heading-3" as const,
          content: [{ nodeType: "text" as const, value: block.text, marks: [], data: {} }],
          data: {},
        };
      case "p":
      default:
        // segmentsがある場合はリンクを含むコンテンツとして処理
        if (block.segments && block.segments.length > 0) {
          return {
            nodeType: "paragraph" as const,
            content: segmentsToRichTextContent(block.segments) as Document["content"][0]["content"],
            data: {},
          };
        }
        return {
          nodeType: "paragraph" as const,
          content: [{ nodeType: "text" as const, value: block.text, marks: [], data: {} }],
          data: {},
        };
    }
  });

  return {
    nodeType: "document",
    data: {},
    content,
  };
}

async function getDefaultLocale(environment: Environment): Promise<string> {
  const locales = await environment.getLocales();
  const defaultLocale = locales.items.find((l) => l.default);
  if (!defaultLocale) {
    throw new Error("デフォルトロケールが見つかりません");
  }
  return defaultLocale.code;
}

async function findEntryBySlug(
  environment: Environment,
  slug: string
): Promise<Entry | null> {
  const entries = await environment.getEntries({
    content_type: CONTENT_TYPE_ID,
    "fields.slug": slug,
    limit: 1,
  });
  return entries.items.length > 0 ? entries.items[0] : null;
}

async function uploadThumbnail(
  environment: Environment,
  slug: string,
  title: string,
  category: Category,
  locale: string
): Promise<Asset> {
  const thumbnailUrl = getBlogThumbnailUrl(title, category);
  console.log(`  📷 サムネイル画像をアップロード中...`);

  const asset = await environment.createAsset({
    fields: {
      title: { [locale]: `Thumbnail for ${slug}` },
      description: { [locale]: `ブログ記事「${title}」のサムネイル画像` },
      file: {
        [locale]: {
          contentType: "image/webp",
          fileName: `${slug}-thumbnail.webp`,
          upload: thumbnailUrl,
        },
      },
    },
  });

  const processedAsset = await asset.processForAllLocales();

  let attempts = 0;
  const maxAttempts = 30;
  while (attempts < maxAttempts) {
    const checkAsset = await environment.getAsset(processedAsset.sys.id);
    const file = checkAsset.fields.file?.[locale];
    if (file && "url" in file) {
      console.log(`  ✅ サムネイルアップロード完了`);
      const publishedAsset = await checkAsset.publish();
      return publishedAsset;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error("サムネイル画像の処理がタイムアウトしました");
}

async function publishArticle(
  environment: Environment,
  article: ArticleData,
  locale: string,
  shouldPublish: boolean,
  shouldUpdate: boolean
): Promise<void> {
  console.log(`\n📝 記事を${shouldUpdate ? "更新" : "投稿"}中: ${article.title}`);

  // 既存チェック
  const existing = await findEntryBySlug(environment, article.slug);

  if (existing && shouldUpdate) {
    // 更新モード
    console.log(`  🔄 既存エントリを更新中...`);

    // Rich Textに変換
    const richTextBody = bodyToRichText(article.body);

    // フィールドを更新
    existing.fields.title = { [locale]: article.title };
    existing.fields.body = { [locale]: richTextBody };
    existing.fields.excerpt = { [locale]: article.excerpt };
    existing.fields.category = { [locale]: article.category };
    existing.fields.metaDescription = { [locale]: article.metaDescription };

    if (article.tags && article.tags.length > 0) {
      existing.fields.tags = { [locale]: article.tags };
    }
    if (article.ogpText) {
      existing.fields.ogpText = { [locale]: article.ogpText };
    }
    if (article.ctaType) {
      existing.fields.ctaType = { [locale]: article.ctaType };
    }
    if (article.youtubeUrl) {
      existing.fields.youtubeUrl = { [locale]: article.youtubeUrl };
    }

    const updatedEntry = await existing.update();
    console.log(`  ✅ 記事更新完了: ${article.title}`);
    console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${updatedEntry.sys.id}`);

    if (shouldPublish) {
      await updatedEntry.publish();
      console.log(`  🚀 記事公開完了`);
    } else {
      console.log(`  📋 ドラフト状態で保存（--publish フラグで公開可能）`);
    }
    return;
  }

  if (existing) {
    console.log(`  ⏭️  スキップ: slug "${article.slug}" は既に存在します`);
    console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${existing.sys.id}`);
    console.log(`     更新する場合は --update フラグを使用してください`);
    return;
  }

  // サムネイルをアップロード
  const thumbnail = await uploadThumbnail(
    environment,
    article.slug,
    article.title,
    article.category as Category,
    locale
  );

  // Rich Textに変換
  const richTextBody = bodyToRichText(article.body);

  // エントリを作成
  const entryFields: Record<string, Record<string, unknown>> = {
    title: { [locale]: article.title },
    slug: { [locale]: article.slug },
    body: { [locale]: richTextBody },
    excerpt: { [locale]: article.excerpt },
    thumbnail: {
      [locale]: {
        sys: { type: "Link", linkType: "Asset", id: thumbnail.sys.id },
      },
    },
    category: { [locale]: article.category },
    metaDescription: { [locale]: article.metaDescription },
  };

  if (article.tags && article.tags.length > 0) {
    entryFields.tags = { [locale]: article.tags };
  }
  if (article.ogpText) {
    entryFields.ogpText = { [locale]: article.ogpText };
  }
  if (article.ctaType) {
    entryFields.ctaType = { [locale]: article.ctaType };
  }
  if (article.youtubeUrl) {
    entryFields.youtubeUrl = { [locale]: article.youtubeUrl };
  }

  const entry = await environment.createEntry(CONTENT_TYPE_ID, { fields: entryFields });

  console.log(`  ✅ 記事作成完了: ${article.title}`);
  console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${entry.sys.id}`);

  if (shouldPublish) {
    await entry.publish();
    console.log(`  🚀 記事公開完了`);
  } else {
    console.log(`  📋 ドラフト状態で保存（--publish フラグで公開可能）`);
  }

  // 投稿済みに移動
  const pendingDir = path.join(ROOT_DIR, "articles", "pending");
  const publishedDir = path.join(ROOT_DIR, "articles", "published");
  const fileName = `${article.slug}.json`;
  const sourcePath = path.join(pendingDir, fileName);
  const destPath = path.join(publishedDir, fileName);

  if (fs.existsSync(sourcePath)) {
    if (!fs.existsSync(publishedDir)) {
      fs.mkdirSync(publishedDir, { recursive: true });
    }
    fs.renameSync(sourcePath, destPath);
    console.log(`  📁 ファイルを published/ に移動しました`);
  }
}

async function main() {
  console.log("📤 記事投稿スクリプト");
  console.log("=====================\n");

  if (!MANAGEMENT_TOKEN) {
    console.error("❌ CONTENTFUL_MANAGEMENT_TOKEN が設定されていません");
    process.exit(1);
  }

  const options = parseArgs();

  // ファイル読み込み（更新モードの場合はpublishedディレクトリも確認）
  const pendingDir = path.join(ROOT_DIR, "articles", "pending");
  const publishedDir = path.join(ROOT_DIR, "articles", "published");
  let filePath = path.join(pendingDir, options.file);

  if (!fs.existsSync(filePath)) {
    // pendingになければpublishedを確認
    filePath = path.join(publishedDir, options.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${options.file}`);
      console.error(`   確認した場所: ${pendingDir}, ${publishedDir}`);
      process.exit(1);
    }
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const article: ArticleData = JSON.parse(content);

  console.log(`📄 ファイル: ${options.file}`);
  console.log(`📝 タイトル: ${article.title}`);
  console.log(`🔧 モード: ${options.shouldUpdate ? "更新" : "新規投稿"} / ${options.shouldPublish ? "自動公開" : "ドラフト"}\n`);

  // レビュー必須項目のチェック
  const reviewErrors: string[] = [];

  if (article.slug.startsWith("NEEDS-REVIEW")) {
    reviewErrors.push("slug: SEO最適化されたスラッグを設定してください");
  }
  if (!article.slug.match(/^[a-z0-9-]+$/)) {
    reviewErrors.push("slug: 半角英小文字、数字、ハイフンのみ使用可能です");
  }
  if (article.excerpt.startsWith("[要設定]")) {
    reviewErrors.push("excerpt: 読者を引きつける要約文を設定してください");
  }
  if (article.metaDescription.startsWith("[要設定]")) {
    reviewErrors.push("metaDescription: SEO用の説明文を設定してください");
  }
  if (article.excerpt.length > 200) {
    reviewErrors.push(`excerpt: 200文字以内にしてください（現在${article.excerpt.length}文字）`);
  }
  if (article.metaDescription.length > 160) {
    reviewErrors.push(`metaDescription: 160文字以内にしてください（現在${article.metaDescription.length}文字）`);
  }

  if (reviewErrors.length > 0) {
    console.error("❌ 投稿前にレビューが必要な項目があります:\n");
    reviewErrors.forEach((err) => console.error(`   ・${err}`));
    console.error("\n   JSONファイルを編集してから再実行してください。");
    console.error("   SEOガイドライン: config/seo.ts を参照");
    process.exit(1);
  }

  console.log("✅ バリデーション通過\n");

  // Contentful接続
  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  const locale = await getDefaultLocale(environment);

  console.log(`📍 ロケール: ${locale}`);

  await publishArticle(environment, article, locale, options.shouldPublish, options.shouldUpdate);

  console.log("\n=====================");
  console.log("✅ 完了");
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
