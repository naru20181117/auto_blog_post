/**
 * エントリーIDを指定してContentfulを更新するスクリプト
 * 使い方: pnpm exec tsx scripts/update-entry-by-id.ts --id="ENTRY_ID" --file="filename.json"
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import contentfulManagement from "contentful-management";
import type { Environment, Document } from "contentful-management";

const { createClient } = contentfulManagement;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const SPACE_ID = process.env.BRIGHTY_INFO_SPACE_ID!;
const ENVIRONMENT_ID = process.env.BRIGHTY_INFO_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.BRIGHTY_INFO_MANAGEMENT_TOKEN!;

interface TextSegment {
  text: string;
  link?: { url: string };
}

interface BodyBlock {
  type: "h2" | "h3" | "p";
  text: string;
  segments?: TextSegment[];
}

interface InfoData {
  title: string;
  slug: string;
  type: string[];
  published_at: string;
  body: BodyBlock[];
  metaDescription: string;
  excerpt?: string;
  important?: boolean;
  tags?: string[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let entryId = "";
  let file = "";
  
  for (const arg of args) {
    if (arg.startsWith("--id=")) entryId = arg.replace("--id=", "");
    if (arg.startsWith("--file=")) file = arg.replace("--file=", "");
  }
  
  if (!entryId || !file) {
    console.error("使い方: pnpm exec tsx scripts/update-entry-by-id.ts --id=ENTRY_ID --file=filename.json");
    process.exit(1);
  }
  
  return { entryId, file };
}

function segmentsToRichTextContent(segments: TextSegment[]) {
  return segments.map((segment) => {
    if (segment.link) {
      return {
        nodeType: "hyperlink" as const,
        data: { uri: segment.link.url },
        content: [{ nodeType: "text" as const, value: segment.text, marks: [], data: {} }],
      };
    }
    return { nodeType: "text" as const, value: segment.text, marks: [], data: {} };
  });
}

function bodyToRichText(body: BodyBlock[]): Document {
  const content = body.map((block) => {
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
  return { nodeType: "document", data: {}, content };
}

async function main() {
  const { entryId, file } = parseArgs();
  
  // ファイル読み込み
  const pendingDir = path.join(ROOT_DIR, "info", "pending");
  const filePath = path.join(pendingDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }
  
  const info: InfoData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📝 更新対象: ${info.title}`);
  console.log(`🔑 Entry ID: ${entryId}\n`);
  
  // Contentful接続
  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  
  // ロケール取得
  const locales = await environment.getLocales();
  const locale = locales.items.find((l) => l.default)?.code || "en-US";
  
  // エントリー取得・更新
  const entry = await environment.getEntry(entryId);
  const richTextBody = bodyToRichText(info.body);
  
  entry.fields.title = { [locale]: info.title };
  entry.fields.slug = { [locale]: info.slug };
  entry.fields.type = { [locale]: info.type };
  entry.fields.published_at = { [locale]: info.published_at };
  entry.fields.body = { [locale]: richTextBody };
  entry.fields.metaDescription = { [locale]: info.metaDescription };
  
  if (info.excerpt) entry.fields.excerpt = { [locale]: info.excerpt };
  if (info.important !== undefined) entry.fields.important = { [locale]: info.important };
  if (info.tags && info.tags.length > 0) entry.fields.tags = { [locale]: info.tags };
  
  const updated = await entry.update();
  console.log(`✅ 更新完了`);
  console.log(`   URL: https://app.contentful.com/spaces/${SPACE_ID}/entries/${entryId}`);
}

main().catch(console.error);
