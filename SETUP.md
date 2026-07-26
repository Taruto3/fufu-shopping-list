# Firebase設定手順

このアプリは、GitHub Pagesに画面を置き、買い物リストをFirebaseに保存します。

## 1. Firebaseプロジェクト

1. https://console.firebase.google.com/ を開く
2. 「プロジェクトを作成」
3. プロジェクト名を入力（例：`fufu-shopping-list`）
4. Google Analyticsは不要なら無効で構いません

## 2. Googleログイン

1. 「Authentication」→「始める」
2. 「ログイン方法」→「Google」を有効化
3. サポートメールを選択して保存

## 3. Firestore

1. 「Firestore Database」→「データベースの作成」
2. 本番環境モードを選択
3. 近いリージョン（例：東京）を選択
4. このフォルダの `firestore.rules` を開く
5. `YOUR_GOOGLE_EMAIL_1` と `YOUR_GOOGLE_EMAIL_2` を夫婦のGoogleメールアドレスへ変更
6. Firestoreの「ルール」へ全文を貼り、公開

このルールにより、登録した2つのGoogleアカウント以外は読み書きできません。

## 4. Webアプリ設定

1. Firebaseの「プロジェクトの設定」を開く
2. 「マイアプリ」で Web（`</>`）を追加
3. 表示された `firebaseConfig` の値を、このフォルダの `firebase-config.js` へコピー

FirebaseのAPIキーはWebアプリでは公開される識別情報です。秘密情報ではありません。アクセス制御はFirestoreルールで行います。

## 5. GitHub Pages

1. このフォルダをGitHubの新しいリポジトリへ公開
2. GitHubの「Settings」→「Pages」
3. Sourceを「Deploy from a branch」
4. Branchを `main`、フォルダを `/ (root)` にして保存
5. 発行されたURLのドメイン（例：`taruto3.github.io`）をFirebase Authenticationの「Settings」→「Authorized domains」へ追加

数分後、GitHub PagesのURLから利用できます。
