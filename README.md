# Brighty ブログ記事自動投稿

Contentful Management API を使って、Brightyのブログ記事をプログラムから投稿するツール。

## セットアップ

```bash
cd auto_blog_post
pnpm install

cp .env.example .env.local
# .env.local を編集して CONTENTFUL_MANAGEMENT_TOKEN を設定
```

## コマンド一覧

### Makefile（推奨）

```bash
make help              # ヘルプ表示
make generate CATEGORY=psychology  # 記事データ生成
make validate          # 記事データ検証
make drafts            # Contentfulドラフト一覧
make publish           # ドラフト投稿
make publish-live      # 公開投稿
```

### npm scripts

```bash
pnpm run generate --category=psychology  # 記事データ生成
pnpm run validate                         # 検証
pnpm run drafts                           # ドラフト一覧
pnpm run publish                          # ドラフト投稿
pnpm run publish:live                     # 公開投稿
```

## ワークフロー

### 1. 記事データを生成

```bash
make generate CATEGORY=career NAME=my-article
# → articles/pending/my-article.json が作成される
```

### 2. 記事を編集

`articles/pending/my-article.json` を編集して記事内容を入力。

### 3. バリデーション

```bash
make validate
# または特定ファイルのみ
make validate FILE=my-article.json
```

### 4. Contentfulに投稿

```bash
make publish        # ドラフトとして投稿
make publish-live   # 公開投稿
```

### 5. ドラフト確認

```bash
make drafts  # Contentful上のドラフト記事一覧
```

## ディレクトリ構成

```
auto_blog_post/
├── config/
│   ├── default.ts        # デフォルト設定
│   └── prompts.ts        # AI生成用プロンプト（将来用）
├── articles/
│   ├── pending/          # 投稿待ち記事（JSON）
│   └── published/        # 投稿済みログ
├── scripts/
│   ├── publish.ts        # Contentful投稿
│   ├── generate.ts       # 記事データ生成
│   ├── validate.ts       # バリデーション
│   └── list-drafts.ts    # ドラフト一覧
├── templates/
│   ├── article.json      # 記事テンプレート
│   └── article.schema.json  # JSONスキーマ
├── data/
│   └── test-articles.ts  # テスト記事
└── Makefile
```

## カテゴリ

| ID | 名前 | デフォルトCTA |
|----|------|--------------|
| `psychology` | 心理学 | find-coach |
| `career` | キャリア | find-coach |
| `coaching-story` | 体験談 | find-coach |
| `tips` | Tips | find-coach |
| `interview` | インタビュー | register-coach |

## Content Type フィールド

| Field ID | タイプ | 必須 |
|----------|--------|------|
| `title` | Symbol | Yes |
| `slug` | Symbol | Yes |
| `body` | RichText | Yes |
| `excerpt` | Text | Yes |
| `thumbnail` | Link (Asset) | Yes |
| `category` | Symbol | Yes |
| `tags` | Array | No |
| `youtubeUrl` | Symbol | No |
| `metaDescription` | Symbol | Yes |
| `ogpText` | Symbol | No |
| `ctaType` | Symbol | No |
| `relatedPosts` | Array | No |
