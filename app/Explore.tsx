// app/Explore.tsx
import React, {
  useEffect,
  useState,
  useCallback,
  memo,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { ScrollContext } from '../context/ScrollContext';
import {
  View,
  Text,
  Image,
  Alert,
  Dimensions,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ScrollView,
  Platform,
  FlatList,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
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
} from '../src/tmdb';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const HORIZONTAL_MARGIN = 16;

// --- DIMENSIONS ---
const BASE_COL_WIDTH = (width - HORIZONTAL_MARGIN * 2 - 20) / 3;
const EXPLORE_CARD_WIDTH = BASE_COL_WIDTH * 1.2; 
const SEARCH_CARD_WIDTH = (width - HORIZONTAL_MARGIN * 2 - 12) / 2;

const HERO_CARD_WIDTH = width - HORIZONTAL_MARGIN * 2;
const HERO_HEIGHT = height * 0.55;
const SCROLL_THRESHOLD = 50;
const SPARE_BOTTOM_SPACE = 20;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// --- GENRE DATA ---
const GENRE_DATA = [
  { id: 0, name: 'All', icon: '🎬' },
  { id: 28, name: 'Action', icon: '💥' },
  { id: 12, name: 'Adventure', icon: '🗺️' },
  { id: 16, name: 'Animation', icon: '🎨' },
  { id: 35, name: 'Comedy', icon: '😂' },
  { id: 80, name: 'Crime', icon: '🔪' },
  { id: 27, name: 'Horror', icon: '👻' },
  { id: 10749, name: 'Romance', icon: '💕' },
  { id: 878, name: 'Sci-Fi', icon: '🚀' },
  { id: 53, name: 'Thriller', icon: '😱' },
  { id: 14, name: 'Fantasy', icon: '🧙' },
  { id: 10752, name: 'War', icon: '⚔️' },
  { id: 36, name: 'History', icon: '📜' },
];

// --- 1. BACKGROUND ---
const AtmosphericBackground = memo(() => {
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
          colors={['rgba(229, 9, 20, 0.3)', 'rgba(10, 20, 178, 0)']}
          style={styles.atmosGradient}
        />
      </Animated.View>
      <Animated.View style={[styles.atmosGradientWrapper, animatedStyle2]}>
        <LinearGradient
          colors={['rgba(22, 178, 10, 0.3)', 'rgba(178, 10, 166, 0)']}
          style={styles.atmosGradient}
        />
      </Animated.View>
    </View>
  );
});

// --- 2. SKELETONS ---
const SkeletonHero = memo(() => (
  <View style={[styles.heroContainer, { marginHorizontal: HORIZONTAL_MARGIN }]}>
    <View style={styles.heroLoading}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  </View>
));

