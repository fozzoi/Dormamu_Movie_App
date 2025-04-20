import React, { useState } from "react";
import { View, StyleSheet, Alert, Linking, useColorScheme,StatusBar, ScrollView, Platform, TouchableOpacity } from "react-native";
import { Provider as PaperProvider, TextInput, Button, Card, Text,ActivityIndicator, MD3DarkTheme, MD3LightTheme, Chip } from "react-native-paper";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher"; // Android-specific file handling
import ErrorBoundary from "./ErrorBoundary";
import { useNavigation } from "expo-router";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

interface Movie {
  id: number;
  title: string;
  torrents: { size: string; url: string; quality: string }[];
}

interface Result {
  id: number | string;
  name: string;
  size: string;
  source: string;
  url: string;
  episodes?: {
    season: number;
    episode: number;
    url: string;
    quality: string;
    size: string;
  }[];
  isSeries?: boolean;
}

interface FilterOptions {
  source: string[];
  type: 'movie' | 'series';
}

interface QualityScore {
  resolution: number; // 720, 1080, 2160 etc.
  score: number;     // 1-5 based on quality
}

interface SeriesEpisode {
  season: number;
  episode: number;
  url: string;
  quality: string;
  size: string;
}

interface SeriesInfo {
  name: string;
  seasons: {
    [season: number]: {
      [episode: number]: {
        [quality: string]: SeriesEpisode;
      }
    }
  };
  totalEpisodes: number;
  qualities: string[];
}

