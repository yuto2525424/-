#!/usr/bin/env python3
"""Google Cloud Text-to-Speech で日本語ナレーションを生成する。

APIキーは環境変数 GOOGLE_TTS_API_KEY から読む（キーはファイルに書かない）。
Claudeの環境では、ネットワーク秘密情報（ヘッダー x-goog-api-key）として登録されていれば自動で付きます。
環境変数で設定する場合は、このスクリプトが x-goog-api-key ヘッダーとして送ります。

使い方:
  GOOGLE_TTS_API_KEY=... python3 tools/google_tts_narration.py
  VOICE=ja-JP-Neural2-B python3 tools/google_tts_narration.py   # 声を変える場合（任意）

出力: audio/narration_src/01.wav 〜 09.wav（48kHz・モノラル・16bit）
"""
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "narration.json"
OUT_DIR = ROOT / "audio" / "narration_src"
URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
VOICE = os.environ.get("VOICE", "ja-JP-Neural2-B")
SPEAKING_RATE = float(os.environ.get("SPEAKING_RATE", "1.05"))


def synthesize(text: str, key: str) -> bytes:
    body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "ja-JP", "name": VOICE},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": 48000,
            "speakingRate": SPEAKING_RATE,
            "pitch": 0.0,
        },
    }).encode("utf-8")
    req = urllib.request.Request(URL, data=body, method="POST")
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("x-goog-api-key", key)
    with urllib.request.urlopen(req, timeout=60) as res:
        data = json.loads(res.read().decode("utf-8"))
    return base64.b64decode(data["audioContent"])


def main() -> None:
    key = os.environ.get("GOOGLE_TTS_API_KEY", "").strip()
    if not key:
        sys.exit("GOOGLE_TTS_API_KEY が設定されていません。キーを環境に登録してから実行してください。")
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"voice={VOICE} rate={SPEAKING_RATE}")
    for line in config["lines"]:
        try:
            wav = synthesize(line["text"], key)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            sys.exit(f"{line['id']} でエラー（HTTP {e.code}）: {detail}")
        path = OUT_DIR / f"{line['id']}.wav"
        path.write_bytes(wav)
        print(f"  {line['id']} {len(wav) / 96000:.2f}s  {line['text']}")
    print(f"完了: {OUT_DIR}")


if __name__ == "__main__":
    main()
