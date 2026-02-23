import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import contentfulManagement from "contentful-management";
import { getBlogThumbnailUrl, type Category } from "../utils/thumbnail.js";

const { createClient } = contentfulManagement;

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;

async function main() {
  const entryId = process.argv[2];
  const category = (process.argv[3] || "tips") as Category;

  if (!entryId) {
    console.error("使い方: npx tsx scripts/update-thumbnail.ts <entryId> [category]");
    process.exit(1);
  }

  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  const locale = "en-US";

  // エントリを取得
  const entry = await environment.getEntry(entryId);
  const title = entry.fields.title[locale];
  const slug = entry.fields.slug[locale];

  console.log("📝 タイトル:", title);
  console.log("📂 カテゴリ:", category);

  // サムネイルURLを生成
  const thumbnailUrl = getBlogThumbnailUrl(title, category);
  console.log("🖼️  サムネイルURL:", thumbnailUrl);

  // 新しいサムネイルをアップロード
  console.log("📤 サムネイルをアップロード中...");
  const asset = await environment.createAsset({
    fields: {
      title: { [locale]: `Thumbnail for ${slug} (${category})` },
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

  // 処理完了を待つ
  let attempts = 0;
  while (attempts < 30) {
    const checkAsset = await environment.getAsset(processedAsset.sys.id);
    const file = checkAsset.fields.file?.[locale];
    if (file && "url" in file) {
      console.log("✅ サムネイルアップロード完了");
      const publishedAsset = await checkAsset.publish();

      // エントリのサムネイルを更新
      entry.fields.thumbnail = {
        [locale]: {
          sys: { type: "Link", linkType: "Asset", id: publishedAsset.sys.id },
        },
      };

      const updatedEntry = await entry.update();
      await updatedEntry.publish();

      console.log("✅ エントリ更新・公開完了");
      console.log(`   URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${entryId}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }

  throw new Error("サムネイル処理がタイムアウト");
}

main().catch(console.error);
