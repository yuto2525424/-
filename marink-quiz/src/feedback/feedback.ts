import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * 効果音・触覚・BGM。
 * 設定は configureFeedback で渡す。どの呼び出しも失敗しても操作は止めない。
 */
export type SoundName = 'tap' | 'correct' | 'wrong';

interface FeedbackConfig {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  bgmEnabled: boolean;
}

let config: FeedbackConfig = { soundEnabled: true, hapticsEnabled: true, bgmEnabled: true };

export function configureFeedback(next: FeedbackConfig): void {
  config = next;
  if (!next.bgmEnabled) void stopBgm();
}

const SOURCES: Record<SoundName, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
};

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let bgmPlayer: AudioPlayer | null = null;
let audioReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: false });
    audioReady = true;
  } catch {
    // 音声の初期化に失敗しても、ゲームは無音で続行する
  }
}

function getPlayer(name: SoundName): AudioPlayer {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  return player;
}

export async function playSound(name: SoundName): Promise<void> {
  if (!config.soundEnabled) return;
  try {
    await ensureAudioMode();
    const player = getPlayer(name);
    await player.seekTo(0);
    player.play();
  } catch {
    // 再生できない環境では無音
  }
}

/** BGMを始める（ブラウザでは最初の操作の後でないと鳴らないため、操作の中から呼ぶ） */
export async function startBgm(): Promise<void> {
  if (!config.bgmEnabled) return;
  try {
    await ensureAudioMode();
    if (!bgmPlayer) {
      bgmPlayer = createAudioPlayer(require('../../assets/sounds/bgm-mystic.wav'));
      bgmPlayer.loop = true;
      bgmPlayer.volume = 0.32;
    }
    if (!bgmPlayer.playing) bgmPlayer.play();
  } catch {
    // 再生できない環境では無音
  }
}

export async function stopBgm(): Promise<void> {
  try {
    bgmPlayer?.pause();
  } catch {
    // 無視
  }
}

export type HapticKind = 'light' | 'medium' | 'success' | 'error';

export async function haptic(kind: HapticKind): Promise<void> {
  if (!config.hapticsEnabled) return;
  try {
    if (kind === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // シミュレータや非対応端末では何もしない
  }
}

/** ボタンを押したときの手応え（短い音と振動） */
export function pressFeedback(): void {
  void haptic('light');
  void playSound('tap');
}

/** 正解・勝利の演出（音と強い振動） */
export function celebrate(): void {
  void playSound('correct');
  void haptic('success');
}

/** 不正解・ゲームオーバーの演出 */
export function disappoint(): void {
  void playSound('wrong');
  void haptic('error');
}
