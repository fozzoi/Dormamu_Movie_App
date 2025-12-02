// Explore.tsx
import React, { useEffect, useState, useCallback, memo, useRef, useContext } from 'react';
import { ScrollContext } from '../context/ScrollContext';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ScrollView,
  Platform,
  FlatList,
  ImageBackground,
  BackHandler,
} from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { 
  FadeIn, 
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  fetchAllDiscoveryContent,
  getImageUrl,
  getFullDetails,
  TMDBResult,
  searchTMDB,
  searchPeople,
  searchGenres,
  getMoviesByGenre,
  getTrendingMovies,
} from '../src/tmdb';
import LoadingCard from './LoadingCard';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = (width - (HORIZONTAL_MARGIN * 2) - 20) / 3;
const HERO_CARD_WIDTH = width - (HORIZONTAL_MARGIN * 2);
const HERO_HEIGHT = height * 0.55;
const SCROLL_THRESHOLD = 50;
const SPARE_BOTTOM_SPACE = 20;
const GENRE_HISTORY_KEY = 'genre_history';
const MAX_GENRE_HISTORY = 10;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// --- 1. ATMOSPHERIC BACKGROUND ---
const AtmosphericBackground = () => {
  const rotate1 = useSharedValue(0);
  const rotate2 = useSharedValue(45);

  useEffect(() => {
    rotate1.value = withRepeat(
      withTiming(360, { duration: 25000, easing: Easing.linear }),
      -1
    );
    rotate2.value = withRepeat(
      withTiming(405, { duration: 30000, easing: Easing.linear }),
      -1
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate1.value}deg` }],
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate2.value}deg` }],
  }));

  return (
    <View style={styles.atmosContainer}>
      <Animated.View style={[styles.atmosGradientWrapper, animatedStyle1]}>
        <LinearGradient
          colors={['rgba(178, 22, 10, 0.4)', 'rgba(10, 20, 178, 0)']}
          style={styles.atmosGradient}
        />
      </Animated.View>
      <Animated.View style={[styles.atmosGradientWrapper, animatedStyle2]}>
        <LinearGradient
          colors={['rgba(22, 178, 10, 0.4)', 'rgba(178, 10, 166, 0)']}
          style={styles.atmosGradient}
        />
      </Animated.View>
    </View>
  );
};

// --- 2. SKELETON LOADERS ---
const SkeletonHero = () => (
  <View style={[styles.heroContainer, { marginHorizontal: HORIZONTAL_MARGIN }]}>
    <View style={styles.heroLoading}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  </View>
);

