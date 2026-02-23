/**
 * Brighty Info (info.brighty.site) にお知らせ/リリースノートを投稿するスクリプト
 *
 * 使い方:
 *   pnpm tsx scripts/publish-info.ts --file="release-note.json"
 *   pnpm tsx scripts/publish-info.ts --file="release-note.json" --publish
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import contentfulManagement from "contentful-management";
import type { Environment, Entry, Document } from "contentful-management";

const { createClient } = contentfulManagement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// 環境変数 (Brighty Info用)
const SPACE_ID = process.env.BRIGHTY_INFO_SPACE_ID!;
const ENVIRONMENT_ID = process.env.BRIGHTY_INFO_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.BRIGHTY_INFO_MANAGEMENT_TOKEN!;
const CONTENT_TYPE_ID = process.env.BRIGHTY_INFO_CONTENT_TYPE_ID!;

// お知らせタイプ
type InfoType = "リリース" | "お知らせ";

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
  segments?: TextSegment[];
}

interface InfoData {
  title: string;
  slug: string;
  type: InfoType[];
  published_at: string; // ISO date string (YYYY-MM-DD)
  body: BodyBlock[];
  metaDescription: string;
  excerpt?: string;
  important?: boolean;
  tags?: string[];
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
    console.error("❌ ファイルを指定してください: --file=info.json");
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

async function publishInfo(
  environment: Environment,
  info: InfoData,
  locale: string,
  shouldPublish: boolean,
  shouldUpdate: boolean
): Promise<void> {
  console.log(`\n📝 お知らせを${shouldUpdate ? "更新" : "投稿"}中: ${info.title}`);

  // 既存チェック
  const existing = await findEntryBySlug(environment, info.slug);

  if (existing && shouldUpdate) {
    // 更新モード
    console.log(`  🔄 既存エントリを更新中...`);

    const richTextBody = bodyToRichText(info.body);

    existing.fields.title = { [locale]: info.title };
    existing.fields.type = { [locale]: info.type };
    existing.fields.published_at = { [locale]: info.published_at };
    existing.fields.body = { [locale]: richTextBody };
    existing.fields.metaDescription = { [locale]: info.metaDescription };

    if (info.excerpt) {
      existing.fields.excerpt = { [locale]: info.excerpt };
    }
    if (info.important !== undefined) {
      existing.fields.important = { [locale]: info.important };
    }
    if (info.tags && info.tags.length > 0) {
      existing.fields.tags = { [locale]: info.tags };
    }

    const updatedEntry = await existing.update();
    console.log(`  ✅ お知らせ更新完了: ${info.title}`);
    console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${updatedEntry.sys.id}`);

    if (shouldPublish) {
      await updatedEntry.publish();
      console.log(`  🚀 公開完了`);
    } else {
      console.log(`  📋 ドラフト状態で保存（--publish フラグで公開可能）`);
    }
    return;
  }

  if (existing) {
    console.log(`  ⏭️  スキップ: slug "${info.slug}" は既に存在します`);
    console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${existing.sys.id}`);
    console.log(`     更新する場合は --update フラグを使用してください`);
    return;
  }

  // Rich Textに変換
  const richTextBody = bodyToRichText(info.body);

  // エントリを作成
  const entryFields: Record<string, Record<string, unknown>> = {
    title: { [locale]: info.title },
    slug: { [locale]: info.slug },
    type: { [locale]: info.type },
    published_at: { [locale]: info.published_at },
    body: { [locale]: richTextBody },
    metaDescription: { [locale]: info.metaDescription },
  };

  if (info.excerpt) {
    entryFields.excerpt = { [locale]: info.excerpt };
  }
  if (info.important !== undefined) {
    entryFields.important = { [locale]: info.important };
  }
  if (info.tags && info.tags.length > 0) {
    entryFields.tags = { [locale]: info.tags };
  }

  const entry = await environment.createEntry(CONTENT_TYPE_ID, { fields: entryFields });

  console.log(`  ✅ お知らせ作成完了: ${info.title}`);
  console.log(`     URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${entry.sys.id}`);

  if (shouldPublish) {
    await entry.publish();
    console.log(`  🚀 公開完了`);
  } else {
    console.log(`  📋 ドラフト状態で保存（--publish フラグで公開可能）`);
  }

  // 投稿済みに移動
  const pendingDir = path.join(ROOT_DIR, "info", "pending");
  const publishedDir = path.join(ROOT_DIR, "info", "published");
  const fileName = `${info.slug}.json`;
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
  console.log("📤 Brighty Info 投稿スクリプト");
  console.log("==============================\n");

  if (!MANAGEMENT_TOKEN) {
    console.error("❌ BRIGHTY_INFO_MANAGEMENT_TOKEN が設定されていません");
    process.exit(1);
  }

  const options = parseArgs();

  // ファイル読み込み
  const pendingDir = path.join(ROOT_DIR, "info", "pending");
  const publishedDir = path.join(ROOT_DIR, "info", "published");
  let filePath = path.join(pendingDir, options.file);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(publishedDir, options.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${options.file}`);
      console.error(`   確認した場所: ${pendingDir}, ${publishedDir}`);
      process.exit(1);
    }
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const info: InfoData = JSON.parse(content);

  console.log(`📄 ファイル: ${options.file}`);
  console.log(`📝 タイトル: ${info.title}`);
  console.log(`📌 タイプ: ${info.type.join(", ")}`);
  console.log(`📅 日付: ${info.published_at}`);
  if (info.tags && info.tags.length > 0) {
    console.log(`🏷️  タグ: ${info.tags.join(", ")}`);
  }
  console.log(`🔧 モード: ${options.shouldUpdate ? "更新" : "新規投稿"} / ${options.shouldPublish ? "自動公開" : "ドラフト"}\n`);

  // バリデーション
  const errors: string[] = [];

  if (!info.title) {
    errors.push("title: タイトルは必須です");
  }
  if (!info.slug || !info.slug.match(/^[a-z0-9-]+$/)) {
    errors.push("slug: 半角英小文字、数字、ハイフンのみ使用可能です");
  }
  if (!info.type || info.type.length === 0) {
    errors.push("type: タイプ（リリース/お知らせ）は必須です");
  }
  if (!info.published_at || !info.published_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push("published_at: 日付はYYYY-MM-DD形式で指定してください");
  }
  if (!info.body || info.body.length === 0) {
    errors.push("body: 本文は必須です");
  }
  if (!info.metaDescription) {
    errors.push("metaDescription: SEO用の説明文は必須です");
  }
  if (info.metaDescription && info.metaDescription.length > 160) {
    errors.push(`metaDescription: 160文字以内にしてください（現在${info.metaDescription.length}文字）`);
  }

  if (errors.length > 0) {
    console.error("❌ バリデーションエラー:\n");
    errors.forEach((err) => console.error(`   ・${err}`));
    process.exit(1);
  }

  console.log("✅ バリデーション通過\n");

  // Contentful接続
  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  const locale = await getDefaultLocale(environment);

  console.log(`📍 ロケール: ${locale}`);

  await publishInfo(environment, info, locale, options.shouldPublish, options.shouldUpdate);

  console.log("\n==============================");
  console.log("✅ 完了");
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
