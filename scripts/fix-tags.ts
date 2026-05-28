import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import contentfulManagement from "contentful-management";

const { createClient } = contentfulManagement;

async function main() {
  const client = createClient({ accessToken: process.env.BRIGHTY_INFO_MANAGEMENT_TOKEN! });
  const space = await client.getSpace(process.env.BRIGHTY_INFO_SPACE_ID!);
  const env = await space.getEnvironment(process.env.BRIGHTY_INFO_ENVIRONMENT_ID!);
  
  const entry = await env.getEntry("2kVbyIbBXBk071bSI8zugZ");
  
  // 許可リストにあるタグのみ設定
  entry.fields.tags = { "en-US": ["新機能", "外部連携"] };
  
  const updated = await entry.update();
  console.log("✅ タグ更新完了");
  console.log("   設定されたタグ:", updated.fields.tags);
}
main().catch(console.error);