const SkeletonGenreCarousel = () => (
  <View style={styles.sectionContainer}>
    <Text style={[styles.sectionTitle, { paddingHorizontal: HORIZONTAL_MARGIN }]}>Browse by Genre</Text>
    <View style={[styles.genreRow, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
      <View style={[styles.genreCard, styles.skeletonCard]} />
      <View style={[styles.genreCard, styles.skeletonCard]} />
    </View>
    <View style={[styles.genreRow, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
      <View style={[styles.genreCard, styles.skeletonCard]} />
      <View style={[styles.genreCard, styles.skeletonCard]} />
    </View>
  </View>
);

// --- 3. FEATURED HERO CAROUSEL ---
const heroDataLimit = 5;
const FeaturedHero = memo(({ items, navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlashList<TMDBResult>>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroDataLimit;
        listRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const renderHeroItem = ({ item }: { item: TMDBResult }) => (
    <TouchableOpacity
      style={styles.heroItemContainer}
      onPress={async () => {
        try {
          const fullDetails = await getFullDetails(item);
          navigation.navigate('Detail', { movie: fullDetails });
        } catch (error) {
          console.error('Error:', error);
        }
      }}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, 'w780') }}
        style={styles.heroImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(20, 20, 20, 0.4)', 'rgba(20, 20, 20, 1)']}
        style={styles.heroGradient}
      >
        <Text style={styles.heroTitle}>{item.title || item.name}</Text>
        <Text style={styles.heroMeta}>
          {item.vote_average.toFixed(1)} ★ | {(item.release_date || item.first_air_date || '').substring(0, 4)}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={[styles.heroContainer, { marginHorizontal: HORIZONTAL_MARGIN }]}>
        <FlashList
          ref={listRef}
          data={items.slice(0, heroDataLimit)}
          renderItem={renderHeroItem}
          keyExtractor={(item) => `hero-${item.id}`}
          horizontal
          pagingEnabled
          estimatedItemSize={HERO_CARD_WIDTH}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        />
      </View>
      
      <View style={styles.paginationContainer}>
        {items.slice(0, heroDataLimit).map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              activeIndex === index ? styles.paginationDotActive : {},
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// --- NEW: Genre data with dynamic images ---
const initialGenreData = [
  { id: 28, name: 'Action', image: '' },
  { id: 12, name: 'Adventure', image: '' },
  { id: 16, name: 'Animation', image: '' },
  { id: 35, name: 'Comedy', image: '' },
  { id: 80, name: 'Crime', image: '' },
  { id: 27, name: 'Horror', image: '' },
  { id: 10749, name: 'Romance', image: '' },
  { id: 878, name: 'Sci-Fi', image: '' },
  { id: 53, name: 'Thriller', image: '' },
  { id: 14, name: 'Fantasy', image: '' },
  { id: 10752, name: 'War', image: '' },
  { id: 36, name: 'History', image: '' },
];

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

// --- 4. GENRE CAROUSEL WITH SMART ORDERING & DYNAMIC IMAGES ---
const GenreCarousel = memo(({ navigation }) => {
  const [orderedGenres, setOrderedGenres] = useState(initialGenreData);
  const [genreImages, setGenreImages] = useState<{ [key: number]: string }>({});
  const genreColumnWidth = width * 0.45;

  const scrollX = useSharedValue(0);
  const [maxScroll, setMaxScroll] = useState(1);
  const [containerWidth, setContainerWidth] = useState(1);

  // Load genre history and images on mount
  useEffect(() => {
    loadGenreHistory();
    fetchGenreImages();
  }, []);

  const loadGenreHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(GENRE_HISTORY_KEY);
      if (history) {
        const parsedHistory: number[] = JSON.parse(history);
        reorderGenres(parsedHistory);
      }
    } catch (error) {
      console.error('Error loading genre history:', error);
    }
  };

  const saveGenreHistory = async (genreId: number) => {
    try {
      const history = await AsyncStorage.getItem(GENRE_HISTORY_KEY);
      let parsedHistory: number[] = history ? JSON.parse(history) : [];
      
      // Remove if exists, add to front
      parsedHistory = parsedHistory.filter(id => id !== genreId);
      parsedHistory.unshift(genreId);
      
      // Keep only MAX_GENRE_HISTORY items
      if (parsedHistory.length > MAX_GENRE_HISTORY) {
        parsedHistory = parsedHistory.slice(0, MAX_GENRE_HISTORY);
      }
      
      await AsyncStorage.setItem(GENRE_HISTORY_KEY, JSON.stringify(parsedHistory));
      reorderGenres(parsedHistory);
    } catch (error) {
      console.error('Error saving genre history:', error);
    }
  };

  const reorderGenres = (history: number[]) => {
    const genreMap = new Map(initialGenreData.map(g => [g.id, g]));
    const ordered: typeof initialGenreData = [];
    
    // Add genres from history first
    history.forEach(id => {
      const genre = genreMap.get(id);
      if (genre) {
        ordered.push(genre);
        genreMap.delete(id);
      }
    });
    
    // Add remaining genres
    genreMap.forEach(genre => ordered.push(genre));
    
    setOrderedGenres(ordered);
  };

  const fetchGenreImages = async () => {
    try {
      const images: { [key: number]: string } = {};
      
      // Fetch trending movies for each genre
      await Promise.all(
        initialGenreData.map(async (genre) => {
          try {
            const movies = await getMoviesByGenre(genre.id, 1);
            if (movies.length > 0 && movies[0].poster_path) {
              images[genre.id] = getImageUrl(movies[0].poster_path, 'w500');
            }
          } catch (error) {
            console.error(`Error fetching image for genre ${genre.name}:`, error);
          }
        })
      );
      
      setGenreImages(images);
    } catch (error) {
      console.error('Error fetching genre images:', error);
    }
  };

  const handleGenrePress = async (genre: typeof initialGenreData[0]) => {
    await saveGenreHistory(genre.id);
    navigation.navigate('ViewAll', { 
      title: `${genre.name} Movies`,
      genreId: genre.id
    });
  };

  const scrollHandler = (event) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [0, maxScroll],
      [0, 100],
      Extrapolate.CLAMP
    );
    return {
      width: `${progress}%`,
    };
  });

  const genrePairs = chunk(orderedGenres, 2);

  const renderGenreColumn = ({ item: pair }: ListRenderItemInfo<typeof orderedGenres>) => (
    <View style={[styles.genreColumn, { width: genreColumnWidth }]}>
      {pair.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.genreCard}
          onPress={() => handleGenrePress(item)}
        >
          <ImageBackground
            source={{ 
              uri: genreImages[item.id] || 'https://via.placeholder.com/500x750?text=No+Image'
            }}
            style={styles.genreImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
              style={styles.genreGradient}
            >
              <Text style={styles.genreName}>{item.name}</Text>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { paddingHorizontal: HORIZONTAL_MARGIN }]}>Browse by Genre</Text>
      <FlashList
        data={genrePairs}
        renderItem={renderGenreColumn}
        keyExtractor={(pair, index) => `pair-${index}`}
        horizontal
        estimatedItemSize={genreColumnWidth + 10}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN,paddingTop:10 }}
      />
    </View>
  );
});

