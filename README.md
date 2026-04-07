# GitHub Pages版 3択問題PDF作成ツール
情報処理の時間に使う
## できること
- `questions.csv` に問題を保存
- 各問題は 6択で登録
- 実際の出題では **正解を含む3択** を自動作成
- 分野番号でしぼりこみ
- 10問を自動作成
- 問題用と解答用を印刷し、PDF保存可能

## ファイル
- `index.html`
- `questions.csv`

## questions.csv の列
- `field_no` : 分野番号
- `question_no` : 問題番号
- `question` : 問題文
- `choice1` ～ `choice6` : 選択肢
- `answer_no` : 正解番号（1〜6）

## GitHubへの置き方
1. 新しい GitHub リポジトリを作る
2. `index.html` と `questions.csv` をアップロード
3. Settings → Pages → Deploy from a branch → main / root
4. 公開URLを開く

## 使い方
1. `questions.csv` を GitHub 上で編集
2. 公開ページを開く
3. 分野番号と出題問数を指定
4. 「10問を作成」を押す
5. 「問題を印刷/PDF保存」または「解答を印刷/PDF保存」を押す

## 注意
- PDFはブラウザの印刷機能で保存します
- 出題は毎回ランダムなので、作り直すと選択肢の組み合わせが変わります
