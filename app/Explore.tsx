import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  searchTMDB,
  fetchAllDiscoveryContent,
  getImageUrl,
  getFullDetails,
  TMDBResult,
} from '../src/tmdb';
import LoadingCard from './LoadingCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.28; // Slightly smaller for better Netflix look
const FEATURED_HEIGHT = height * 0.65; // Height for featured content

// Card component with animation
const MovieCard = ({ item, onPress, index = 0, featured = false }) => {
  if (!item.poster_path) return null;
  
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(index * 50)}
      exiting={FadeOut.duration(200)}
    >
      <TouchableOpacity
        onPress={onPress}
        style={featured ? styles.featuredItem : styles.sectionItem}
      >
        <Image
          source={{ uri: getImageUrl(item.poster_path, featured ? 'w780' : 'w342') }}
          style={featured ? styles.featuredImage : styles.sectionImage}
          resizeMode={featured ? 'cover' : 'cover'}
        />
        
        {featured && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#141414']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>{item.title || item.name}</Text>
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredRating}>
                  {item.vote_average ? item.vote_average.toFixed(1) : '?'} ★
                </Text>
                <Text style={styles.featuredYear}>
                  {(item.release_date || item.first_air_date || '').substring(0, 4)}
                </Text>
              </View>
              <View style={styles.featuredButtons}>
                <TouchableOpacity style={styles.playButton}>
                  <MaterialIcons name="play-arrow" size={24} color="#000" />
                  <Text style={styles.playButtonText}>Play</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.myListButton}>
                  <MaterialIcons name="add" size={24} color="#fff" />
                  <Text style={styles.myListButtonText}>My List</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const Section = ({ title, data, navigation, isLoading = false }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('ViewAll', { title, data })}
        style={styles.viewAllButton}
      >
        <Text style={styles.viewAllText}>View All</Text>
        <MaterialIcons name="chevron-right" size={16} color="#AAAAAA" />
      </TouchableOpacity>
    </View>
    {isLoading ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingCard key={index} index={index} delay={index} />
        ))}
      </ScrollView>
    ) : (
      <FlatList
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
                console.error("Error fetching details:", error);
                navigation.navigate('Detail', { movie: item });
              }
            }}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionListContent}
      />
    )}
  </View>
);