// --- 5. MEDIA CAROUSEL ---
const MediaCarousel = memo(({ title, data, navigation, isLoading = false }) => {
  if (isLoading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionHeader, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
          <View style={[styles.skeletonTitle, { width: '40%' }]} />
        </View>
        <FlashList
          horizontal
          data={[1, 2, 3]}
          renderItem={() => (
            <View style={styles.sectionItem}>
              <View style={[styles.sectionImage, styles.skeletonCard]} />
              <View style={[styles.skeletonTitle, { height: 12, marginTop: 6, width: '70%' }]} />
            </View>
          )}
          estimatedItemSize={CARD_WIDTH + 10}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN }}
        />
      </View>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.sectionHeader, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ViewAll', { title, data })}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <MaterialIcons name="chevron-right" size={16} color="#AAAAAA" />
        </TouchableOpacity>
      </View>
      <FlashList
        horizontal
        data={data}
        renderItem={({ item, index }) => (
          <MovieCard
            item={item}
            index={index}
            onPress={async () => {
              try {
                const fullDetails = await getFullDetails(item);
                navigation.navigate('Detail', { movie: fullDetails });
              } catch (error) {
                console.error('Error:', error);
              }
            }}
          />
        )}
        estimatedItemSize={CARD_WIDTH + 10}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN }}
      />
    </View>
  );
});

// Re-usable MovieCard
const MovieCard = ({ item, onPress, index = 0 }) => {
  if (!item.poster_path) {
    // ✅ FIX: Return a transparent, correctly-sized placeholder instead of null.
    // This maintains the FlashList's calculated layout for the row.
    return <View style={styles.sectionItemPlaceholder} />;
  }
  
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(index * 50)}
    >
      <TouchableOpacity
        onPress={onPress}
        style={styles.sectionItem}
      >
        <Image
          source={{ uri: getImageUrl(item.poster_path, 'w342') }}
          style={styles.sectionImage}
          resizeMode={'cover'}
        />
        <Text style={styles.sectionItemTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- Animated Footer ---
const AnimatedFooter = () => {
  const { tabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const animatedFooterStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(tabBarVisible ? tabBarHeight : SPARE_BOTTOM_SPACE, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      }),
    };
  });
  return <Animated.View style={animatedFooterStyle} />;
};

