/**
 * noteの記事を取得してContentful用のJSON形式に変換するスクリプト
 *
 * 使い方:
 *   pnpm run fetch-note --url="https://note.com/brighty/n/nce9b4a364809" --category="tips"
 *
 * 注意:
 *   取得後、slug/excerpt/metaDescription はClaudeがSEO観点でレビュー・設定する必要があります
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { CategoryId, CATEGORIES } from "../config/default.js";
import { CATEGORY_KEYWORDS } from "../config/seo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

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

interface NoteArticle {
  title: string;
  slug: string;
  category: CategoryId;
  excerpt: string;
  body: BodyBlock[];
  metaDescription: string;
  ogpText: string;
  ctaType: string;
  tags: string[];
  sourceUrl: string;
  _meta: {
    fetchedAt: string;
    source: "note";
    needsReview: string[];
    reviewGuidance: {
      slug: string;
      excerpt: string;
      metaDescription: string;
      tags: string;
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
    console.error("❌ URLを指定してください: --url=https://note.com/...");
    process.exit(1);
  }

  return options;
}

/**
 * 一時的なスラッグを生成（レビュー必須）
 */
function generateTempSlug(url: string): string {
  const match = url.match(/\/n\/([a-zA-Z0-9]+)/);
  const id = match ? match[1] : Date.now().toString();
  return `NEEDS-REVIEW-${id}`;
}

/**
 * 要素からテキストセグメント（リンク含む）を抽出
 */
function extractTextSegments($: cheerio.CheerioAPI, $el: cheerio.Cheerio<cheerio.Element>): TextSegment[] {
  const segments: TextSegment[] = [];

  $el.contents().each((_, node) => {
    if (node.type === "text") {
      const text = $(node).text();
      if (text.trim()) {
        segments.push({ text });
      }
    } else if (node.type === "tag") {
      const $node = $(node);
      const tagName = node.tagName?.toLowerCase();

      if (tagName === "a") {
        const href = $node.attr("href");
        const text = $node.text().trim();
        if (text && href) {
          segments.push({
            text,
            link: {
              url: href,
              title: $node.attr("title"),
            },
          });
        }
      } else {
        // 他の要素内のテキストを再帰的に取得
        const innerSegments = extractTextSegments($, $node);
        segments.push(...innerSegments);
      }
    }
  });

  return segments;
}

/**
 * セグメントにリンクが含まれているかチェック
 */
function hasLinks(segments: TextSegment[]): boolean {
  return segments.some((seg) => seg.link !== undefined);
}

/**
 * HTMLからContentful用の本文ブロックを抽出
 */
function extractBodyBlocks($: cheerio.CheerioAPI, articleBody: cheerio.Cheerio<cheerio.Element>): BodyBlock[] {
  const blocks: BodyBlock[] = [];

  articleBody.children().each((_, element) => {
    const $el = $(element);
    const tagName = element.tagName?.toLowerCase();

    switch (tagName) {
      case "h2":
        const h2Text = $el.text().trim();
        if (h2Text) {
          blocks.push({ type: "h2", text: h2Text });
        }
        break;

      case "h3":
        const h3Text = $el.text().trim();
        if (h3Text) {
          blocks.push({ type: "h3", text: h3Text });
        }
        break;

      case "p":
        const pText = $el.text().trim();
        if (pText) {
          const segments = extractTextSegments($, $el);
          const block: BodyBlock = { type: "p", text: pText };
          if (hasLinks(segments)) {
            block.segments = segments;
          }
          blocks.push(block);
        }
        break;

      case "div":
        // リンクカード（OGP埋め込み）の検出
        const linkCard = $el.find('a[href]').first();
        const isLinkCard = $el.hasClass('note-embed') ||
                          $el.find('.note-embed').length > 0 ||
                          $el.find('iframe').length > 0 ||
                          ($el.children().length === 1 && linkCard.length > 0 && !$el.find('p, h2, h3').length);

        if (isLinkCard && linkCard.length > 0) {
          const href = linkCard.attr("href");
          const linkText = linkCard.text().trim() || href;
          if (href) {
            blocks.push({
              type: "p",
              text: linkText || "",
              segments: [{
                text: linkText || href || "",
                link: { url: href, title: linkCard.attr("title") },
              }],
            });
          }
        } else {
          $el.find("p, h2, h3").each((_, innerEl) => {
            const $inner = $(innerEl);
            const innerTag = innerEl.tagName?.toLowerCase();
            const innerText = $inner.text().trim();

            if (innerText) {
              if (innerTag === "h2") {
                blocks.push({ type: "h2", text: innerText });
              } else if (innerTag === "h3") {
                blocks.push({ type: "h3", text: innerText });
              } else if (innerTag === "p") {
                const segments = extractTextSegments($, $inner);
                const block: BodyBlock = { type: "p", text: innerText };
                if (hasLinks(segments)) {
                  block.segments = segments;
                }
                blocks.push(block);
              }
            }
          });
        }
        break;

      case "ol":
      case "ul":
        $el.find("li").each((_, li) => {
          const $li = $(li);
          const liText = $li.text().trim();
          if (liText) {
            const segments = extractTextSegments($, $li);
            const block: BodyBlock = { type: "p", text: `・${liText}` };
            if (hasLinks(segments)) {
              // リスト項目の場合、先頭に「・」を追加
              block.segments = [{ text: "・" }, ...segments];
            }
            blocks.push(block);
          }
        });
        break;

      case "figure":
        const caption = $el.find("figcaption").text().trim();
        if (caption) {
          blocks.push({ type: "p", text: `（${caption}）` });
        }
        break;
    }
  });

  return blocks;
}

