/**
 * noteから投稿した記事のサムネイルを更新するスクリプト
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import contentfulManagement from "contentful-management";
import type { Environment, Asset, Entry } from "contentful-management";
import { getBlogThumbnailUrl, type Category } from "../utils/thumbnail.js";

const { createClient } = contentfulManagement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const CONTENT_TYPE_ID = process.env.CONTENTFUL_CONTENT_TYPE_ID!;

interface ArticleData {
  title: string;
  slug: string;
  category: Category;
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

async function uploadNewThumbnail(
  environment: Environment,
  slug: string,
  title: string,
  category: Category,
  locale: string
): Promise<Asset> {
  const thumbnailUrl = getBlogThumbnailUrl(title, category);
  console.log(`  📷 新しいサムネイルをアップロード中...`);
  console.log(`     URL: ${thumbnailUrl}`);

  const asset = await environment.createAsset({
    fields: {
      title: { [locale]: `Thumbnail for ${slug} (updated)` },
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

async function updateArticleThumbnail(
  environment: Environment,
  entry: Entry,
  newThumbnail: Asset,
  locale: string
): Promise<void> {
  const latestEntry = await environment.getEntry(entry.sys.id);

  latestEntry.fields.thumbnail = {
    [locale]: {
      sys: { type: "Link", linkType: "Asset", id: newThumbnail.sys.id },
    },
  };

  const updatedEntry = await latestEntry.update();
  console.log(`  ✅ 記事を更新しました`);

  await updatedEntry.publish();
  console.log(`  🚀 記事を再公開しました`);
}

async function main() {
  console.log("🔄 note記事サムネイル更新スクリプト");
  console.log("====================================\n");

  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  const locale = await getDefaultLocale(environment);

  console.log(`📍 ロケール: ${locale}\n`);

  // published ディレクトリの記事を取得
  const publishedDir = path.join(ROOT_DIR, "articles", "published");
  const files = fs.readdirSync(publishedDir).filter((f) => f.endsWith(".json"));

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(publishedDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const article: ArticleData = JSON.parse(content);

    console.log(`\n📝 処理中: ${article.title}`);
    console.log(`   カテゴリ: ${article.category}`);

    try {
      const entry = await findEntryBySlug(environment, article.slug);

      if (!entry) {
        console.log(`  ⏭️  スキップ: 記事が見つかりません (slug: ${article.slug})`);
        continue;
      }

      const newThumbnail = await uploadNewThumbnail(
        environment,
        article.slug,
        article.title,
        article.category,
        locale
      );

      await updateArticleThumbnail(environment, entry, newThumbnail, locale);

      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`  ❌ エラー:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n====================================");
  console.log("📊 結果サマリー");
  console.log(`   ✅ 成功: ${successCount}件`);
  console.log(`   ❌ エラー: ${errorCount}件`);
  console.log("====================================\n");
}

main().catch((error) => {
  console.error("❌ 致命的なエラー:", error);
  process.exit(1);
});
