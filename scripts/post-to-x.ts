/**
 * Xに投稿するスクリプト
 *
 * 使い方:
 *   pnpm tsx scripts/post-to-x.ts --text="投稿内容"
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { postToX } from "../utils/x.js";

function parseArgs(): { text?: string } {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--text=")) {
      return { text: arg.replace("--text=", "") };
    }
  }
  return {};
}

async function main() {
  console.log("🐦 X投稿スクリプト");
  console.log("==================\n");

  const { text } = parseArgs();

  if (!text) {
    console.error("❌ --text を指定してください");
    process.exit(1);
  }

  console.log("📝 投稿内容:");
  console.log("---");
  console.log(text);
  console.log("---\n");

  const result = await postToX({ text });

  if (result.success) {
    console.log("✅ 投稿成功!");
    console.log(`   URL: ${result.tweetUrl}`);
  } else {
    console.error("❌ 投稿失敗:", result.error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});