// --- 6. THE EXPLORE PAGE ---
const ExplorePage = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [regional, setRegional] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [peopleResults, setPeopleResults] = useState([]);
  const [genreResults, setGenreResults] = useState([]);

  const [hindiMovies, setHindiMovies] = useState([]);
  const [malayalamMovies, setMalayalamMovies] = useState([]);
  const [tamilMovies, setTamilMovies] = useState([]);
  const [hindiTV, setHindiTV] = useState([]);
  const [malayalamTV, setMalayalamTV] = useState([]);
  const [koreanMovies, setKoreanMovies] = useState([]);
  const [koreanTV, setKoreanTV] = useState([]);
  const [japaneseMovies, setJapaneseMovies] = useState([]);
  const [japaneseTV, setJapaneseTV] = useState([]);
  const [animeMovies, setAnimeMovies] = useState([]);
  const [animeShows, setAnimeShows] = useState([]);
  const [animatedMovies, setAnimatedMovies] = useState([]);

  const navigation = useNavigation();
  const { setTabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const lastScrollY = useRef(0);
  const searchTimeout = useRef(null);

  // --- FIX: Reset search on screen focus ---
  useFocusEffect(
    useCallback(() => {
      // Reset search when navigating back to Explore
      setQuery('');
      setTmdbResults([]);
      setPeopleResults([]);
      setGenreResults([]);
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // --- FIX: Handle Android back button in search mode ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (query.trim() !== '') {
          // If in search mode, go back to explore
          setQuery('');
          setTmdbResults([]);
          setPeopleResults([]);
          setGenreResults([]);
          return true; // Prevent default back behavior
        }
        return false; // Let default back behavior happen
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove(); // Use .remove() instead of removeEventListener
      };
    }, [query])
  );

  const handleScrollChange = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY < SCROLL_THRESHOLD) {
      setTabBarVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }
    const delta = currentScrollY - lastScrollY.current;
    if (Math.abs(delta) > 10) {
      setTabBarVisible(delta < 0);
    }
    lastScrollY.current = currentScrollY;
  };

  const handleSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim()) {
      setTmdbResults([]);
      setPeopleResults([]);
      setGenreResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const [results, people, genres] = await Promise.all([
        searchTMDB(searchText.trim()),
        searchPeople(searchText.trim()),
        searchGenres(searchText.trim())
      ]);

      setTmdbResults(results.filter(item => item.poster_path));
      setPeopleResults(people.filter(person => person.profile_path && person.popularity > 1));
      setGenreResults(genres);

    } catch (error) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, handleSearch]);
  
  // --- FIX: Proper search results rendering with correct key ---
  const renderSearchContent = () => {
    if (searchLoading && tmdbResults.length === 0 && peopleResults.length === 0 && genreResults.length === 0) { 
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#E50914" size="large" />
        </View>
      );
    }
    
    const hasResults = tmdbResults.length > 0 || peopleResults.length > 0 || genreResults.length > 0;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.searchScrollContent}
      >
        {!hasResults ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No results found for "{query}"</Text>
            <Text style={styles.noResultsSubText}>Try different keywords</Text>
          </View>
        ) : (
          <>
            {peopleResults.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchHeading}>People</Text>
                <FlatList
                  horizontal
                  data={peopleResults.slice(0, 10)}
                  keyExtractor={p => `person-${p.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN }}
                  renderItem={({ item: person }) => (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('CastDetails', { personId: person.id })}
                      style={styles.personItem}
                    >
                      <Image
                        source={{ uri: getImageUrl(person.profile_path, 'w185') }}
                        style={styles.personImage}
                      />
                      <Text style={styles.personName} numberOfLines={2}>
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            
            {genreResults.length > 0 && (
              <View style={[styles.searchSection, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
                <Text style={styles.searchHeading}>Genres</Text>
                <View style={styles.genreTagContainer}>
                  {genreResults.map(genre => (
                    <TouchableOpacity
                      key={genre.id}
                      onPress={() => navigation.navigate('ViewAll', { 
                        title: `${genre.name} Movies`,
                        genreId: genre.id
                      })}
                      style={styles.genreTag}
                    >
                      <Text style={styles.genreTagName}>{genre.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {tmdbResults.length > 0 && (
              <View style={[styles.searchSection, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
                <Text style={styles.searchHeading}>Titles</Text>
                <View style={styles.searchResultsGrid}>
                  {tmdbResults.map((result, index) => (
                    <View key={`result-${result.id}`} style={styles.gridItemWrapper}>
                      <MovieCard
                        item={result}
                        index={index}
                        onPress={async () => {
                          try {
                            const fullDetails = await getFullDetails(result);
                            navigation.navigate('Detail', { movie: fullDetails });
                          } catch (error) {
                            console.error('Error:', error);
                          }
                        }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
        <AnimatedFooter />
      </ScrollView>
    );
  };
  
  const fetchDiscoveryContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const content = await fetchAllDiscoveryContent();
      setTrendingMovies(content.trendingMovies);
      setTrendingTV(content.trendingTV);
      setTopRated(content.topRated);
      setRegional(content.regional);
      setHindiMovies(content.hindiMovies);
      setMalayalamMovies(content.malayalamMovies);
      setTamilMovies(content.tamilMovies);
      setHindiTV(content.hindiTV);
      setMalayalamTV(content.malayalamTV);
      setKoreanMovies(content.koreanMovies);
      setKoreanTV(content.koreanTV);
      setJapaneseMovies(content.japaneseMovies);
      setJapaneseTV(content.japaneseTV);
      setAnimeMovies(content.animeMovies);
      setAnimeShows(content.animeShows);
      setAnimatedMovies(content.animatedMovies);
    } catch (err) {
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDiscoveryContent();
    setRefreshing(false);
  }, [fetchDiscoveryContent]);

  useEffect(() => {
    fetchDiscoveryContent();
  }, [fetchDiscoveryContent]);

  const inSearchMode = query.trim() !== '';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <AtmosphericBackground />
      
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            textColor='white'
            placeholder="Search for movies, TV shows..."
            value={query}
            onChangeText={setQuery}
            underlineColor='transparent'
            activeUnderlineColor='transparent'
            cursorColor='#E50914'
            placeholderTextColor='#8C8C8C'
            selectionColor='#E50914'
            style={styles.searchInput}
            returnKeyType="search"
          />
          <View style={styles.searchIconContainer}>
            {searchLoading ? (
              <ActivityIndicator color="#8C8C8C" size={20} />
            ) : query.length > 0 ? (
              <TouchableOpacity 
                onPress={() => setQuery('')}
              >
                <MaterialIcons name="close" size={22} color="#8C8C8C" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={20} color="#8C8C8C" />
            )}
          </View>
        </View>
      </View>

      {inSearchMode ? (
        renderSearchContent()
      ) : (
        <AnimatedScrollView
          onScroll={handleScrollChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#E50914"
              progress
              ViewOffset={50}/>
              }>
                {contentLoading ? (<>
                <SkeletonHero />
                <SkeletonGenreCarousel />
                </>) : (
                  <>
              <FeaturedHero items={trendingMovies} navigation={navigation} />
              <GenreCarousel navigation={navigation} />
              </>
        )}
      <MediaCarousel title="Trending TV Shows" data={trendingTV} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Top Rated Movies" data={topRated} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Popular in Your Region" data={regional} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Animated Movies" data={animatedMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Anime Series" data={animeShows} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Anime Movies" data={animeMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Korean TV Shows" data={koreanTV} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Korean Movies" data={koreanMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Japanese TV Shows" data={japaneseTV} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Japanese Movies" data={japaneseMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Hindi Movies" data={hindiMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Hindi Web Series" data={hindiTV} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Malayalam Movies" data={malayalamMovies} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Malayalam Web Series" data={malayalamTV} navigation={navigation} isLoading={contentLoading} />
      <MediaCarousel title="Tamil Movies" data={tamilMovies} navigation={navigation} isLoading={contentLoading} />
      
      <AnimatedFooter />
    </AnimatedScrollView>
  )}
</View>
);
};
// --- STYLES ---
const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: '#141414',
},
scrollContent: {
paddingTop: 10,
},
searchScrollContent: {
paddingTop: 10,
paddingBottom: 100,
},
atmosContainer: {
...StyleSheet.absoluteFillObject,
zIndex: -1,
backgroundColor: '#141414',
overflow: 'hidden',
},
atmosGradientWrapper: {
position: 'absolute',
width: width * 2,
height: width * 2,
left: -width / 2,
top: -width / 2,
},
atmosGradient: {
width: '100%',
height: '100%',
opacity: 0.3,
},
searchBarContainer: {
paddingHorizontal: HORIZONTAL_MARGIN,
paddingTop: (StatusBar.currentHeight || 0) + 10,
paddingBottom: 10,
backgroundColor: 'rgba(20, 20, 20, 0.8)',
borderBottomWidth: 1,
borderBottomColor: 'rgba(255, 255, 255, 0.1)',
},
searchInputContainer: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#333333',
borderRadius: 8,
height: 45,
},
searchInput: {
flex: 1,
backgroundColor: 'transparent',
height: 45,
fontSize: 16,
color: 'white',
paddingLeft: 12,
},
searchIconContainer: {
paddingHorizontal: 12,
width: 45,
alignItems: 'center',
},
heroContainer: {
width: HERO_CARD_WIDTH,
height: HERO_HEIGHT,
backgroundColor: '#222',
borderRadius: 12,
overflow: 'hidden',
alignSelf: 'center',
marginBottom: 10,
},
// ... inside STYLES
sectionItemPlaceholder: {
  width: CARD_WIDTH,
  height: CARD_WIDTH * 1.5 + 13, // CARD_WIDTH * 1.5 (Image Height) + 6 (marginTop) + ~7 (Text Height)
  marginLeft: 10,
  // Ensure it's invisible but takes up space
  backgroundColor: 'transparent',
},
// ...
heroLoading: {
height: HERO_HEIGHT,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#222',
borderRadius: 12,
},
heroItemContainer: {
width: HERO_CARD_WIDTH,
height: HERO_HEIGHT,
},
heroImage: {
width: '100%',
height: '100%',
},
heroGradient: {
position: 'absolute',
bottom: 0,
left: 0,
right: 0,
height: '40%',
justifyContent: 'flex-end',
padding: 16,
},
heroTitle: {
color: '#FFFFFF',
fontSize: 28,
fontWeight: 'bold',
marginBottom: 4,
},
heroMeta: {
color: '#E5E5E5',
fontSize: 16,
},
paginationContainer: {
flexDirection: 'row',
justifyContent: 'center',
alignItems: 'center',
paddingVertical: 12,
},
paginationDot: {
width: 8,
height: 8,
borderRadius: 4,
backgroundColor: 'rgba(255, 255, 255, 0.5)',
marginHorizontal: 4,
},
paginationDotActive: {
backgroundColor: '#FFFFFF',
width: 10,
height: 10,
borderRadius: 5,
},
genreColumn: {
marginLeft: 10,
},
genreCard: {
width: width * 0.45,
height: 80,
borderRadius: 8,
overflow: 'hidden',
marginBottom: 10,
elevation: 3,
},
genreImage: {
width: '100%',
height: '100%',
justifyContent: 'flex-end',
},
genreGradient: {
width: '100%',
height: '100%',
justifyContent: 'flex-end',
alignItems: 'center',
paddingBottom: 8,
},
genreName: {
color: '#FFFFFF',
fontSize: 18,
fontWeight: 'bold',
textShadowColor: 'rgba(0, 0, 0, 0.7)',
textShadowOffset: { width: 1, height: 1 },
textShadowRadius: 3,
},
sectionContainer: {
// marginTop: 24,
paddingBottom: 10,
},
sectionHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingHorizontal: HORIZONTAL_MARGIN,
marginBottom: 12,
},
sectionTitle: {
color: '#FFFFFF',
fontSize: 20,
fontWeight: 'bold',
},
viewAllButton: {
flexDirection: 'row',
alignItems: 'center',
},
viewAllText: {
color: '#AAAAAA',
fontSize: 14,
},
sectionItem: {
width: CARD_WIDTH,
marginLeft: 10,
},
sectionImage: {
width: CARD_WIDTH,
height: CARD_WIDTH * 1.5,
borderRadius: 8,
backgroundColor: '#222',
},
sectionItemTitle: {
color: '#E5E5E5',
fontSize: 13,
marginTop: 6,
},
skeletonCard: {
backgroundColor: '#222',
},
skeletonTitle: {
backgroundColor: '#222',
height: 20,
borderRadius: 4,
marginBottom: 12,
},
genreRow: {
flexDirection: 'row',
justifyContent: 'space-between',
marginBottom: 10,
},
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
padding: 30,
height: height * 0.5,
},
noResultsContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
padding: 20,
minHeight: height * 0.5,
},
noResultsText: {
color: '#FFFFFF',
fontSize: 18,
marginBottom: 8
},
noResultsSubText: {
color: '#8C8C8C',
fontSize: 14
},
searchSection: {
paddingVertical: 10,
},
searchHeading: {
color: '#FFFFFF',
fontSize: 20,
fontWeight: 'bold',
marginVertical: 16,
paddingHorizontal: HORIZONTAL_MARGIN,
},
personItem: {
width: 100,
marginRight: 12,
alignItems: 'center',
},
personImage: {
width: 80,
height: 80,
borderRadius: 40,
marginBottom: 8,
backgroundColor: '#222',
},
personName: {
color: '#FFFFFF',
fontSize: 12,
textAlign: 'center',
width: 90,
},
genreTagContainer: {
flexDirection: 'row',
flexWrap: 'wrap',
},
genreTag: {
backgroundColor: '#333',
paddingHorizontal: 16,
paddingVertical: 8,
borderRadius: 20,
marginRight: 8,
marginBottom: 8,
},
genreTagName: {
color: '#FFFFFF',
fontSize: 14,
},
searchResultsGrid: {
flexDirection: 'row',
flexWrap: 'wrap',
justifyContent: 'flex-start',
},
gridItemWrapper: {
width: CARD_WIDTH,
marginBottom: 10,
},
scrollTrack: {
height: 3,
backgroundColor: 'rgba(255, 255, 255, 0.2)',
borderRadius: 2,
marginTop: 10,
},
scrollThumb: {
height: 3,
backgroundColor: 'rgba(255, 255, 255, 0.8)',
borderRadius: 2,
},
});
export default ExplorePage;