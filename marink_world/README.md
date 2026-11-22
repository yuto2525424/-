# MARINK WORLD — EPISODE 00「はじまりの選択」

Instagramリール用の約38秒の3D動画（1080×1920 / 30fps / H.264 + AAC）を、Godot 4.4 で作ったプロジェクトです。

## 構成
- `project.godot` / `scenes/episode00.tscn` — Godot プロジェクト（メインシーンは `episode00.tscn`）
- `scripts/episode00.gd` — 時間 `t` に基づく演出・字幕・選択肢・暗転の制御
- `scripts/camera_track.gd` — カメラ移動（キーフレーム補間）
- `scripts/world_builders.gd` — 低ポリゴン部品から海・島・調査船・生き物を生成
- `shaders/water.gdshader` — 海面の波と色
- `config/options.json` — 選択肢（1 海を育てる / 2 水族館を作る / 3 海底を調査する）。番号・名称は固定
- `config/vote_config.json` — いいね → 発展ポイントの換算（`points_per_like`）。後から変更可能
- `data/votes/episode00.json` — 投票結果（option_1_votes〜option_3_votes, total_likes, selected_route, development_points）
- `tools/vote_tool.py` — 投票の手動入力と判定（標準ライブラリのみ）
- `tools/make_audio.py` — BGM・効果音をサイン波とノイズから生成（外部素材なし）→ `audio/bgm_mix.wav`
- `tools/export_episode00.sh` — Godot の Movie Maker で映像を書き出し、ffmpeg で MP4 にする
- `fonts/ipag.ttf` — IPAゴシック（IPAフォントライセンス、`fonts/IPAfont_LICENSE.txt`）
- `exports/episode00_final.mp4` — 完成動画（1080×1920）

## 書き出し手順
1. Godot 4.4.1（公式版）を用意し、実行ファイルのパスを `GODOT_BIN` に指定
2. 必要なツール: `ffmpeg`, `xvfb-run`（画面のないサーバーで実行する場合）
3. 実行:
   ```
   GODOT_BIN=/path/to/Godot_v4.4.1-stable_linux.x86_64 tools/export_episode00.sh final     # 1080x1920
   GODOT_BIN=/path/to/Godot_v4.4.1-stable_linux.x86_64 tools/export_episode00.sh preview   # 540x960
   ```

## 投票の運用（手動）
```
python3 tools/vote_tool.py set --o1 12 --o2 30 --o3 7 --likes 180   # 集計を入力
python3 tools/vote_tool.py decide            # 暫定判定（保存しない）
python3 tools/vote_tool.py decide --final    # 確定して保存
```
- 投票0件、または最多得票が同点のときは `selected_route` を `undecided` のままにします。
- `development_points` = `total_likes` × `points_per_like`。
- 第0話の投票結果に基づく世界の開発は第1話以降に行います。

## 注意
- 海洋生物は実在種の特徴を簡略化したものです（カクレクマノミ風の白帯、ナンヨウハギ風の青と黄の尾、ヒトデ、コンブ、枝状サンゴ）。
- 「海を育てる」の映像は将来の発展イメージであり、生態系が数秒で成立する科学的説明ではありません。
- 深海の表現は使っていません（浅い海の調査）。
- 既存のリポジトリ内のファイルは変更していません。
