/**
 * X (Twitter) API ユーティリティ
 */

import { TwitterApi } from "twitter-api-v2";

// クライアントを遅延初期化
let _client: TwitterApi | null = null;

function getClient(): TwitterApi {
  if (!_client) {
    _client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_KEY_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    });
  }
  return _client;
}

export interface PostToXOptions {
  text: string;
}

export interface PostToXResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

/**
 * Xにポストを投稿
 */
export async function postToX(options: PostToXOptions): Promise<PostToXResult> {
  try {
    const { text } = options;

    // 文字数チェック (280文字制限、日本語は2文字換算だが実際は複雑)
    if (text.length > 280) {
      return {
        success: false,
        error: `投稿文が長すぎます (${text.length}文字)。280文字以内にしてください。`,
      };
    }

    const client = getClient();
    const tweet = await client.v2.tweet(text);

    const tweetId = tweet.data.id;
    const tweetUrl = `https://x.com/openmi_naru/status/${tweetId}`;

    return {
      success: true,
      tweetId,
      tweetUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}

