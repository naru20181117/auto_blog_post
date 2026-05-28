import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import contentfulManagement from "contentful-management";

const { createClient } = contentfulManagement;

async function main() {
  const client = createClient({ accessToken: process.env.BRIGHTY_INFO_MANAGEMENT_TOKEN! });
  const space = await client.getSpace(process.env.BRIGHTY_INFO_SPACE_ID!);
  const env = await space.getEnvironment(process.env.BRIGHTY_INFO_ENVIRONMENT_ID!);
  
  // コンテンツタイプのフィールド定義を確認
  const contentType = await env.getContentType(process.env.BRIGHTY_INFO_CONTENT_TYPE_ID!);
  const tagsField = contentType.fields.find(f => f.id === "tags");
  console.log("=== Tags field definition ===");
  console.log(JSON.stringify(tagsField, null, 2));
  
  // タグが設定されているエントリーを探す
  const entries = await env.getEntries({ content_type: process.env.BRIGHTY_INFO_CONTENT_TYPE_ID!, limit: 10 });
  for (const entry of entries.items) {
    if (entry.fields.tags) {
      console.log("\n=== Entry with tags ===");
      console.log("Title:", entry.fields.title);
      console.log("Tags:", JSON.stringify(entry.fields.tags, null, 2));
      break;
    }
  }
}
main().catch(console.error);
