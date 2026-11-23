#!/usr/bin/env python3
"""Google Cloud Text-to-Speech で日本語ナレーションを生成する。

APIキーは環境変数 GOOGLE_TTS_API_KEY から読む（キーはファイルに書かない）。
Claudeの環境では、ネットワーク秘密情報（ヘッダー x-goog-api-key）として登録されていれば自動で付きます。
環境変数で設定する場合は、このスクリプトが x-goog-api-key ヘッダーとして送ります。

使い方:
  GOOGLE_TTS_API_KEY=... python3 tools/google_tts_narration.py
  VOICE=ja-JP-Chirp3-HD-Leda python3 tools/google_tts_narration.py   # 声を変える場合（任意）

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
VOICE = os.environ.get("VOICE", "ja-JP-Chirp3-HD-Aoede")
SPEAKING_RATE = float(os.environ.get("SPEAKING_RATE", "1.2"))


def to_ssml(text: str, emphasis: str) -> str:
    """間と強調を付けて、感情が伝わる話し方にする（Neural2 の SSML）。"""
    t = text.replace("、", '、<break time="180ms"/>').replace("。", '。<break time="320ms"/>')
    t = t.replace("？", '？<break time="200ms"/>').replace("！", '！<break time="200ms"/>')
    if emphasis and emphasis in t:
        t = t.replace(emphasis, f'<emphasis level="strong">{emphasis}</emphasis>', 1)
    return f'<speak><prosody rate="110%" pitch="+1.5st">{t}</prosody></speak>'


def to_ssml_chirp(text: str, emphasis: str) -> str:
    t = text.replace("、", '、<break time="80ms"/>').replace("。", '。<break time="200ms"/>')
    t = t.replace("？", '？<break time="160ms"/>').replace("！", '！<break time="160ms"/>')
    if emphasis and emphasis in t:
        t = t.replace(emphasis, f'<emphasis level="moderate">{emphasis}</emphasis>', 1)
    return f"<speak>{t}</speak>"


def synthesize(text: str, key: str, emphasis: str = "") -> bytes:
    if "Neural2" in VOICE or "Wavenet" in VOICE:
        payload_input = {"ssml": to_ssml(text, emphasis)}
    elif "Chirp3" in VOICE:
        # Chirp3-HD は間と強調のSSMLに対応（音の高さ・速さのSSMLは使わない）
        payload_input = {"ssml": to_ssml_chirp(text, emphasis)}
    else:
        payload_input = {"text": text}
    body = json.dumps({
        "input": payload_input,
        "voice": {"languageCode": "ja-JP", "name": VOICE},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": 48000,
            "speakingRate": SPEAKING_RATE,
        },
    }).encode("utf-8")
    req = urllib.request.Request(URL, data=body, method="POST")
    req.add_header("Content-Type", "application/json; charset=utf-8")
    if key:
        req.add_header("x-goog-api-key", key)
    with urllib.request.urlopen(req, timeout=60) as res:
        data = json.loads(res.read().decode("utf-8"))
    return base64.b64decode(data["audioContent"])


def main() -> None:
    # キーは環境変数で渡すか、ネットワーク秘密情報として登録しておく（その場合はヘッダーが自動で付く）
    key = os.environ.get("GOOGLE_TTS_API_KEY", "").strip()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"voice={VOICE} rate={SPEAKING_RATE}")
    for line in config["lines"]:
        try:
            wav = synthesize(line["text"], key, line.get("emphasis", ""))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            sys.exit(f"{line['id']} でエラー（HTTP {e.code}）: {detail}")
        path = OUT_DIR / f"{line['id']}.wav"
        path.write_bytes(wav)
        print(f"  {line['id']} {len(wav) / 96000:.2f}s  {line['text']}")
    print(f"完了: {OUT_DIR}")


if __name__ == "__main__":
    main()
