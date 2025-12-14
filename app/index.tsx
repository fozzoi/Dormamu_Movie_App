import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Alert, Linking, useColorScheme, StatusBar, ScrollView, Platform, TouchableOpacity, Share } from "react-native";
import { Provider as PaperProvider, TextInput, Button, Card, Text, ActivityIndicator, MD3DarkTheme, MD3LightTheme, Chip } from "react-native-paper";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher"; 
import * as Sharing from "expo-sharing"; 
import { useNavigation, useRouter, Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { torrentScraper } from '../src/Scraper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS, // <--- Ensure this is imported
} from 'react-native-reanimated';

// --- TYPES ---
interface Result {
  id: number | string;
  name: string;
  size: string;
  source: string;
  url: string;
  seeds?: number;
  peers?: number;
}

interface QualityScore {
  resolution: number;
  score: number;
}

type SearchRouteParamList = {
  Search: { prefillQuery?: string };
};

const SCROLL_THRESHOLD = 50;
const SPARE_BOTTOM_SPACE = 20;

// ✅ FIXED: Create the Animated Component
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);



export default function Index() {
  const navigation = useNavigation<any>();
  const router = useRouter();

  const route = useRoute<RouteProp<SearchRouteParamList, 'Search'>>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showMore, setShowMore] = useState(false);
  
  const colorScheme = useColorScheme();
  const theme = {
    ...MD3DarkTheme,
    colors: { ...MD3DarkTheme.colors, background: "#121212", primary: "#E50914" },
  };

  // --- HELPERS ---
  const getQualityInfo = (name: string): { score: number; label: string; color: string } => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('2160p') || lowerName.includes('4k')) return { score: 5, label: '4K', color: '#00ff08' };
    if (lowerName.includes('1080p')) return { score: 4, label: '1080p', color: '#1500ff' };
    if (lowerName.includes('720p')) return { score: 3, label: '720p', color: '#ff6e00' };
    return { score: 0, label: 'SD', color: '#9E9E9E' };
  };

  const saveToHistory = async (query: string) => {
    try {
      const existing = await AsyncStorage.getItem("searchHistory");
      const parsed = existing ? JSON.parse(existing) : [];
      const newEntry = { query, date: new Date().toISOString() };
      const filtered = parsed.filter((item:any) => item.query.toLowerCase() !== query.toLowerCase());
      filtered.push(newEntry);
      await AsyncStorage.setItem("searchHistory", JSON.stringify(filtered));
    } catch (error) {}
  };

  useEffect(() => {
    if (route.params?.prefillQuery) {
      setSearchQuery(route.params.prefillQuery); 
      handleSearch(route.params.prefillQuery); 
    }
  }, [route.params?.prefillQuery]); 

  // --- SEARCH LOGIC ---
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) {
      Alert.alert("Error", "Please enter a search term.");
      return;
    }
    setLoading(true);
    try {
      await saveToHistory(query);
      const scrapedResults = await torrentScraper.searchAll(query);
      
      const sortedResults = scrapedResults.sort((a, b) => {
        const seedsA = a.seeds || 0;
        const seedsB = b.seeds || 0;
        return seedsB - seedsA; 
      });
      
      setResults(sortedResults);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch search results.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleOpenMagnet = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("No App Found", "Please install a torrent client (e.g., Flud, LibreTorrent) to open magnet links.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not open the link.");
    }
  };

  const handleShareFile = async (url: string, name: string) => {
    if (!url.startsWith('magnet:')) {
      try {
        const fileUri = FileSystem.documentDirectory + `${name}.torrent`;
        const { uri } = await FileSystem.downloadAsync(url, fileUri);
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert("Error", "Sharing is not available on this device");
        }
      } catch (e) {
        Alert.alert("Error", "Could not download torrent file.");
      }
      return;
    }

    try {
      const fileName = `${name.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.magnet`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, url);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Share Magnet Link' });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to share file.");
    }
  };

  const lastScrollY = useRef(0);

  // --- RENDER CARD ---
  const renderResults = () => {
    const visibleResults = showMore ? results : results.slice(0, 5);
    
    return visibleResults.map((item, index) => {
      const quality = getQualityInfo(item.name);
      const seedsCount = item.seeds || 0;
      let healthColor = '#E50914'; // Red (Poor)
      if (seedsCount > 50) healthColor = '#46d369'; // Green (Good)
      else if (seedsCount > 10) healthColor = '#ffb700'; // Yellow (Okay)

      return (
        <Animated.View 
          key={index} 
          style={styles.cardContainer}
        >
          <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <View style={[styles.qualityTag, { borderColor: quality.color }]}>
                        <Text style={[styles.qualityText, { color: quality.color }]}>{quality.label}</Text>
                    </View>
                    <Text style={styles.fileSize}>{item.size}</Text>
                    <Text style={styles.sourceText}>{item.source}</Text>
                </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
             <View style={styles.seedRow}>
                <Feather name="arrow-up-circle" size={16} color={healthColor} />
                <Text style={[styles.seedText, {color: healthColor}]}>{item.seeds}</Text>
                <Feather name="arrow-down-circle" size={16} color="#888" style={{marginLeft: 10}} />
                <Text style={styles.peerText}>{item.peers}</Text>
             </View>

             <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={() => handleShareFile(item.url, item.name)}
                >
                    <Feather name="share-2" size={20} color="#ccc" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.downloadBtn} 
                    onPress={() => handleOpenMagnet(item.url)}
                >
                    <Feather name="download" size={18} color="#fff" />
                    <Text style={styles.downloadText}>Download</Text>
                </TouchableOpacity>
             </View>
          </View>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121212"
      />
      
      {/* Header */}
      <View style={styles.header}>
          <Text style={styles.pageTitle}>Search</Text>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate("history")}
          >
            <MaterialIcons name="history" size={26} color="#ccc" />
          </TouchableOpacity>
      </View>

      <AnimatedScrollView 
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
          {/* Search Bar */}
          <View style={styles.searchBoxContainer}>
            <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              selectionColor="#E50914"
              textColor="white"
              placeholder="Search movies, series..."
              placeholderTextColor="#666"
              style={styles.searchInput}
              onSubmitEditing={() => handleSearch(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
            )}
          </View>

          {loading && (
              <ActivityIndicator color="#E50914" size="large" style={{marginTop: 40}} />
          )}

          {/* Results List */}
          <View style={styles.resultsContainer}>
            {renderResults()}
          </View>

          {/* Show More */}
          {results.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowMore(!showMore)}
              style={styles.showMoreBtn}
            >
              <Text style={styles.showMoreText}>{showMore ? "Show Less" : "Show More Results"}</Text>
              <Feather name={showMore ? "chevron-up" : "chevron-down"} size={18} color="#888" />
            </TouchableOpacity>
          )}
          
          
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
  },
  pageTitle: {
      fontSize: 32,
      fontFamily: 'GoogleSansFlex-Bold',
      color: '#fff',
  },
  historyBtn: {
      padding: 8,
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  // Search Box
  searchBoxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1E1E1E',
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 50,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#333',
  },
  searchIcon: {
      marginRight: 10,
  },
  searchInput: {
      flex: 1,
      backgroundColor: 'transparent',
      height: 50,
      fontSize: 16,
      fontFamily: 'GoogleSansFlex-Regular',
  },

  // Card Styles
  resultsContainer: {
      gap: 16,
  },
  cardContainer: {
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#333',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
  },
  cardTitle: {
      fontSize: 16,
      color: '#fff',
      fontFamily: 'GoogleSansFlex-Medium',
      marginBottom: 8,
      lineHeight: 22,
  },
  metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  qualityTag: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
  },
  qualityText: {
      fontSize: 10,
      fontWeight: 'bold',
      fontFamily: 'GoogleSansFlex-Bold',
  },
  fileSize: {
      fontSize: 12,
      color: '#888',
      fontFamily: 'GoogleSansFlex-Regular',
  },
  sourceText: {
      fontSize: 12,
      color: '#666',
      fontFamily: 'GoogleSansFlex-Regular',
      backgroundColor: '#2a2a2a',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  
  // Footer of Card
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#333',
  },
  seedRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  seedText: {
      marginLeft: 6,
      fontSize: 13,
      fontWeight: 'bold',
      fontFamily: 'GoogleSansFlex-Medium',
  },
  peerText: {
      marginLeft: 6,
      fontSize: 13,
      color: '#888',
      fontFamily: 'GoogleSansFlex-Regular',
  },
  actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  iconBtn: {
      padding: 8,
      backgroundColor: '#2a2a2a',
      borderRadius: 8,
  },
  downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E50914',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
  },
  downloadText: {
      color: '#fff',
      fontSize: 13,
      fontFamily: 'GoogleSansFlex-Bold',
  },

  // Show More
  showMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
  },
  showMoreText: {
      color: '#888',
      fontSize: 14,
      fontFamily: 'GoogleSansFlex-Medium',
  },
});