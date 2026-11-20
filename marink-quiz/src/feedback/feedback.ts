import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * 効果音と触覚フィードバック。
 * 設定（オン・オフ）は呼び出し側で渡す。失敗しても操作は止めない。
 */
export type SoundName = 'tap' | 'correct' | 'wrong';

const SOURCES: Record<SoundName, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
};

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let audioReady = false;

function getPlayer(name: SoundName): AudioPlayer {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  return player;
}

async function ensureAudioMode(): Promise<void> {
  if (audioReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: false });
    audioReady = true;
  } catch {
    // 音声の初期化に失敗しても、ゲームは無音で続行する
  }
}

export async function playSound(name: SoundName, enabled: boolean): Promise<void> {
  if (!enabled) return;
  try {
    await ensureAudioMode();
    const player = getPlayer(name);
    await player.seekTo(0);
    player.play();
  } catch {
    // 再生できない環境では無音
  }
}

export type HapticKind = 'light' | 'success' | 'error';

export async function haptic(kind: HapticKind, enabled: boolean): Promise<void> {
  if (!enabled) return;
  try {
    if (kind === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (kind === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch {
    // シミュレータや非対応端末では何もしない
  }
}
