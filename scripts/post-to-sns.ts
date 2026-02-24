/**
 * X と Threads に同時投稿するスクリプト
 *
 * 使い方:
 *   pnpm tsx scripts/post-to-sns.ts --text="投稿内容"
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { postToX } from "../utils/x.js";
import { postToThreads } from "../utils/threads.js";

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
  console.log("📱 SNS同時投稿スクリプト");
  console.log("========================\n");

  const { text } = parseArgs();

  if (!text) {
    console.error("❌ --text を指定してください");
    process.exit(1);
  }

  console.log("📝 投稿内容:");
  console.log("---");
  console.log(text);
  console.log("---\n");

  // X に投稿
  console.log("🐦 X に投稿中...");
  const xResult = await postToX({ text });
  if (xResult.success) {
    console.log(`   ✅ 成功: ${xResult.tweetUrl}`);
  } else {
    console.error(`   ❌ 失敗: ${xResult.error}`);
  }

  // Threads に投稿
  console.log("🧵 Threads に投稿中...");
  const threadsResult = await postToThreads({ text });
  if (threadsResult.success) {
    console.log(`   ✅ 成功: ${threadsResult.postUrl}`);
  } else {
    console.error(`   ❌ 失敗: ${threadsResult.error}`);
  }

  console.log("\n========================");
  console.log("📊 結果サマリー");
  console.log(`   X:       ${xResult.success ? "✅" : "❌"}`);
  console.log(`   Threads: ${threadsResult.success ? "✅" : "❌"}`);

  if (!xResult.success || !threadsResult.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});
