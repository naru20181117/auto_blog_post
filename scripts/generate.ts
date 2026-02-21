/**
 * YouTube動画から記事データを生成するスクリプト
 *
 * 使い方:
 *   pnpm run generate --youtube="https://youtube.com/watch?v=xxx" --category="psychology"
 *
 * 現在の実装:
 *   - テンプレートから空の記事JSONを生成
 *   - 将来的にYouTube文字起こし + AI生成を追加予定
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CategoryId, CATEGORIES } from "../config/default.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

interface GenerateOptions {
  youtubeUrl?: string;
  category: CategoryId;
  outputName?: string;
}

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    category: "psychology",
  };

  for (const arg of args) {
    if (arg.startsWith("--youtube=")) {
      options.youtubeUrl = arg.replace("--youtube=", "");
    } else if (arg.startsWith("--category=")) {
      const cat = arg.replace("--category=", "") as CategoryId;
      if (cat in CATEGORIES) {
        options.category = cat;
      } else {
        console.error(`❌ 無効なカテゴリ: ${cat}`);
        console.error(`   有効なカテゴリ: ${Object.keys(CATEGORIES).join(", ")}`);
        process.exit(1);
      }
    } else if (arg.startsWith("--name=")) {
      options.outputName = arg.replace("--name=", "");
    }
  }

  return options;
}

function generateSlug(name?: string): string {
  if (name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `${date}-${random}`;
}

function createArticleData(options: GenerateOptions) {
  const categoryInfo = CATEGORIES[options.category];
  const slug = generateSlug(options.outputName);

  return {
    title: "",
    slug: slug,
    category: options.category,
    excerpt: "",
    body: [
      { type: "h2", text: "見出し1" },
      { type: "p", text: "本文を入力してください..." },
      { type: "h2", text: "見出し2" },
      { type: "p", text: "本文を入力してください..." },
      { type: "h2", text: "まとめ" },
      { type: "p", text: "まとめの文章..." },
    ],
    metaDescription: "",
    ogpText: "",
    ctaType: categoryInfo.defaultCta,
    tags: [...categoryInfo.defaultTags],
    youtubeUrl: options.youtubeUrl || "",
    _meta: {
      createdAt: new Date().toISOString(),
      status: "draft",
    },
  };
}

async function main() {
  console.log("📝 記事データ生成スクリプト");
  console.log("============================\n");

  const options = parseArgs();

  console.log(`📂 カテゴリ: ${CATEGORIES[options.category].label}`);
  if (options.youtubeUrl) {
    console.log(`🎬 YouTube: ${options.youtubeUrl}`);
  }

  // 記事データを生成
  const articleData = createArticleData(options);

  // 出力ファイルパス
  const outputDir = path.join(ROOT_DIR, "articles", "pending");
  const outputFile = path.join(outputDir, `${articleData.slug}.json`);

  // ディレクトリ確認
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ファイル書き込み
  fs.writeFileSync(outputFile, JSON.stringify(articleData, null, 2), "utf-8");

  console.log(`\n✅ 記事データを生成しました`);
  console.log(`   ファイル: ${outputFile}`);
  console.log(`\n次のステップ:`);
  console.log(`   1. ${outputFile} を編集して記事内容を入力`);
  console.log(`   2. pnpm run validate で検証`);
  console.log(`   3. pnpm run publish:file --file=${articleData.slug}.json で投稿`);

  // TODO: 将来的にYouTube文字起こし + AI生成を追加
  if (options.youtubeUrl) {
    console.log(`\n💡 ヒント: YouTube文字起こしからのAI生成は今後実装予定`);
  }
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
