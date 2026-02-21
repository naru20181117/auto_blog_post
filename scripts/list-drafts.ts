/**
 * Contentful上のドラフト記事を一覧表示するスクリプト
 *
 * 使い方:
 *   pnpm run drafts
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import contentfulManagement from "contentful-management";

const { createClient } = contentfulManagement;

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const CONTENT_TYPE_ID = process.env.CONTENTFUL_CONTENT_TYPE_ID!;

interface EntryFields {
  title?: { [locale: string]: string };
  slug?: { [locale: string]: string };
  category?: { [locale: string]: string };
}

async function main() {
  console.log("📋 Contentful ドラフト記事一覧");
  console.log("==============================\n");

  // 環境変数チェック
  if (!MANAGEMENT_TOKEN) {
    console.error("❌ CONTENTFUL_MANAGEMENT_TOKEN が設定されていません");
    process.exit(1);
  }

  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);

  // ロケール取得
  const locales = await environment.getLocales();
  const defaultLocale = locales.items.find((l) => l.default)?.code || "en-US";

  // ドラフト記事を取得（公開されていないもの）
  const entries = await environment.getEntries({
    content_type: CONTENT_TYPE_ID,
    limit: 100,
  });

  const draftEntries = entries.items.filter((entry) => !entry.sys.publishedAt);
  const publishedEntries = entries.items.filter((entry) => entry.sys.publishedAt);

  console.log(`📊 合計: ${entries.items.length}件`);
  console.log(`   📝 ドラフト: ${draftEntries.length}件`);
  console.log(`   ✅ 公開済み: ${publishedEntries.length}件\n`);

  if (draftEntries.length === 0) {
    console.log("ドラフト記事はありません");
    return;
  }

  console.log("📝 ドラフト記事:");
  console.log("─".repeat(60));

  for (const entry of draftEntries) {
    const fields = entry.fields as EntryFields;
    const title = fields.title?.[defaultLocale] || "(タイトルなし)";
    const slug = fields.slug?.[defaultLocale] || "(slugなし)";
    const category = fields.category?.[defaultLocale] || "-";
    const createdAt = new Date(entry.sys.createdAt).toLocaleDateString("ja-JP");
    const url = `https://app.contentful.com/spaces/${SPACE_ID}/entries/${entry.sys.id}`;

    console.log(`\n📄 ${title}`);
    console.log(`   slug: ${slug}`);
    console.log(`   category: ${category}`);
    console.log(`   作成日: ${createdAt}`);
    console.log(`   URL: ${url}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("\n💡 ヒント:");
  console.log("   - Contentful管理画面で内容を確認・編集できます");
  console.log("   - 公開する場合は管理画面から「Publish」をクリック");
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
