# Brighty ブログ記事自動投稿

Contentful Management API を使用してBrightyブログに記事を投稿するツール。

## コマンド

```bash
pnpm run fetch-note --url="[URL]" --category="[category]"  # note記事取得
pnpm run fetch-youtube --url="[URL]"                        # YouTube動画から記事生成
pnpm run validate --file="[filename]"                       # JSON検証
pnpm run publish --file="[filename]"                        # ドラフト投稿
pnpm run publish:live --file="[filename]"                   # 公開投稿
pnpm run publish:info --file="[filename]"                   # Info記事投稿
pnpm run post:x --title="..." --url="..."                   # X投稿
pnpm run post:sns --title="..." --url="..."                 # X+Threads同時投稿
```

## カスタムコマンド（スキル）

- `/post-note [URL]` - note記事をContentfulに投稿
- `/post-youtube [URL]` - YouTube動画から記事生成・投稿
- `/post-info [内容]` - Brighty Infoにお知らせ/リリースノート投稿

## カテゴリ

| ID | 用途 |
|----|------|
| `psychology` | 心理学・自己理解 |
| `career` | キャリア・転職 |
| `coaching-story` | 体験談・創業ストーリー |
| `tips` | ノウハウ・Tips |
| `interview` | インタビュー・コーチ紹介 |

## ディレクトリ

- `articles/pending/` - 投稿待ちJSON
- `articles/published/` - 投稿済みログ
- `info/pending/` - Info記事待ち
- `templates/` - JSONスキーマ・テンプレート
- `config/` - 設定ファイル（SEOルール等）
- `.claude/skills/` - スキル定義（/post-note等）

## 注意事項

- パッケージマネージャは `pnpm` を使用
- 環境変数は `.env.local` に設定（gitignore対象）
- JSONファイル編集時は確認なしで即座に反映
- slug: 半角英小文字・数字・ハイフンのみ、3〜5単語
