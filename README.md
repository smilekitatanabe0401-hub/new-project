# LINE向け PDF一覧ページ（静的サイト）

LINEのリッチメニュー/メッセージから開くことを想定した、スマホ向けのPDF一覧ページです。  
ビルド不要で、`public/config.js` にCSV URLを設定するだけで動きます。

## 1. ファイル構成

- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/config.js`
- `sheet-template.csv`

## 1.1 ロゴ設定（任意）

`public/config.js` の `branding.logoCandidates` にロゴ画像URLを設定できます。  
先頭から順に読み込み、表示可能なURLを1つ採用します。

## 2. スプレッドシート台帳（列仕様）

Googleスプレッドシートの1行目を見出しとして、以下の列を作成してください。

- `category`（例: おたより / 避難 / 同意書 / 提出物）
- `title`
- `date`（`YYYY-MM-DD`）
- `url`（PDFリンク。Google Drive共有リンク / `/pdf/` 配下URL どちらでも可）
- `note`（任意）
- `pin`（`TRUE` or `FALSE`）

### 入力例

| category | title | date | url | note | pin |
|---|---|---|---|---|---|
| おたより | 4月園だより | 2026-04-01 | https://example.com/pdf/april.pdf | 行事予定あり | TRUE |
| 提出物 | 健康調査票 | 2026-03-20 | https://drive.google.com/file/d/xxxx/view?usp=sharing | 4/10まで提出 | FALSE |

## 3. スプレッドシート公開手順（CSV）

1. 対象のGoogleスプレッドシートを開く
2. `ファイル` → `共有` → `ウェブに公開`
3. シートを選択し、形式を `CSV` に設定して公開
4. 発行されたCSV URLをコピー
5. `public/config.js` の `csvUrl` に貼り付け

```js
window.PDF_LIST_CONFIG = {
  csvUrl: "ここに公開CSV URL",
  cacheBuster: true
};
```

`cacheBuster: true` の場合、CSV取得時に `?v=timestamp` が自動付与されます。

## 4. 画面機能

- 検索（`title` / `category` / `note` の部分一致）
- カテゴリ絞り込み
- 並び替え（新しい順 / 古い順 / タイトル順）
- `pin=TRUE` を最上部（重要資料セクション）に表示
- `PDFを開く` ボタンで新規タブ表示（`target="_blank"`）

## 5. 更新手順（職員向け）

1. スプレッドシートに新しい行を追加
2. `category / title / date / url / note / pin` を入力
3. 保存後、ページを再読み込み

※ `title` と `url` が空の行は表示されません。

### 台帳テンプレートを使う場合

リポジトリ直下の `sheet-template.csv` をそのまま使えます。

1. Googleスプレッドシートで新規シートを作成
2. `ファイル` → `インポート` → `アップロード` で `sheet-template.csv` を選択
3. 既存データを置換するか新しいシートとして読み込む
4. サンプル行を自分の実データに置き換える

## 6. ローカル確認手順（検証済み）

プロジェクトルート (`/Users/smile/Documents/New project`) で以下を実行:

```bash
python3 -m http.server 8000
```

ブラウザで次を開いて確認:

- `http://localhost:8000/public/`
- `http://localhost:8000/public/styles.css`
- `http://localhost:8000/public/app.js`

このリポジトリでは上記3パスが `HTTP 200` で返ることを確認済みです。

## 7. GitHub Pages デプロイ手順（`/public/` を公開）

1. このリポジトリをGitHubへpush（デフォルトブランチ `main`）
2. GitHubリポジトリの `Settings` → `Pages`
3. `Build and deployment` の `Source` を `Deploy from a branch` に設定
4. Branchを `main`、フォルダを `/ (root)` に設定して保存
5. 1〜5分待って、公開URLに `public/` を付けて開く
6. 例: `https://<user>.github.io/<repo>/public/`

補足:
- `public/index.html` 内の `./styles.css`, `./config.js`, `./app.js` は相対パスで参照しているため、`/public/` 配下で正しく動作します。
- リポジトリ直下の `index.html` から `./public/` へ自動遷移するため、`https://<user>.github.io/<repo>/` でも開けます。
- もし `404` になる場合は、`Settings > Pages` で branch/folder 設定を再確認してください。

## 8. 初回コミットとPush（任意）

```bash
git add .
git commit -m "feat: add LINE PDF list static site"
git push -u origin main
```

`git push` はリモート設定（`origin`）後に実行してください。

## 9. LINEでの利用メモ

- LINEのリッチメニュー/メッセージにページURLを設定
- スマホで見やすいよう、文字サイズ・余白・コントラストを確保済み
- Google Driveの共有設定は「リンクを知っている全員が閲覧可」に設定
