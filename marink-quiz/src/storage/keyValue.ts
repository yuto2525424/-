import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 端末内保存の薄いラッパー。
 * 保存先が使えない・壊れている場合でもアプリが落ちないよう、読み込みは fallback を返し、書き込みは失敗を握りつぶさず false を返す。
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeKey(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