/**
 * 本文からキーワードを抽出してタグ候補を生成
 */
function extractKeywordSuggestions(body: BodyBlock[], category: CategoryId): string[] {
  const categoryKeywords = CATEGORY_KEYWORDS[category] || [];
  const bodyText = body.map((b) => b.text).join(" ");

  // カテゴリキーワードの中で本文に含まれるものを抽出
  const foundKeywords = categoryKeywords.filter((kw) => bodyText.includes(kw));

  return foundKeywords.slice(0, 5);
}

/**
 * noteの記事を取得してパース
 */
async function fetchNoteArticle(url: string, category: CategoryId): Promise<NoteArticle> {
  console.log(`📥 記事を取得中: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`記事の取得に失敗しました: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // タイトル取得（サイト名を除去）
  let title =
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    "無題の記事";

  title = title.replace(/[｜|].+$/, "").trim();
  title = title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").trim();

  console.log(`📝 タイトル: ${title}`);

  // 記事本文を取得
  const articleBody = $(".note-common-styles__textnote-body").first();

  if (articleBody.length === 0) {
    console.log("⚠️  記事本文が見つかりません。別のセレクタを試行中...");
  }

  let blocks = extractBodyBlocks($, articleBody);

  if (blocks.length === 0) {
    const altBody = $("article").first();
    if (altBody.length > 0) {
      blocks = extractBodyBlocks($, altBody);
    }
  }

  if (blocks.length === 0) {
    blocks = [
      { type: "h2", text: "記事の内容" },
      { type: "p", text: "（本文の自動取得ができませんでした。手動で入力してください）" },
    ];
  }

  // メタ情報取得（参考用）
  const rawDescription =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  // 一時的なスラッグ（レビュー必須）
  const tempSlug = generateTempSlug(url);

  // 最初の段落（参考用）
  const firstParagraph = blocks.find((b) => b.type === "p");
  const rawExcerpt = firstParagraph?.text.slice(0, 200) || "";

  // カテゴリのデフォルト設定
  const categoryInfo = CATEGORIES[category];

  // タグ候補を抽出
  const suggestedTags = extractKeywordSuggestions(blocks, category);

  return {
    title,
    slug: tempSlug,
    category,
    excerpt: `[要設定] ${rawExcerpt}`,
    body: blocks,
    metaDescription: `[要設定] ${rawDescription.slice(0, 120)}`,
    ogpText: title.slice(0, 80),
    ctaType: categoryInfo.defaultCta,
    tags: suggestedTags.length > 0 ? suggestedTags : [...categoryInfo.defaultTags],
    sourceUrl: url,
    _meta: {
      fetchedAt: new Date().toISOString(),
      source: "note",
      needsReview: ["slug", "excerpt", "metaDescription", "tags"],
      reviewGuidance: {
        slug: "記事内容を表す英語スラッグを設定（例: brighty-logo-design-concept）",
        excerpt: "読者の興味を引く200文字以内の要約。ベネフィットを明示",
        metaDescription: "検索キーワードを含む160文字以内のSEO説明文",
        tags: "検索されやすいキーワード3-6個",
      },
    },
  };
}

async function main() {
  console.log("📰 note記事取得スクリプト");
  console.log("=========================\n");

  const options = parseArgs();

  console.log(`📂 カテゴリ: ${CATEGORIES[options.category].label}`);

  try {
    const article = await fetchNoteArticle(options.url, options.category);

    // 出力ファイルパス（一時的なファイル名）
    const outputDir = path.join(ROOT_DIR, "articles", "pending");
    const tempFileName = `pending-${Date.now()}.json`;
    const outputFile = path.join(outputDir, tempFileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(article, null, 2), "utf-8");

    console.log(`\n✅ 記事データを保存しました`);
    console.log(`   ファイル: ${outputFile}`);
    console.log(`\n📊 取得結果:`);
    console.log(`   タイトル: ${article.title}`);
    console.log(`   本文ブロック数: ${article.body.length}`);
    console.log(`   タグ候補: ${article.tags.join(", ")}`);

    console.log(`\n⚠️  以下の項目はSEO観点でレビュー・設定が必要です:`);
    console.log(`   ────────────────────────────────────`);
    console.log(`   slug: ${article._meta.reviewGuidance.slug}`);
    console.log(`   excerpt: ${article._meta.reviewGuidance.excerpt}`);
    console.log(`   metaDescription: ${article._meta.reviewGuidance.metaDescription}`);
    console.log(`   tags: ${article._meta.reviewGuidance.tags}`);
    console.log(`   ────────────────────────────────────`);

    console.log(`\n📋 次のステップ:`);
    console.log(`   1. Claudeが上記項目をSEO最適化して設定`);
    console.log(`   2. slugを設定後、ファイル名を {slug}.json にリネーム`);
    console.log(`   3. pnpm run publish:article --file="{slug}.json" で投稿`);
  } catch (error) {
    console.error("❌ エラーが発生しました:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main();
