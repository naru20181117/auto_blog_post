/**
 * SNS投稿用テキストをクリップボードにコピーするスクリプト
 *
 * 使い方:
 *   pnpm run copy:sns --text="投稿内容"
 */

import { execSync } from "child_process";

function parseArgs(): { text?: string } {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--text=")) {
      return { text: arg.replace("--text=", "") };
    }
  }
  return {};
}

function copyToClipboard(text: string): void {
  // macOS: pbcopy を使用
  execSync("pbcopy", { input: text });
}

function main() {
  const { text } = parseArgs();

  if (!text) {
    console.error("❌ --text を指定してください");
    process.exit(1);
  }

  copyToClipboard(text);

  console.log("📋 クリップボードにコピーしました\n");
  console.log("---");
  console.log(text);
  console.log("---");
}

main();
