import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { saveProgress } from '../src/utils/progress';

// --- CONFIGURATION ---
const SOURCES = [
  { name: 'VidSrc CC', url: 'https://vidsrc.cc/v2/embed' },
  { name: 'VidSrc TO', url: 'https://vidsrc.to/embed' },
  { name: '2Embed', url: 'https://www.2embed.cc/embed' },
];

const TIMEOUT_MS = 10000; 

export default function Player() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { tmdbId, imdbId, mediaType, season, episode } = route.params as any;

  // --- STATE ---
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Gestures
  const [showIndicator, setShowIndicator] = useState<null | 'brightness' | 'volume'>(null);
  const [brightnessLevel, setBrightnessLevel] = useState(0.5);
  const [volumeLevel, setVolumeLevel] = useState(0.5);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indicatorTimer = useRef<NodeJS.Timeout | null>(null);

  const INJECTED_JS = `
    (function() {
      window.open = function() { return null; };
      const style = document.createElement('style');
      style.innerHTML = \`
        html, body { margin: 0; padding: 0; background: black; overflow: hidden; }
        #player, .player, video, iframe, .jwplayer {
          position: fixed !important; top: 0 !important; left: 0 !important;
          width: 100% !important; height: 100% !important; z-index: 9999 !important;
        }
        .ad-overlay, .jw-logo, .server-list, .watermark, div[id*="ads"] { display: none !important; }
      \`;
      document.head.appendChild(style);
      setInterval(function() {
        var popups = document.querySelectorAll('div[style*="z-index: 2147483647"], iframe[src*="google"]');
        popups.forEach(function(el) { el.remove(); });
      }, 800);
    })();
    true;
  `;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    
    // ✅ FIX: Only GET brightness, do not ASK for permission here
    getInitialBrightness();
    
    handleSaveProgress();
    
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      Brightness.restoreSystemBrightnessAsync(); 
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
    };
  }, []);

  const getInitialBrightness = async () => {
    try {
      // Just check current level. If permission is missing, this might return default or fail silently
      const cur = await Brightness.getBrightnessAsync();
      setBrightnessLevel(cur);
    } catch (e) {
      console.log("Could not get brightness (Permission likely missing)");
    }
  };

  const handleSaveProgress = async () => {
    await saveProgress({
      tmdbId, mediaType, lastSeason: season || 1, lastEpisode: episode || 1,
      position: 0, duration: 0, updatedAt: Date.now()
    });
  };

  const getStreamUrl = (sourceUrl: string) => {
    if (mediaType === 'movie') {
      return imdbId ? `${sourceUrl}/movie/${imdbId}` : `${sourceUrl}/movie?tmdb=${tmdbId}`;
    } else {
      return imdbId 
        ? `${sourceUrl}/tv/${imdbId}/${season}/${episode}` 
        : `${sourceUrl}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
    }
  };

  const showFeedback = (type: 'brightness' | 'volume') => {
    setShowIndicator(type);
    if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
    indicatorTimer.current = setTimeout(() => setShowIndicator(null), 1500);
  };

  const onBrightnessGesture = (event: any) => {
    const delta = -event.nativeEvent.translationY / 1000; 
    let newLevel = brightnessLevel + delta;
    newLevel = Math.min(1, Math.max(0, newLevel));
    
    // ✅ Safe set: This will simply do nothing if permission wasn't granted at app start
    Brightness.setBrightnessAsync(newLevel).catch(() => {});
    
    setBrightnessLevel(newLevel);
    runOnJS(showFeedback)('brightness');
  };

  const onVolumeGesture = (event: any) => {
    const delta = -event.nativeEvent.translationY / 1000;
    let newLevel = volumeLevel + delta;
    newLevel = Math.min(1, Math.max(0, newLevel));
    setVolumeLevel(newLevel);
    runOnJS(showFeedback)('volume');
  };

  const handleSourceFailure = () => {
    if (currentSourceIndex < SOURCES.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
      setErrorMsg("Switching source...");
      setLoading(true);
    } else {
      setLoading(false);
      setErrorMsg("Stream unavailable.");
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      
      <WebView
        key={currentSourceIndex}
        source={{ uri: getStreamUrl(SOURCES[currentSourceIndex].url) }}
        style={styles.webview}
        injectedJavaScript={INJECTED_JS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        scrollEnabled={false}
        scalesPageToFit={Platform.OS === 'android'}
        onLoadStart={() => {
            setLoading(true);
            timeoutRef.current = setTimeout(() => handleSourceFailure(), TIMEOUT_MS);
        }}
        onLoadEnd={() => {
            setLoading(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }}
        onError={handleSourceFailure}
        mediaPlaybackRequiresUserAction={false} 
      />

      <PanGestureHandler onGestureEvent={onBrightnessGesture} activeOffsetX={[-10, 10]}>
        <Animated.View style={styles.gestureZoneLeft} />
      </PanGestureHandler>

      <PanGestureHandler onGestureEvent={onVolumeGesture} activeOffsetX={[-10, 10]}>
        <Animated.View style={styles.gestureZoneRight} />
      </PanGestureHandler>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>{errorMsg || `Loading ${SOURCES[currentSourceIndex].name}...`}</Text>
        </View>
      )}

      {showIndicator && (
        <View style={styles.feedbackContainer}>
            <MaterialCommunityIcons 
                name={showIndicator === 'brightness' ? "brightness-6" : "volume-high"} 
                size={40} 
                color="#E50914" 
            />
            <Text style={styles.feedbackText}>
                {Math.round((showIndicator === 'brightness' ? brightnessLevel : volumeLevel) * 100)}%
            </Text>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(showIndicator === 'brightness' ? brightnessLevel : volumeLevel) * 100}%` }]} />
            </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1, backgroundColor: 'black' },
  gestureZoneLeft: { position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '15%', zIndex: 50 },
  gestureZoneRight: { position: 'absolute', right: 0, top: '15%', bottom: '15%', width: '15%', zIndex: 50 },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: { color: 'white', marginTop: 15, fontWeight: '600' },
  feedbackContainer: { position: 'absolute', alignSelf: 'center', top: '40%', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 100, minWidth: 120 },
  feedbackText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 5 },
  progressBarBg: { width: 80, height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#E50914' }
});