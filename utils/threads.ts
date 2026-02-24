/**
 * Threads API ユーティリティ
 * Node.js 組み込みの fetch API を使用
 */

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

function getCredentials() {
  return {
    accessToken: process.env.THREADS_ACCESS_TOKEN!,
    userId: process.env.THREADS_USER_ID!,
  };
}

export interface PostToThreadsOptions {
  text: string;
}

export interface PostToThreadsResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * 少し待機する
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Threadsにポストを投稿
 *
 * Threads APIは2ステップ:
 * 1. メディアコンテナを作成
 * 2. 公開
 */
export async function postToThreads(options: PostToThreadsOptions): Promise<PostToThreadsResult> {
  try {
    const { text } = options;
    const { accessToken, userId } = getCredentials();

    // Step 1: メディアコンテナを作成
    const createParams = new URLSearchParams({
      media_type: "TEXT",
      text: text,
      access_token: accessToken,
    });
    const createUrl = `${THREADS_API_BASE}/${userId}/threads?${createParams.toString()}`;

    const createResponse = await fetch(createUrl, { method: "POST" });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create media container: ${error}`);
    }

    const createData = await createResponse.json();
    const containerId = createData.id;

    // メディアコンテナの準備を待つ
    await sleep(2000);

    // Step 2: 公開
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });
    const publishUrl = `${THREADS_API_BASE}/${userId}/threads_publish?${publishParams.toString()}`;

    const publishResponse = await fetch(publishUrl, { method: "POST" });

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Failed to publish: ${error}`);
    }

    const publishData = await publishResponse.json();
    const postId = publishData.id;

    // Threads投稿のURLを生成
    const postUrl = `https://www.threads.net/@openmi_naru/post/${postId}`;

    return {
      success: true,
      postId,
      postUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}
