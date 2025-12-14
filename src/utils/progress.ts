import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_KEY = '@watch_progress';

export interface WatchProgress {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  lastSeason: number;
  lastEpisode: number; // 1-based index
  position: number; // milliseconds watched
  duration: number; // total duration
  updatedAt: number;
}

// Save progress (Call this from your Player screen)
export const saveProgress = async (progress: WatchProgress) => {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_KEY);
    const history = stored ? JSON.parse(stored) : {};
    
    history[progress.tmdbId] = progress;
    
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save progress", e);
  }
};

// Get progress for a specific item
export const getProgress = async (tmdbId: number) => {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_KEY);
    const history = stored ? JSON.parse(stored) : {};
    return history[tmdbId] || null;
  } catch (e) {
    return null;
  }
};