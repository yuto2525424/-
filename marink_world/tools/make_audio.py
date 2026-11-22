#!/usr/bin/env python3
"""EPISODE 00 用のオリジナルBGM・効果音を生成する。

外部の音源・素材は一切使わず、サイン波とノイズだけで作る（権利的に安全）。
出力: audio/bgm_mix.wav（38秒・48kHz・ステレオ・16bit）

使い方:
  python3 tools/make_audio.py
必要なもの: Python 3 と numpy
"""
import pathlib
import wave

import numpy as np

SR = 48000
DUR = 38.0
N = int(SR * DUR)
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / "bgm_mix.wav"
rng = np.random.default_rng(20260101)


def midi(n: float) -> float:
    return 440.0 * 2.0 ** ((n - 69) / 12.0)


def smooth(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def add(buf: np.ndarray, start: float, sig: np.ndarray) -> None:
    i = int(start * SR)
    if i >= N:
        return
    seg = sig[: max(0, N - i)]
    buf[i : i + len(seg)] += seg


def pad(freq: float, dur: float, amp: float, attack: float, release: float, vib: float = 0.0015) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1.0 + vib * np.sin(2 * np.pi * 4.2 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.4) + 0.06 * np.sin(3 * ph)
    env = smooth(t / attack) * smooth((dur - t) / release)
    return amp * s * env


def bell(freq: float, amp: float, dur: float = 2.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.2)
    s += 0.3 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 4.0)
    s += 0.12 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 7.0)
    return amp * s


def pop(f0: float, f1: float, amp: float, dur: float = 0.09) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * np.exp(-t * 38.0)


def bubble(amp: float) -> np.ndarray:
    dur = 0.13
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 300.0 + 520.0 * (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * np.exp(-t * 32.0)


def kick(amp: float) -> np.ndarray:
    dur = 0.25
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 110.0 * np.exp(-t * 14.0) + 45.0
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * np.exp(-t * 16.0)


def click(amp: float) -> np.ndarray:
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 1100.0 * t) * np.exp(-t * 90.0)
    noise = rng.standard_normal(n) * np.exp(-t * 300.0)
    return amp * (0.6 * tone + 0.4 * noise)


def whoosh(dur: float, amp: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    kernel = np.ones(40) / 40.0
    low = np.convolve(noise, kernel, mode="same")
    env = np.sin(np.pi * np.clip(t / dur, 0.0, 1.0)) ** 2
    return amp * low * env * 4.0


def main() -> None:
    buf = np.zeros(N)

    # --- 持続音（和音が場面に合わせて変わる。each chord overlaps for smooth crossfades）
    chords = [
        (0.0, 12.0, [50, 53, 57, 60, 64]),   # Dm9 系：静かな導入
        (12.0, 20.0, [46, 50, 53, 57]),      # B♭maj7：海中
        (20.0, 25.0, [43, 46, 50, 53]),      # Gm7：調査
        (25.0, 32.0, [53, 57, 60, 64]),      # Fmaj7：3つの世界
        (32.0, 38.0, [48, 55, 60, 64]),      # C：エンディングで解決
    ]
    for start, end, notes in chords:
        dur = end - start + 1.6
        for n in notes:
            add(buf, start, pad(midi(n), dur, 0.045, 1.2, 1.4))
            add(buf, start, pad(midi(n + 12), dur, 0.012, 1.6, 1.4))
        add(buf, start, bell(midi(notes[-1] + 12), 0.10))

    # --- 水の環境音（ノイズを低域に通した音。水中で少し強める）
    water = np.convolve(rng.standard_normal(N), np.ones(90) / 90.0, mode="same") * 2.2
    env = np.full(N, 0.35)
    t_axis = np.arange(N) / SR
    env[(t_axis >= 12.0) & (t_axis < 16.0)] = 0.85
    env[t_axis < 3.0] = 0.5
    buf += 0.05 * water * env

    # --- 冒頭のインパクト（0秒）：低音の衝撃＋シンバル風のノイズ＋きらめき
    n_imp = int(0.9 * SR)
    ti = np.arange(n_imp) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(140.0, 35.0, n_imp)) / SR) * np.exp(-ti * 4.5)
    add(buf, 0.0, 0.75 * sweep)
    crash = rng.standard_normal(int(1.2 * SR))
    crash = np.diff(crash, prepend=0.0) * np.exp(-np.arange(len(crash)) / SR * 3.0)
    add(buf, 0.0, 0.22 * crash)
    add(buf, 0.35, bell(1568.0, 0.12))

    # --- ビート（0.5秒ごとのキック）：3秒から32秒まで、画面の動きに合わせて鼓動を作る
    for k in range(int((32.0 - 3.2) / 0.5) + 1):
        add(buf, 3.2 + k * 0.5, kick(0.16))

    # --- 場面の切り替えのスウィッシュ
    for at in (12.0, 16.0, 20.0, 25.0):
        add(buf, at - 0.4, whoosh(0.9, 0.09))

    # --- S2 タイトル・S3 の和音
    for f in (523.25, 659.25, 783.99):
        add(buf, 3.2, bell(f, 0.14))

    # --- S3 選択肢の出現音 / S7 の出現音
    for at in (9.2, 9.8, 10.4, 27.4, 27.9, 28.4):
        add(buf, at, pop(500.0, 900.0, 0.22))

    # --- S4 泡の音（水中）
    for _ in range(12):
        add(buf, rng.uniform(12.6, 16.2), bubble(0.10))

    # --- S5 建設音（ブロックが出現する瞬間）
    for i in range(6):
        add(buf, 16.4 + i * 0.25, click(0.22))
    add(buf, 18.6, bell(1046.5, 0.13))
    add(buf, 18.6, bell(1318.5, 0.11))

    # --- S6 発見の音
    add(buf, 23.9, bell(783.99, 0.18))
    add(buf, 23.9, bell(1046.5, 0.16))

    # --- S8 エンディング
    for f in (523.25, 659.25, 783.99, 1046.5):
        add(buf, 35.0, bell(f, 0.09))
    for f in (261.63, 392.0, 523.25):
        add(buf, 36.4, bell(f, 0.12, dur=3.0))

    # --- 仕上げ：ソフトクリップ、ピーク正規化、末尾のフェードアウト
    buf = np.tanh(buf * 1.1)
    buf *= 0.85 / max(1e-9, np.max(np.abs(buf)))
    tail = int(0.6 * SR)
    buf[-tail:] *= np.linspace(1.0, 0.0, tail)
    head = int(0.05 * SR)
    buf[:head] *= np.linspace(0.0, 1.0, head)

    # 右chは5msだけ遅らせて広がりを出す
    delay = int(0.005 * SR)
    left = buf
    right = np.concatenate([np.zeros(delay), buf[:-delay]])
    stereo = np.stack([left, right], axis=1)
    pcm = (np.clip(stereo, -1.0, 1.0) * 32767).astype("<i2")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {OUT} ({DUR:.1f}s, {SR} Hz, stereo)")


if __name__ == "__main__":
    main()
