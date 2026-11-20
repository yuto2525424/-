# MARINK｜この海の生き物、な〜んだ？

「海の生き物を、もっと面白く。」

AIが選んだ海洋生物を、10回以内の質問で推理するiPhone向けゲームです。
React Native（Expo SDK 58）・TypeScript・Expo Router で作られています。

## 遊び方（要点）

- 生き物は1種類伏せられています。自由な文章で質問すると、「はい」「いいえ」「どちらともいえない」で答えます。
- 質問は最大10回。途中でも名前を予想できます（正解でクリア、外しても質問は続行。予想ミスは3回まで）。
- 10回使い切ると、最後に1回だけ名前を回答します（外すとゲームオーバー）。
- 正解の評価ランク：1〜3問 S ／ 4〜5問 A ／ 6〜7問 B ／ 8〜10問 C

## 必要なもの

- Node.js 22（開発・検証に使用したバージョン）
- iPhone（Expo Go または開発ビルド）。iOS実機での確認は Mac + Xcode、または EAS Build を使用

## セットアップ・起動

```bash
cd marink-quiz
npm install            # .npmrc の legacy-peer-deps 設定で依存関係を解決します
npm start              # Expo 開発サーバー。QRコードを iPhone の「カメラ」で読み取り、Expo Go で開きます
```

Web 表示での動作確認（UIの動作確認用。アプリの対象は iPhone です）：

```bash
npm run web            # http://localhost:8081
```

## テスト・型チェック

```bash
npm test               # ロジック（回答エンジン・ゲーム状態遷移・成績・データ整合性）の単体テスト
npm run typecheck      # TypeScript（strict）
npx expo export --platform ios   # iOS 向けのバンドルが作れるかの確認
```

効果音（WAV）は `npm run sounds` で再生成できます（`scripts/make-sounds.mjs`）。

## フォルダ構成

```
app/                    画面（Expo Router のルート）
  _layout.tsx           全体の土台（状態プロバイダ・画面遷移）
  index.tsx             ホーム
  difficulty.tsx        難易度選択
  game.tsx              ゲーム画面（質問・回答・予想・履歴・降参）
  result.tsx            正解・不正解の結果画面
  zukan/                図鑑（一覧・詳細）
  stats.tsx             成績
  howto.tsx             遊び方
  settings.tsx          設定（効果音・触覚・記録の消去）
src/
  types.ts              生き物・回答の型（3択の定義を含む）
  data/species.ts       海洋生物データベース（初期版25種）
  domain/               ゲームロジック（UIに依存しない純粋な関数）
    demoAnswerer.ts     デモモードの回答エンジン（3択・未対応・拒否）
    game.ts             ゲームの状態遷移（質問回数と最終回答の分離）
    progress.ts         成績・図鑑の更新
    normalize.ts        名前の表記ゆれ判定（カタカナ・ひらがな・学名・英名）
    rank.ts             評価ランク
  services/
    answerProvider.ts   回答プロバイダの差し替え口（デモ／将来のAI）
  state/AppProvider.tsx アプリ全体の状態（保存・復元を含む）
  storage/              端末内保存（AsyncStorage。読み書きの失敗に強い作り）
  feedback/             効果音・触覚フィードバック
  components/           共通UI
  theme/                配色・余白などのデザイントークン
tests/                  単体テスト（vitest）
assets/sounds/          効果音（生成物）
scripts/make-sounds.mjs 効果音の生成
```

## 回答の仕組み（重要）

- **デモモード（現在の標準）**：アプリ内の生き物データだけで答えます。APIキーは不要です。
  - 登録された分類・生息環境・水深・体長・体色・食性・特徴に基づいて判定します。
  - データにない項目・個体差や地域差がある項目・境界付近の値は「どちらともいえない」にします。
  - 理解できない質問は、理解したふりをせず「未対応」と表示し、質問回数は消費しません。
  - 生き物の名前や正解そのものを聞かれた場合は答えません。
- **AIモード（未実装）**：`src/services/answerProvider.ts` の `AnswerProvider` を差し替えて接続します。
  - 設計方針：正解の生き物の管理と、AIへのAPIキーは **サーバー側** に置きます（アプリにAPIキーを含めません）。
  - AIの出力は `parseThreeWayAnswer` で検証し、3種類以外は受け付けません。

> 注意：デモモードは端末内にデータがあるため、技術的に詳しい人が通信内容や保存データを見れば正解を推測できます。
> 公開版で正解を守るには、AIモードのように正解をサーバー側のセッションで管理する構成が必要です。

## データの追加

`src/data/species.ts` に同じ形式で追加するだけで、ゲーム・図鑑・成績に反映されます。

- 科学的に確認できない項目は `null`（不明）にし、推測で埋めないでください。
- 出典は `source.references` に記載し、専門家の確認が済んだら `source.verified` を `true` にします。
- `npm test` が、ID・名前の重複、別名の衝突、数値範囲の誤り、分類の矛盾を検出します。

## 現在の状態

詳しい実装状況・未実装項目・外部サービスと料金・App Store 公開手順は、リポジトリの報告書を参照してください。