const ExplorePage = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [regional, setRegional] = useState([]);
  const [query, setQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredContent, setFeaturedContent] = useState(null);
  const navigation = useNavigation();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchTMDB(query.trim());

      // Filter: Only results that have poster and rating > 0
      const filtered = results.filter((item) =>
        (item.title || item.name)?.toLowerCase().includes(query.trim().toLowerCase()) &&
        item.poster_path
      );
      setTmdbResults(filtered);
    } catch (error) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const viewAllSearchResults = useCallback(() => {
    if (tmdbResults.length > 0) {
      // Include the search query in the title for proper fetch in ViewAll
      navigation.navigate('ViewAll', { 
        title: `Search: ${query}`, 
        data: tmdbResults 
      });
    }
  }, [tmdbResults, query, navigation]);

  const renderSearchItem = ({ item, index }) => (
    <Animated.View
      entering={FadeIn.duration(300).delay(index * 50)}
      exiting={FadeOut.duration(200)}
    >
      <View style={styles.searchItem}>
        <TouchableOpacity
          onPress={async () => {
            try {
              const fullDetails = await getFullDetails(item);
              navigation.navigate('Detail', { movie: fullDetails });
            } catch (error) {
              navigation.navigate('Detail', { movie: item });
            }
          }}
        >
          <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.searchImage} />
          <Text style={styles.searchItemTitle} numberOfLines={1}>
            {item.title || item.name}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const fetchDiscoveryContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const content = await fetchAllDiscoveryContent();
      setTrendingMovies(content.trendingMovies);
      setTrendingTV(content.trendingTV);
      setTopRated(content.topRated);
      setRegional(content.regional);
      
      // Set featured content from trending movies or shows
      if (content.trendingMovies?.length > 0) {
        // Find a movie with high rating as featured
        const featured = content.trendingMovies.find(m => m.vote_average >= 7) || 
                         content.trendingMovies[0];
        setFeaturedContent(featured);
      }
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
      
      {/* Search bar - Netflix style with logo */}
      <View style={styles.searchSection}>
        {!inSearchMode && (
          <View style={styles.logoContainer}>
            <Text style={styles.netflixLogo}>N</Text>
          </View>
        )}
        
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8C8C8C" style={styles.searchIcon} />
          <TextInput
            textColor='white'
            placeholder="Search titles, genres or people"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text === '') {
                setTmdbResults([]);
              } else if (text.length > 2) {
                // Auto-search after 2 characters
                handleSearch();
              }
            }}
            underlineColor='transparent'
            activeUnderlineColor='transparent'
            cursorColor='white'
            placeholderTextColor='#8C8C8C'
            selectionColor='#E50914'
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity 
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <MaterialIcons name="close" size={20} color="#8C8C8C" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {inSearchMode ? (
        <View style={styles.searchResultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#E50914" size="large" />
            </View>
          ) : tmdbResults.length > 0 ? (
            <>
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>
                  Results for "{query}" ({tmdbResults.length})
                </Text>
                {tmdbResults.length > 6 && (
                  <TouchableOpacity onPress={viewAllSearchResults}>
                    <Text style={styles.viewAllSearchText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={tmdbResults.slice(0, 6)} // Show first 6 results
                renderItem={renderSearchItem}
                keyExtractor={(item) => `search-${item.id}`}
                numColumns={3}
                contentContainerStyle={styles.searchResultsGrid}
              />
            </>
          ) : query.length > 2 ? (
            <View style={styles.noResultsContainer}>
              <MaterialIcons name="search-off" size={50} color="#8C8C8C" />
              <Text style={styles.noResultsText}>No results found for "{query}"</Text>
              <Text style={styles.noResultsSubText}>
                Try different keywords or check the spelling
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />
          }
        >
          {/* Sections */}
          <Section
            title="Trending Movies"
            data={trendingMovies}
            navigation={navigation}
            isLoading={contentLoading}
          />
          <Section
            title="Trending TV Shows"
            data={trendingTV}
            navigation={navigation}
            isLoading={contentLoading}
          />
          <Section
            title="Top Rated"
            data={topRated}
            navigation={navigation}
            isLoading={contentLoading}
          />
          <Section
            title="Popular in Your Region"
            data={regional}
            navigation={navigation}
            isLoading={contentLoading}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 10,
    zIndex: 99,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
  },
  logoContainer: {
    marginRight: 15,
  },
  netflixLogo: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 5,
    height: 40,
  },
  searchIcon: {
    paddingLeft: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 40,
    fontSize: 14,
  },
  clearButton: {
    padding: 8,
  },
  sectionContainer: {
    marginTop: 20,
    paddingLeft: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  sectionListContent: {
    paddingRight: 10,
  },
  sectionItem: {
    marginRight: 8,
    width: CARD_WIDTH,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 4,
  },
  featuredItem: {
    width: width,
    height: FEATURED_HEIGHT,
  },
  featuredImage: {
    width: width,
    height: FEATURED_HEIGHT,
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FEATURED_HEIGHT / 2,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredContent: {
    marginBottom: 20,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featuredRating: {
    color: '#E50914',
    fontWeight: 'bold',
    marginRight: 12,
  },
  featuredYear: {
    color: '#AAAAAA',
  },
  featuredButtons: {
    flexDirection: 'row',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  playButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  myListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  myListButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  searchResultsContainer: {
    flex: 1,
    padding: 10,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchResultsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllSearchText: {
    color: '#E50914',
    fontSize: 14,
  },
  searchResultsGrid: {
    paddingBottom: 15,
  },
  searchItem: {
    flex: 1/3,
    padding: 4,
  },
  searchImage: {
    width: '100%',
    height: width / 3 * 1.5,
    borderRadius: 4,
  },
  searchItemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubText: {
    color: '#8C8C8C',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ExplorePage;