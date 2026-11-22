#!/usr/bin/env bash
# MARINK WORLD EPISODE 00 の書き出し。
#   1) Godot の Movie Maker で映像（AVI）を書き出す（仮想ディスプレイ上で実行）
#   2) ffmpeg で音声を合成し、Instagram リール向けの MP4（H.264 / AAC）にする
#
# 使い方:
#   GODOT_BIN=/path/to/Godot_v4.4.1-stable_linux.x86_64 tools/export_episode00.sh final    # 1080x1920
#   GODOT_BIN=/path/to/Godot_v4.4.1-stable_linux.x86_64 tools/export_episode00.sh preview  # 540x960
#
# 必要なもの: Godot 4.4 実行ファイル, ffmpeg, xvfb-run（ヘッドレス環境の場合）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GODOT_BIN="${GODOT_BIN:?GODOT_BIN に Godot 4.4 の実行ファイルのパスを指定してください}"
MODE="${1:-final}"
OUT_DIR="$ROOT/exports"
BGM="$ROOT/audio/bgm_mix.wav"
mkdir -p "$OUT_DIR"

case "$MODE" in
  final)   W=1080; H=1920; NAME="episode00_final.mp4"; PRESET=slow ;;
  preview) W=540;  H=960;  NAME="episode00_preview.mp4"; PRESET=veryfast ;;
  *) echo "使い方: $0 [final|preview]"; exit 1 ;;
esac
RAW="$OUT_DIR/episode00_raw_${W}x${H}.avi"

if [[ ! -f "$BGM" ]]; then
  python3 "$ROOT/tools/make_audio.py"
fi

# Godot の初回インポート（フォント・WAV の .import 生成）
"$GODOT_BIN" --headless --path "$ROOT" --import >/dev/null 2>&1 || true

RUNNER=()
if command -v xvfb-run >/dev/null 2>&1; then
  RUNNER=(xvfb-run -a -s "-screen 0 1920x1080x24")
fi

echo "== 映像の書き出し (${W}x${H}, 30fps) =="
"${RUNNER[@]}" "$GODOT_BIN" --path "$ROOT" \
  --resolution "${W}x${H}" \
  --fixed-fps 30 \
  --rendering-method gl_compatibility \
  --audio-driver Dummy \
  --write-movie "$RAW"

echo "== MP4 への変換（音声を合成）=="
ffmpeg -y -v error \
  -i "$RAW" -i "$BGM" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset "$PRESET" -crf 18 -pix_fmt yuv420p -r 30 -profile:v high \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -t 38 -movflags +faststart \
  "$OUT_DIR/$NAME"

echo "== 完成ファイル =="
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate \
  -of default=noprint_wrappers=1 "$OUT_DIR/$NAME"
echo "出力: $OUT_DIR/$NAME"
