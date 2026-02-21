/**
 * 記事データのバリデーションスクリプト
 *
 * 使い方:
 *   pnpm run validate                    # articles/pending/ 内の全ファイルを検証
 *   pnpm run validate --file=sample.json # 特定ファイルのみ検証
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CATEGORIES, ARTICLE_DEFAULTS, CategoryId, CtaType, CTA_TYPES } from "../config/default.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

interface ArticleBody {
  type: "h2" | "h3" | "p";
  text: string;
}

interface ArticleData {
  title: string;
  slug: string;
  category: CategoryId;
  excerpt: string;
  body: ArticleBody[];
  metaDescription: string;
  ogpText?: string;
  ctaType?: CtaType;
  tags?: string[];
  youtubeUrl?: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

function validateArticle(data: unknown, fileName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const article = data as ArticleData;

  // 必須フィールドチェック
  const requiredFields = ["title", "slug", "category", "excerpt", "body", "metaDescription"];
  for (const field of requiredFields) {
    if (!(field in article) || article[field as keyof ArticleData] === undefined) {
      errors.push({ field, message: `必須フィールドがありません`, severity: "error" });
    }
  }

  // title
  if (article.title) {
    if (article.title.length === 0) {
      errors.push({ field: "title", message: "タイトルが空です", severity: "error" });
    } else if (article.title.length > ARTICLE_DEFAULTS.titleMaxLength) {
      errors.push({
        field: "title",
        message: `タイトルが${ARTICLE_DEFAULTS.titleMaxLength}文字を超えています（${article.title.length}文字）`,
        severity: "error",
      });
    }
  }

  // slug
  if (article.slug) {
    if (!/^[a-z0-9-]+$/.test(article.slug)) {
      errors.push({
        field: "slug",
        message: "slugは半角英小文字、数字、ハイフンのみ使用可能です",
        severity: "error",
      });
    }
  }

  // category
  if (article.category && !(article.category in CATEGORIES)) {
    errors.push({
      field: "category",
      message: `無効なカテゴリです。有効: ${Object.keys(CATEGORIES).join(", ")}`,
      severity: "error",
    });
  }

  // excerpt
  if (article.excerpt) {
    if (article.excerpt.length === 0) {
      errors.push({ field: "excerpt", message: "excerptが空です", severity: "error" });
    } else if (article.excerpt.length > ARTICLE_DEFAULTS.excerptMaxLength) {
      errors.push({
        field: "excerpt",
        message: `excerptが${ARTICLE_DEFAULTS.excerptMaxLength}文字を超えています（${article.excerpt.length}文字）`,
        severity: "warning",
      });
    }
  }

  // body
  if (article.body) {
    if (!Array.isArray(article.body)) {
      errors.push({ field: "body", message: "bodyは配列である必要があります", severity: "error" });
    } else if (article.body.length === 0) {
      errors.push({ field: "body", message: "bodyが空です", severity: "error" });
    } else {
      // 最初の要素がh2かチェック
      if (article.body[0]?.type !== "h2") {
        errors.push({
          field: "body",
          message: "記事本文はh2（見出し）から始めてください",
          severity: "warning",
        });
      }
      // 各要素のバリデーション
      article.body.forEach((block, index) => {
        if (!["h2", "h3", "p"].includes(block.type)) {
          errors.push({
            field: `body[${index}].type`,
            message: `無効なタイプ: ${block.type}`,
            severity: "error",
          });
        }
        if (!block.text || block.text.trim().length === 0) {
          errors.push({
            field: `body[${index}].text`,
            message: "テキストが空です",
            severity: "warning",
          });
        }
      });
    }
  }

  // metaDescription
  if (article.metaDescription) {
    if (article.metaDescription.length === 0) {
      errors.push({ field: "metaDescription", message: "metaDescriptionが空です", severity: "error" });
    } else if (article.metaDescription.length > ARTICLE_DEFAULTS.metaDescriptionMaxLength) {
      errors.push({
        field: "metaDescription",
        message: `metaDescriptionが${ARTICLE_DEFAULTS.metaDescriptionMaxLength}文字を超えています（${article.metaDescription.length}文字）`,
        severity: "warning",
      });
    }
  }

  // ctaType
  if (article.ctaType && !(article.ctaType in CTA_TYPES)) {
    errors.push({
      field: "ctaType",
      message: `無効なctaTypeです。有効: ${Object.keys(CTA_TYPES).join(", ")}`,
      severity: "error",
    });
  }

  // youtubeUrl
  if (article.youtubeUrl && article.youtubeUrl.length > 0) {
    if (!article.youtubeUrl.includes("youtube.com") && !article.youtubeUrl.includes("youtu.be")) {
      errors.push({
        field: "youtubeUrl",
        message: "有効なYouTube URLではありません",
        severity: "warning",
      });
    }
  }

  return errors;
}

function parseArgs(): { files: string[] } {
  const args = process.argv.slice(2);
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      files.push(arg.replace("--file=", ""));
    }
  }

  return { files };
}

async function main() {
  console.log("🔍 記事データバリデーション");
  console.log("============================\n");

  const { files: specifiedFiles } = parseArgs();
  const pendingDir = path.join(ROOT_DIR, "articles", "pending");

  // 対象ファイルを決定
  let targetFiles: string[];
  if (specifiedFiles.length > 0) {
    targetFiles = specifiedFiles.map((f) => path.join(pendingDir, f));
  } else {
    if (!fs.existsSync(pendingDir)) {
      console.log("📂 articles/pending/ ディレクトリが空です");
      return;
    }
    targetFiles = fs
      .readdirSync(pendingDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(pendingDir, f));
  }

  if (targetFiles.length === 0) {
    console.log("📂 検証対象のファイルがありません");
    return;
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filePath of targetFiles) {
    const fileName = path.basename(filePath);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${fileName}`);
      totalErrors++;
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const errors = validateArticle(data, fileName);

      const errorCount = errors.filter((e) => e.severity === "error").length;
      const warningCount = errors.filter((e) => e.severity === "warning").length;

      if (errors.length === 0) {
        console.log(`✅ ${fileName}`);
      } else {
        console.log(`\n📄 ${fileName}`);
        for (const error of errors) {
          const icon = error.severity === "error" ? "❌" : "⚠️";
          console.log(`   ${icon} [${error.field}] ${error.message}`);
        }
        totalErrors += errorCount;
        totalWarnings += warningCount;
      }
    } catch (error) {
      console.log(`❌ ${fileName}: JSONパースエラー`);
      if (error instanceof Error) {
        console.log(`   ${error.message}`);
      }
      totalErrors++;
    }
  }

  // サマリー
  console.log("\n============================");
  console.log("📊 検証結果");
  console.log(`   ファイル数: ${targetFiles.length}`);
  console.log(`   ❌ エラー: ${totalErrors}`);
  console.log(`   ⚠️  警告: ${totalWarnings}`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