type SearchRouteParamList = {
  Search: { prefillQuery?: string };
};

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const route = useRoute<RouteProp<SearchRouteParamList, 'Search'>>();
  const [query, setQuery] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showMore, setShowMore] = useState(false); // State to toggle additional results
  // Initialize filter type automatically (default "movie")
  const [filters, setFilters] = useState<FilterOptions>({
    source: [],
    type: 'movie'
  });
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const colorScheme = useColorScheme();

  const theme = colorScheme === "dark"
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          background: "#121212",
          primary: "#BB86FC",
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          background: "#FFFFFF",
          primary: "#6200EE",
        },
      };

  const availableSources = ["YTS", "The Pirate Bay"];

  const parseEpisodeInfo = (name: string) => {
    const seasonMatch = name.match(/S(\d{1,2})/i);
    const episodeMatch = name.match(/E(\d{1,2})/i);
    return {
      season: seasonMatch ? parseInt(seasonMatch[1]) : null,
      episode: episodeMatch ? parseInt(episodeMatch[1]) : null,
    };
  };

  const organizeSeriesEpisodes = (results: Result[]): SeriesInfo[] => {
    const seriesMap = new Map<string, SeriesInfo>();

    results.forEach(item => {
      const isSeriesPattern = /(S\d{1,2}|Season\s*\d{1,2}|E\d{1,2}|Episode\s*\d{1,2})/i;
      if (!isSeriesPattern.test(item.name)) return;

      const episodeInfo = parseEpisodeInfo(item.name);
      if (!episodeInfo.season || !episodeInfo.episode) return;

      const seriesName = item.name.replace(/S\d{1,2}E\d{1,2}.*$/i, '').trim();
      const quality = getQualityInfo(item.name);

      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, {
          name: seriesName,
          seasons: {},
          totalEpisodes: 0,
          qualities: []
        });
      }

      const series = seriesMap.get(seriesName)!;
      
      // Initialize season if not exists
      if (!series.seasons[episodeInfo.season]) {
        series.seasons[episodeInfo.season] = {};
      }
      
      // Initialize episode if not exists
      if (!series.seasons[episodeInfo.season][episodeInfo.episode]) {
        series.seasons[episodeInfo.season][episodeInfo.episode] = {};
        series.totalEpisodes++;
      }

      // Add quality variant
      series.seasons[episodeInfo.season][episodeInfo.episode][quality.label] = {
        season: episodeInfo.season,
        episode: episodeInfo.episode,
        quality: quality.label,
        url: item.url,
        size: item.size
      };

      // Track available qualities
      if (!series.qualities.includes(quality.label)) {
        series.qualities.push(quality.label);
      }
    });

    return Array.from(seriesMap.values());
  };

  const applyFilters = (results: Result[]) => {
    // Filter by content type (movie/series)
    let filteredResults = results.filter((item: Result) => {
      const isSeriesPattern = /(S\d{1,2}|Season\s*\d{1,2}|E\d{1,2}|Episode\s*\d{1,2})/i;
      const isSeries = isSeriesPattern.test(item.name);
      return filters.type === 'series' ? isSeries : !isSeries;
    });

    // Filter by quality (only keep 4K, 1080p, 720p)
    filteredResults = filteredResults.filter(item => {
      const quality = getQualityInfo(item.name);
      return ['4K', '1080p', '720p'].includes(quality.label);
    });

    // Group by quality
    const qualityGroups = {
      '4K': [] as Result[],
      '1080p': [] as Result[],
      '720p': [] as Result[]
    };

    // Sort into quality groups
    filteredResults.forEach(item => {
      const quality = getQualityInfo(item.name);
      if (quality.label in qualityGroups) {
        qualityGroups[quality.label as keyof typeof qualityGroups].push(item);
      }
    });

    // Get top result from each quality (if available)
    let finalResults: Result[] = [];
    ['4K', '1080p', '720p'].forEach(quality => {
      if (qualityGroups[quality as keyof typeof qualityGroups].length > 0) {
        finalResults.push(qualityGroups[quality as keyof typeof qualityGroups][0]);
      }
    });

    // Apply source filters if any
    if (filters.source.length > 0) {
      finalResults = finalResults.filter(item => filters.source.includes(item.source));
    }

    return finalResults;
  };

  const getQualityScore = (name: string): QualityScore => {
    const resolution = name.match(/\d{3,4}p|4k/i)?.[0].toLowerCase();
    if (resolution) {
      if (resolution === "4k" || resolution === "2160p") return { resolution: 2160, score: 5 };
      if (resolution === "1080p") return { resolution: 1080, score: 4 };
      if (resolution === "720p") return { resolution: 720, score: 3 };
    }
    return { resolution: 0, score: 1 };
  };

  const getQualityInfo = (name: string): { score: number; label: string; color: string } => {
    const lowerName = name.toLowerCase();
    
    // Check for common quality indicators
    if (lowerName.includes('2160p') || lowerName.includes('4k') || lowerName.includes('uhd')) {
      return { score: 5, label: '4K', color: '#4CAF50' };
    }
    if (lowerName.includes('1080p') || lowerName.includes('fhd')) {
      return { score: 4, label: '1080p', color: '#2196F3' };
    }
    if (lowerName.includes('720p') || lowerName.includes('hd')) {
      return { score: 3, label: '720p', color: '#FFC107' };
    }
    if (lowerName.includes('480p') || lowerName.includes('sd')) {
      return { score: 2, label: '480p', color: '#FF9800' };
    }
    
    // More specific quality checks
    if (lowerName.includes('bluray') || lowerName.includes('blu-ray')) {
      return { score: 4, label: 'BluRay', color: '#2196F3' };
    }
    if (lowerName.includes('web-dl') || lowerName.includes('webdl')) {
      return { score: 3, label: 'WEB-DL', color: '#FFC107' };
    }
    
    // Return unknown only if no quality indicators are found
    return { score: 0, label: 'Unknown', color: '#9E9E9E' };
  };

  const extractAudioLanguages = (name: string): string[] => {
    const languagePatterns: { [key: string]: string } = {
      "multi audio|dual audio|multi-lang|multi language": "Multi",
      "english|eng": "English",
      "hindi|hin": "Hindi",
      "spanish|spa": "Spanish",
      "french|fre|fra": "French",
      "german|ger|deu": "German",
      "japanese|jpn": "Japanese",
      "korean|kor": "Korean",
      "chinese|chi|zho": "Chinese",
      "tamil|tam": "Tamil",
      "telugu|tel": "Telugu",
    };
  
    const detectedLanguages: string[] = [];
    for (const [pattern, language] of Object.entries(languagePatterns)) {
      const regex = new RegExp(`\\b(${pattern})\\b`, "i");
      if (regex.test(name)) {
        detectedLanguages.push(language);
      }
    }
  
    // If "Multi" is detected, return only "Multi"
    if (detectedLanguages.includes("Multi")) {
      return ["Multi"];
    }
  
    return detectedLanguages.length > 0 ? detectedLanguages : ["Unknown"];
  };

  const saveToHistory = async (query: string) => {
    try {
      const existing = await AsyncStorage.getItem("searchHistory");
      const parsed = existing ? JSON.parse(existing) : [];

      const newEntry = { query, date: new Date().toISOString() };

      // Prevent duplicates (keep only latest)
      const filtered = parsed.filter((item:any) => item.query.toLowerCase() !== query.toLowerCase());

      filtered.push(newEntry);
      await AsyncStorage.setItem("searchHistory", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to save to history", error);
    }
  };

  useEffect(() => {
    if (route.params?.prefillQuery) {
      setSearchQuery(route.params.prefillQuery); // Set the search query
      handleSearch(route.params.prefillQuery); // Trigger the search
    }
  }, [route.params?.prefillQuery]); // Ensure it reacts to changes in prefillQuery

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) {
      Alert.alert("Error", "Please enter a search term.");
      return;
    }
    setLoading(true);
    try {
      await saveToHistory(query); // Save the query to history
      // Fetch results from YTS
      const ytsResults = await fetchYTSResults(query);
      
      // Fetch results from The Pirate Bay
      const pirateBayResults = await fetchPirateBayResults(query);
      
      // (Additional sources such as RARBG could be added here)
      
      // Combine and sort all results
      const combinedResults = [...ytsResults, ...pirateBayResults];
      
      // Sort by quality score and relevance
      const sortedResults = combinedResults.sort((a, b) => {
        const aQuality = getQualityScore(a.name);
        const bQuality = getQualityScore(b.name);
        
        // First, compare quality scores
        if (aQuality.score !== bQuality.score) {
          return bQuality.score - aQuality.score;
        }
        
        // If qualities are equal, check for exact name matches
        const queryLower = query.toLowerCase();
        const aExact = a.name.toLowerCase() === queryLower;
        const bExact = b.name.toLowerCase() === queryLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Finally, sort by name
        return a.name.localeCompare(b.name);
      });
      
      // Automatically determine content type based on first result
      if (sortedResults.length > 0) {
        const firstIsSeries = /(S\d{1,2}|Season\s*\d{1,2}|E\d{1,2}|Episode\s*\d{1,2})/i.test(sortedResults[0].name);
        setFilters(prev => ({ ...prev, type: firstIsSeries ? 'series' : 'movie' }));
      }
      
      setResults(sortedResults);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch search results.");
    } finally {
      setLoading(false);
    }
  };

  const fetchYTSResults = async (query: string): Promise<Result[]> => {
    try {
      const response = await axios.get(
        `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=50`
      );
      const movies: Movie[] = response.data.data.movies || [];
      return movies.flatMap((movie: Movie) =>
        movie.torrents.map((torrent: { size: string; url: string; quality: string }) => ({
          id: `${movie.id}-${torrent.url}`,
          name: `${movie.title} [${torrent.quality}]`,
          size: torrent.size || "Unknown",
          source: "YTS",
          url: torrent.url || "",
        }))
      );
    } catch (error) {
      return [];
    }
  };

  const fetchPirateBayResults = async (query: string): Promise<Result[]> => {
    try {
      const response = await axios.get(
        `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=0`
      );
      return response.data.map((item: any) => {
        const sizeInMB = parseInt(item.size) / (1024 * 1024);
        const size = sizeInMB >= 1024 
          ? `${(sizeInMB / 1024).toFixed(2)} GB` // Convert to GB if >= 1024 MB
          : `${sizeInMB.toFixed(2)} MB`; // Keep in MB otherwise
        return {
          id: item.id,
          name: item.name,
          size,
          source: "The Pirate Bay",
          url: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
        };
      });
    } catch (error) {
      console.error("PirateBay Error:", error);
      return [];
    }
  };

  const handleDownload = async (url: string, name: string) => {
    if (!url) {
      Alert.alert("Error", "No download URL available.");
      return;
    }

    try {
      if (url.startsWith("magnet:")) {
        // Open magnet links directly
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Error", "No app available to handle magnet links.");
        }
      } else {
        // Handle direct file URLs
        const filePath = `${FileSystem.documentDirectory}${name}.torrent`;
        const { uri } = await FileSystem.downloadAsync(url, filePath);

        if (Platform.OS === "android") {
          const action = "android.intent.action.VIEW";
          const params = {
            data: uri,
            flags: 1,
            type: "application/x-bittorrent",
          };
          await IntentLauncher.startActivityAsync(action, params);
        } else if (Platform.OS === "ios") {
          const supported = await Linking.canOpenURL(uri);
          if (supported) {
            await Linking.openURL(uri);
          } else {
            Alert.alert("Error", "No app available to handle this file.");
          }
        }
      }
    } catch (error) {
      console.error("Error downloading or opening file:", error);
      Alert.alert("Error", "Failed to download or open the file.");
    }
  };

  const handleViewEpisodes = (series: SeriesInfo) => {
    router.push({
      pathname: "/episodes",
      params: { 
        series: JSON.stringify(series)
      }
    });
  };

  const renderSeriesCard = (series: SeriesInfo) => (
    <Card 
      key={series.name} 
      style={[styles.card, { backgroundColor: '#1e1e1e' }]}
    >
      <Card.Title 
        title={series.name}
        subtitle={`Total Episodes: ${series.totalEpisodes}`}
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: '#ccc' }}
      />
      <Card.Content>
        <View style={styles.seasonsContainer}>
          {Object.keys(series.seasons).map((season) => (
            <View key={season} style={[styles.seasonSection, { backgroundColor: '#2d2d2d' }]}>
              <Text style={[styles.seasonTitle, { color: '#fff' }]}>Season {season}</Text>
              <View style={styles.qualityContainer}>
                <Text style={{ color: '#ccc' }}>Available Qualities: </Text>
                {series.qualities.map(quality => (
                  <Chip 
                    key={quality} 
                    style={[styles.qualityChip, { backgroundColor: '#404040' }]}
                    textStyle={{ color: '#fff' }}
                  >
                    {quality}
                  </Chip>
                ))}
              </View>
              <Text style={[styles.episodeCount, { color: '#ccc' }]}>
                Episodes: {Object.keys(series.seasons[parseInt(season)]).length}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
      <Card.Actions style={{ justifyContent: 'space-between' }}>
        <Button 
          mode="contained"
          onPress={() => handleViewEpisodes(series)}
          style={styles.actionButton}
        >
          View Episodes
        </Button>
        <Button 
          mode="contained"
          onPress={() => Alert.alert("Coming soon", "Batch download feature coming soon!")}
          style={styles.actionButton}
        >
          Download All
        </Button>
      </Card.Actions>
    </Card>
  );

  const renderResults = () => {
    const visibleResults = showMore ? results : results.slice(0, 5); // Show all or first 5 results
    return visibleResults.map((item) => {
      const quality = getQualityInfo(item.name);
      const audioLanguages = extractAudioLanguages(item.name); // Extract audio languages
      const languageDisplay = audioLanguages.length > 1 ? "Multi" : audioLanguages[0];

      return (
        <Card key={item.id.toString()} style={styles.card}>
          <Card.Title
            titleStyle={{ color: 'white' }}
            title={item.name}
            right={(props) => (
              <View style={styles.qualityBadge}>
                <Text style={[styles.qualityText, { color: quality.color }]}>
                  {quality.label}
                </Text>
              </View>
            )}
          />
          <Card.Content>
            <View style={styles.contentRow}>
              <Text style={{ color: 'white' }}>Size: {item.size?.toString() || "Unknown"}</Text>
              <Text style={{ color: 'white' }}>Source: {item.source?.toString() || "Unknown"}</Text>
            </View>
            <View style={styles.contentRow}>
              <Text style={{ color: 'white' }}>Audio: {languageDisplay}</Text>
            </View>
            {/* <Card.Actions> */}
              <Button style={(styles.button)} mode="outlined" onPress={() => handleDownload(item.url, item.name)}>Download</Button>
            {/* </Card.Actions> */}
          </Card.Content>
        </Card>
      );
    });
  };

  return (
    <View style={styles.love}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.heading}>Torrent Search</Text>
          <View style={styles.searchContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              cursorColor="gray"
              placeholderTextColor="gray"
              selectionColor="gray"
              textColor="white"
              placeholder="Search for movies or series"
              style={styles.input}
              onSubmitEditing={() => handleSearch(searchQuery)}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setResults([]);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={24} color="gray" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator animating={true} size="large" />
          ) : (
            <>
              {renderResults()}
              {results.length > 5 && (
                <Button
                  mode="text"
                  onPress={() => setShowMore(!showMore)}
                  style={styles.showMoreButton}
                >
                  {showMore ? "Show Less" : "Show More"}
                </Button>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#000",
  },
  love:{
    backgroundColor: "#000",
    flex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: '5%',
    top: '15%',
    alignSelf: 'flex-end',
    verticalAlign:'middle'
  },
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 35,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 50,
    marginTop: 250,
    color: "#FFFFFF",
  },
  searchContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'black',
    color: 'white',
    fontSize: 16,
    width: '100%',
    paddingRight: 40,
    height: 40,
    paddingHorizontal: 16, // Add padding to make space for the clear button
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'gray',
    borderTopEndRadius: 20,
    borderTopLeftRadius: 20,
    paddingStart: 10,
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 14,
    elevation: 4,
    backgroundColor: '#1e1e1e',
    color: 'gray',
    height: 190,
  },
  filterContainer: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qualityLabel: {
    marginRight: 8,
  },
  starContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginHorizontal: 2,
  },
  qualityBadge: {
    padding: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  qualityText: {
    fontWeight: 'bold',
  },
  typeContainer: {
    marginBottom: 16,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  segmentButton: {
    flex: 1,
  },
  episodesContainer: {
    marginTop: 8,
  },
  episodesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  episodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  seasonsContainer: {
    marginTop: 8,
  },
  seasonSection: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#2d2d2d',
    borderRadius: 4,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
  },
  qualityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  qualityChip: {
    marginRight: 4,
    backgroundColor: '#404040',
  },
  episodeCount: {
    fontWeight: '500',
    color: '#ccc',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  showMoreButton: {
    marginTop: 16,
    alignSelf: 'center',
    borderColor:'gray',
    borderWidth: 1,
  },
});