// --- 3. HERO ---
const HeroItem = memo(({ item, navigation }: any) => {
  const handlePress = useCallback(async () => {
    try {
      const fullDetails = await getFullDetails(item);
      navigation.navigate('Detail', { movie: fullDetails });
    } catch (error) {
      console.error('Error:', error);
    }
  }, [item, navigation]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.heroItemContainer}
      onPress={handlePress}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, 'w780') }}
        style={styles.heroImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(20, 20, 20, 0.4)', 'rgba(20, 20, 20, 0.95)']}
        style={styles.heroGradient}
      >
        <View style={styles.heroContentWrapper}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.vote_average?.toFixed(1) || 'N/A'}
              </Text>
            </View>
            <Text style={styles.heroYear}>
              {(item.release_date || item.first_air_date || '').substring(0, 4)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const FeaturedHero = memo(({ items, navigation }: any) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlashList<TMDBResult>>(null);
  const heroDataLimit = 5;

  useEffect(() => {
    if (!items || items.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % Math.min(heroDataLimit, items.length);
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [items]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = useCallback(
    ({ item }: any) => <HeroItem item={item} navigation={navigation} />,
    [navigation]
  );

  if (!items || items.length === 0) return null;
  const slicedItems = items.slice(0, heroDataLimit);

  return (
    <View>
      <View style={[styles.heroContainer, { marginHorizontal: HORIZONTAL_MARGIN }]}>
        <FlashList
          ref={listRef}
          data={slicedItems}
          renderItem={renderItem}
          keyExtractor={item => `hero-${item.id}`}
          horizontal
          pagingEnabled
          estimatedItemSize={HERO_CARD_WIDTH}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        />
      </View>
      <View style={styles.paginationContainer}>
        {slicedItems.map((_, index: number) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              activeIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// --- 4. GENRE FILTER ---
const GenreFilterItem = memo(({ genre, isSelected, onPress }: any) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.genreChipWrapper}
    >
      <View style={[styles.genreChip, isSelected && styles.genreChipActive]}>
        <Text style={styles.genreChipIcon}>{genre.icon}</Text>
        <Text style={[styles.genreChipText, isSelected && styles.genreChipTextActive]}>
          {genre.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const GenreFilter = memo(({ selectedGenre, onSelectGenre }: any) => {
  const renderItem = useCallback(
    ({ item }: any) => (
      <GenreFilterItem
        genre={item}
        isSelected={selectedGenre === item.id}
        onPress={() => onSelectGenre(item.id)}
      />
    ),
    [selectedGenre, onSelectGenre]
  );

  return (
    <View style={styles.genreFilterContainer}>
      <FlatList
        horizontal
        data={GENRE_DATA}
        renderItem={renderItem}
        keyExtractor={item => `genre-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreFilterContent}
        initialNumToRender={8}
      />
    </View>
  );
});

// --- 5. MOVIE CARD ---
const MovieCard = memo(
  ({ item, onPress, isSearchMode = false }: any) => {
    const cardWidth = isSearchMode ? SEARCH_CARD_WIDTH : EXPLORE_CARD_WIDTH;
    const cardHeight = cardWidth * 1.5;
    const showTitle = isSearchMode;

    if (!item.poster_path) {
      return <View style={{ width: cardWidth, height: cardHeight, marginLeft: 10 }} />;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={{ 
          width: cardWidth, 
          marginLeft: isSearchMode ? 0 : 10, 
          marginBottom: isSearchMode ? 16 : 0, 
          marginRight: isSearchMode ? 12 : 0 
        }}
      >
        <View style={styles.cardContainer}>
          <Image
            source={{ uri: getImageUrl(item.poster_path, 'w342') }}
            style={[styles.sectionImage, { width: cardWidth, height: cardHeight }]}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay}>
            <View style={styles.ratingBadgeSmall}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.ratingTextSmall}>
                {item.vote_average?.toFixed(1) || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        
        {showTitle && (
          <Text style={styles.sectionItemTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.isSearchMode === next.isSearchMode
);

// --- 6. MEDIA CAROUSEL ---
const MediaCarousel = memo(
  ({ title, data, navigation, isLoading = false }: any) => {
    
    const renderItem = useCallback(
      ({ item }: any) => (
        <MovieCard
          item={item}
          isSearchMode={false} 
          onPress={async () => {
            try {
              const fullDetails = await getFullDetails(item);
              navigation.navigate('Detail', { movie: fullDetails });
            } catch (error) {
              console.error('Error:', error);
            }
          }}
        />
      ),
      [navigation]
    );

    if (isLoading) {
      return (
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
            <View style={[styles.skeletonTitle, { width: '40%' }]} />
          </View>
          <View style={{flexDirection: 'row', paddingHorizontal: HORIZONTAL_MARGIN}}>
             <View style={[styles.sectionImage, styles.skeletonCard, { width: EXPLORE_CARD_WIDTH, height: EXPLORE_CARD_WIDTH * 1.5, marginRight: 10}]} />
             <View style={[styles.sectionImage, styles.skeletonCard, { width: EXPLORE_CARD_WIDTH, height: EXPLORE_CARD_WIDTH * 1.5, marginRight: 10}]} />
          </View>
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
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialIcons name="chevron-right" size={16} color="#AAAAAA" />
          </TouchableOpacity>
        </View>
        <FlashList
          horizontal
          data={data}
          renderItem={renderItem}
          estimatedItemSize={EXPLORE_CARD_WIDTH + 10}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN }}
        />
      </View>
    );
  }
);

// --- SEARCH COMPONENTS ---
const PersonSearchItem = memo(({ person, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.personItem}>
    <Image
      source={{ uri: getImageUrl(person.profile_path, 'w185') }}
      style={styles.personImage}
    />
    <Text style={styles.personName} numberOfLines={2}>
      {person.name}
    </Text>
  </TouchableOpacity>
));

const GenreSearchItem = memo(({ genre, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.genreTag}>
    <Text style={styles.genreTagName}>{genre.name}</Text>
  </TouchableOpacity>
));

const AnimatedFooter = memo(() => {
  const { tabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const animatedFooterStyle = useAnimatedStyle(() => ({
    height: withTiming(tabBarVisible ? tabBarHeight : SPARE_BOTTOM_SPACE, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    }),
  }));
  return <Animated.View style={animatedFooterStyle} />;
});

// --- 7. MAIN EXPLORE PAGE ---
const ExplorePage = () => {
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [genreResults, setGenreResults] = useState<any[]>([]);

  const [allContent, setAllContent] = useState<any>({
    trendingMovies: [], trendingTV: [], topRated: [], regional: [],
    hindiMovies: [], malayalamMovies: [], tamilMovies: [],
    hindiTV: [], malayalamTV: [], koreanMovies: [], koreanTV: [],
    japaneseMovies: [], japaneseTV: [], animeMovies: [], animeShows: [],
    animatedMovies: [],
  });

  const navigation = useNavigation();
  const { setTabBarVisible } = useContext(ScrollContext);
  const lastScrollY = useRef(0);
  const searchTimeout = useRef<any>(null);

  const fetchContent = useCallback(async (genreId: number = 0) => {
    setContentLoading(true);
    try {
      const content = await fetchAllDiscoveryContent(genreId);
      setAllContent(content);
    } catch (err) {
      console.error(err);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent(selectedGenre);
  }, [selectedGenre, fetchContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContent(selectedGenre);
    setRefreshing(false);
  }, [selectedGenre, fetchContent]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (query.trim() !== '') {
          setQuery('');
          setTmdbResults([]);
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [query])
  );

  const handleScrollChange = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY < SCROLL_THRESHOLD) {
      setTabBarVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }
    const delta = currentScrollY - lastScrollY.current;
    if (Math.abs(delta) > 10) setTabBarVisible(delta < 0);
    lastScrollY.current = currentScrollY;
  }, [setTabBarVisible]);

  const handleSearch = useCallback(async (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setTmdbResults([]); setPeopleResults([]); setGenreResults([]); setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const [results, people, genres] = await Promise.all([
        searchTMDB(trimmed), searchPeople(trimmed), searchGenres(trimmed),
      ]);
      setTmdbResults(results.filter((item: any) => item.poster_path));
      setPeopleResults(people.filter((person: any) => person.profile_path && person.popularity > 1));
      setGenreResults(genres);
    } catch (error) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [query, handleSearch]);

  const renderSearchContent = useMemo(() => {
    if (searchLoading && !tmdbResults.length && !peopleResults.length && !genreResults.length) {
      return <View style={styles.loadingContainer}><ActivityIndicator color="#E50914" size="large" /></View>;
    }
    const hasResults = tmdbResults.length > 0 || peopleResults.length > 0 || genreResults.length > 0;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.searchScrollContent}>
        {!hasResults ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={64} color="#444" />
            <Text style={styles.noResultsText}>No results found for "{query}"</Text>
          </View>
        ) : (
          <>
            {peopleResults.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchHeading}>People</Text>
                <FlatList
                  horizontal
                  data={peopleResults.slice(0, 10)}
                  keyExtractor={(p: any) => `person-${p.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN }}
                  renderItem={({ item }) => (
                    <PersonSearchItem person={item} onPress={() => navigation.navigate('CastDetails', { personId: item.id })} />
                  )}
                />
              </View>
            )}
            {genreResults.length > 0 && (
              <View style={[styles.searchSection, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
                <Text style={styles.searchHeading}>Genres</Text>
                <View style={styles.genreTagContainer}>
                  {genreResults.map((genre: any) => (
                    <GenreSearchItem
                      key={genre.id}
                      genre={genre}
                      onPress={() => navigation.navigate('ViewAll', { title: `${genre.name} Movies`, genreId: genre.id })}
                    />
                  ))}
                </View>
              </View>
            )}
            {tmdbResults.length > 0 && (
              <View style={[styles.searchSection, { paddingHorizontal: HORIZONTAL_MARGIN }]}>
                <Text style={styles.searchHeading}>Titles</Text>
                <View style={styles.searchResultsGrid}>
                  {tmdbResults.map((result: any) => (
                    <View key={`result-${result.id}`} style={styles.gridItemWrapper}>
                      <MovieCard
                        item={result}
                        isSearchMode={true}
                        onPress={async () => {
                           const fullDetails = await getFullDetails(result);
                           navigation.navigate('Detail', { movie: fullDetails });
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
  }, [searchLoading, tmdbResults, peopleResults, genreResults, query, navigation]);

  const inSearchMode = query.trim() !== '';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <AtmosphericBackground />

      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            textColor="white"
            placeholder="Search movies & TV..."
            value={query}
            onChangeText={setQuery}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            cursorColor="#E50914"
            placeholderTextColor="#8C8C8C"
            selectionColor="#E50914"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <View style={styles.searchIconContainer}>
            {searchLoading ? <ActivityIndicator color="#8C8C8C" size={20} /> : 
             query.length > 0 ? (
              <TouchableOpacity 
                onPress={() => setQuery('')} 
                style={styles.clearButton}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <MaterialIcons name="close" size={22} color="#8C8C8C" />
              </TouchableOpacity>
            ) : <Ionicons name="search" size={20} color="#8C8C8C" />}
          </View>
        </View>
      </View>

      {inSearchMode ? renderSearchContent : (
        <AnimatedScrollView
          onScroll={handleScrollChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" colors={['#E50914']} />
          }
        >
          {contentLoading ? <SkeletonHero /> : (
            <>
              <FeaturedHero items={allContent.trendingMovies} navigation={navigation} />
              
              <GenreFilter 
                selectedGenre={selectedGenre} 
                onSelectGenre={(id: number) => setSelectedGenre(id)} 
              />
            </>
          )}

          <MediaCarousel title="Trending TV Shows" data={allContent.trendingTV} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Top Rated Movies" data={allContent.topRated} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Popular in Your Region" data={allContent.regional} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Animated Movies" data={allContent.animatedMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Anime Series" data={allContent.animeShows} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Anime Movies" data={allContent.animeMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Korean TV Shows" data={allContent.koreanTV} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Korean Movies" data={allContent.koreanMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Japanese TV Shows" data={allContent.japaneseTV} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Japanese Movies" data={allContent.japaneseMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Hindi Movies" data={allContent.hindiMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Hindi Web Series" data={allContent.hindiTV} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Malayalam Movies" data={allContent.malayalamMovies} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Malayalam Web Series" data={allContent.malayalamTV} navigation={navigation} isLoading={contentLoading} />
          <MediaCarousel title="Tamil Movies" data={allContent.tamilMovies} navigation={navigation} isLoading={contentLoading} />

          <AnimatedFooter />
        </AnimatedScrollView>
      )}
    </View>
  );
};

export default ExplorePage;

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141414' },
  scrollContent: { paddingTop: 10 },
  searchScrollContent: { paddingTop: 10, paddingBottom: 100 },

  // Background
  atmosContainer: { ...StyleSheet.absoluteFillObject, zIndex: -1, backgroundColor: '#141414', overflow: 'hidden' },
  atmosGradientWrapper: { position: 'absolute', width: width * 2, height: width * 2, left: -width / 2, top: -width / 2 },
  atmosGradient: { width: '100%', height: '100%', opacity: 0.35 },

  // Search
  searchBarContainer: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 } }),
  },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, height: 48, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  searchInput: { flex: 1, backgroundColor: 'transparent', height: 48, fontSize: 16, color: 'white', paddingLeft: 16, fontFamily: 'GoogleSansFlex-Medium' },
  searchIconContainer: { paddingRight: 12, paddingLeft: 8, justifyContent: 'center', alignItems: 'center' },
  clearButton: { padding: 4 },

  // Hero
  heroContainer: {
    width: HERO_CARD_WIDTH, height: HERO_HEIGHT, backgroundColor: '#1A1A1A', borderRadius: 16, overflow: 'hidden', alignSelf: 'center', marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },}),
  },
  heroLoading: { height: HERO_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 16 },
  heroItemContainer: { width: HERO_CARD_WIDTH, height: HERO_HEIGHT },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', justifyContent: 'flex-end', padding: 20 },
  heroContentWrapper: { gap: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, letterSpacing: 0.5, fontFamily: 'GoogleSansFlex-Bold' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  ratingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', fontFamily: 'GoogleSansFlex-Bold' },
  heroYear: { color: '#E5E5E5', fontSize: 16, fontWeight: '500', fontFamily: 'GoogleSansFlex-Medium' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.4)', marginHorizontal: 4 },
  paginationDotActive: { backgroundColor: '#E50914', width: 24, height: 8, borderRadius: 4 },

  // Genre Filter
  genreFilterContainer: { marginVertical: 16 },
  genreFilterContent: { paddingHorizontal: HORIZONTAL_MARGIN, gap: 10 },
  genreChipWrapper: { marginRight: 10 },
  genreChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, minWidth: 100,
    backgroundColor: '#1B1B1B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  genreChipActive: { backgroundColor: '#E50914', borderColor: '#FF4A4A', shadowColor: '#E50914', shadowOpacity: 0.6, shadowRadius: 6 },
  genreChipIcon: { fontSize: 18, marginRight: 6 },
  genreChipText: { color: '#BEBEBE', fontSize: 14, fontWeight: '600', letterSpacing: 0.3, fontFamily: 'GoogleSansFlex-Medium' },
  genreChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Sections
  sectionContainer: { paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', letterSpacing: 0.3, fontFamily: 'GoogleSansFlex-Bold' },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
  viewAllText: { color: '#AAAAAA', fontSize: 14, fontWeight: '500', fontFamily: 'GoogleSansFlex-Medium' },
  
  // Card Styles
  cardContainer: { position: 'relative' },
  sectionImage: {
    borderRadius: 10, backgroundColor: '#1A1A1A',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 } }),
  },
  cardOverlay: { position: 'absolute', top: 8, right: 8 },
  ratingBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, gap: 3 },
  ratingTextSmall: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', fontFamily: 'GoogleSansFlex-Bold' },
  sectionItemTitle: { color: '#E5E5E5', fontSize: 13, marginTop: 8, fontWeight: '500', lineHeight: 18, fontFamily: 'GoogleSansFlex-Medium' },
  sectionItemPlaceholder: { marginLeft: 10, backgroundColor: 'transparent' },
  searchItemPlaceholder: { width: SEARCH_CARD_WIDTH, height: SEARCH_CARD_WIDTH * 1.5 + 30, marginRight: 12, backgroundColor: 'transparent' },
  skeletonCard: { backgroundColor: '#1A1A1A' },
  skeletonTitle: { backgroundColor: '#1A1A1A', height: 20, borderRadius: 4, marginBottom: 12 },

  // Search Results
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, height: height * 0.5 },
  noResultsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, minHeight: height * 0.5, gap: 16 },
  noResultsText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', fontFamily: 'GoogleSansFlex-Medium' },
  searchSection: { paddingVertical: 12 },
  searchHeading: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginVertical: 16, paddingHorizontal: HORIZONTAL_MARGIN, letterSpacing: 0.3, fontFamily: 'GoogleSansFlex-Bold' },
  personItem: { width: 100, marginRight: 14, alignItems: 'center' },
  personImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 8, backgroundColor: '#1A1A1A', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.1)' },
  personName: { color: '#FFFFFF', fontSize: 13, textAlign: 'center', width: 90, fontWeight: '500', fontFamily: 'GoogleSansFlex-Medium' },
  genreTagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genreTag: { backgroundColor: '#2A2A2A', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  genreTagName: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', fontFamily: 'GoogleSansFlex-Medium' },
  searchResultsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItemWrapper: { width: SEARCH_CARD_WIDTH, marginBottom: 10 },
});