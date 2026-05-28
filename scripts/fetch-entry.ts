import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import contentfulManagement from "contentful-management";

const { createClient } = contentfulManagement;
const SPACE_ID = process.env.BRIGHTY_INFO_SPACE_ID!;
const ENVIRONMENT_ID = process.env.BRIGHTY_INFO_ENVIRONMENT_ID!;
const MANAGEMENT_TOKEN = process.env.BRIGHTY_INFO_MANAGEMENT_TOKEN!;

async function main() {
  const entryId = process.argv[2] || "2kVbyIbBXBk071bSI8zugZ";
  const client = createClient({ accessToken: MANAGEMENT_TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);
  const entry = await environment.getEntry(entryId);
  console.log(JSON.stringify(entry.fields, null, 2));
}
main().catch(console.error);
