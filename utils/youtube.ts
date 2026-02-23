/**
 * YouTube関連ユーティリティ
 * 字幕取得、URL解析、YouTube Data API v3
 */

import { fetchTranscript as fetchYouTubeTranscript } from "youtube-transcript-plus";

export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
    maxres?: string;
  };
  tags: string[];
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/**
 * YouTubeのURLからvideo IDを抽出
 * 対応形式:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - VIDEO_ID（直接指定）
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // 直接video IDの場合
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * youtube-transcript-plusで字幕取得
 * 日本語字幕を優先、なければ自動字幕
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptItem[]> {
  try {
    // まず日本語字幕を試行
    const items = await fetchYouTubeTranscript(videoId, { lang: "ja" });
    return items as TranscriptItem[];
  } catch {
    // 日本語がなければデフォルト（自動字幕含む）
    const items = await fetchYouTubeTranscript(videoId);
    return items as TranscriptItem[];
  }
}

/**
 * 字幕を1つのテキストに結合
 * 重複する改行やスペースを整理
 */
export function mergeTranscript(items: TranscriptItem[]): string {
  return items
    .map((item) => item.text.trim())
    .filter((text) => text.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 字幕の総時間（秒）を計算
 */
export function getTranscriptDuration(items: TranscriptItem[]): number {
  if (items.length === 0) return 0;
  const lastItem = items[items.length - 1];
  return Math.ceil(lastItem.offset + lastItem.duration);
}

/**
 * 秒を mm:ss 形式にフォーマット
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ISO 8601 duration (PT1H2M3S) を秒に変換
 */
function parseIsoDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * YouTube Data API v3 で動画メタデータを取得
 * 環境変数 YOUTUBE_API_KEY が必要
 */
export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  YOUTUBE_API_KEY が設定されていません。メタデータ取得をスキップします。");
    return null;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ YouTube API エラー:", error);
    return null;
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    console.warn("⚠️  動画が見つかりませんでした");
    return null;
  }

  const item = data.items[0];
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;
  const statistics = item.statistics;

  const durationSeconds = parseIsoDuration(contentDetails.duration);

  return {
    title: snippet.title || "",
    description: snippet.description || "",
    channelTitle: snippet.channelTitle || "",
    channelId: snippet.channelId || "",
    publishedAt: snippet.publishedAt || "",
    thumbnails: {
      default: snippet.thumbnails?.default?.url,
      medium: snippet.thumbnails?.medium?.url,
      high: snippet.thumbnails?.high?.url,
      maxres: snippet.thumbnails?.maxres?.url,
    },
    tags: snippet.tags || [],
    duration: formatDuration(durationSeconds),
    viewCount: parseInt(statistics.viewCount || "0", 10),
    likeCount: parseInt(statistics.likeCount || "0", 10),
    commentCount: parseInt(statistics.commentCount || "0", 10),
  };
}
