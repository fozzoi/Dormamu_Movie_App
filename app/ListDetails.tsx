import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  StatusBar 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  fetchMoreContentByType, 
  getImageUrl, 
  getMediaDetails, 
  getSimilarMedia,
  getSeasonEpisodes,
  TMDBCastMember 
} from '../src/tmdb';

import { LinearGradient } from 'expo-linear-gradient'; 
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// --- IMAGE SIZE CONSTANTS for clarity and performance ---
const IMAGE_SIZES = {
  THUMBNAIL: 'w154',    
  POSTER_DETAIL: 'w780', 
  PROFILE: 'w185',      
  STILL: 'w300',        
  BLURRED_BG: 'original', 
};
// --------------------------------------------------------

// --- SKELETON ANIMATION COMPONENTS ---

const SHIMMER_WIDTH = width * 0.7; // Width of the shimmering gradient

const SkeletonShimmer = ({ children, containerStyle = {} }) => {
  const shimmer = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(width + SHIMMER_WIDTH, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmer.value }],
    };
  });

  return (
    <View style={[styles.skeletonShimmerContainer, containerStyle]}>
      {children}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.15)', 'transparent']} // Slightly stronger shimmer
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.skeletonShimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// 1. Corrected Skeleton Header (Single Shimmer Instance)
const SkeletonHeader = () => (
  <View style={styles.headerContainer}>
    <SkeletonShimmer containerStyle={styles.skeletonPosterImageContainer}>
      {/* Placeholder within the shimmer boundary */}
      <View style={styles.skeletonPosterImage} /> 
    </SkeletonShimmer>

    <View style={styles.headerInfo}>
      <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '100%', height: 24, marginBottom: 8 }}>
        <View style={[styles.skeletonLine, { width: '80%', height: 24 }]} />
      </SkeletonShimmer>

      <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '100%', height: 16 }}>
        <View style={[styles.skeletonLine, { width: '50%', height: 16 }]} />
      </SkeletonShimmer>
      
      <View style={styles.metaRow}>
        <SkeletonShimmer containerStyle={styles.skeletonChipContainer}><View style={styles.skeletonChip} /></SkeletonShimmer>
        <SkeletonShimmer containerStyle={styles.skeletonChipContainer}><View style={styles.skeletonChip} /></SkeletonShimmer>
        <SkeletonShimmer containerStyle={styles.skeletonChipContainer}><View style={styles.skeletonChip} /></SkeletonShimmer>
      </View>
      
      <View style={styles.heroActionRow}>
        <SkeletonShimmer containerStyle={styles.skeletonHeroIcon}><View style={styles.skeletonHeroIconPlaceholder} /></SkeletonShimmer>
        <SkeletonShimmer containerStyle={styles.skeletonHeroIcon}><View style={styles.skeletonHeroIconPlaceholder} /></SkeletonShimmer>
        <SkeletonShimmer containerStyle={styles.skeletonHeroIcon}><View style={styles.skeletonHeroIconPlaceholder} /></SkeletonShimmer>
      </View>
    </View>
  </View>
);

// 2. Corrected Skeleton Section (Shimmer applied to each item, which is standard for lists)
const SkeletonSection = ({ numItems = 6, itemWidth = width * 0.25, itemHeight = width * 0.34 + 30 }) => (
  <View style={styles.section}>
    <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '40%', height: 20, marginBottom: 12 }}>
      <View style={[styles.skeletonLine, { width: '100%', height: 20 }]} />
    </SkeletonShimmer>
    
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {Array(numItems).fill(0).map((_, index) => (
        <View key={index} style={[styles.skeletonItem, { width: itemWidth, height: itemHeight }]}>
          <SkeletonShimmer containerStyle={styles.skeletonItemShimmer}>
            <View style={[styles.skeletonImagePlaceholder, { width: '100%', height: itemWidth * 1.4 }]} />
          </SkeletonShimmer>
          
          <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '100%', height: 12, marginTop: 6 }}>
            <View style={[styles.skeletonLine, { width: '80%', height: 12 }]} />
          </SkeletonShimmer>
          
          <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '100%', height: 10, marginTop: 4 }}>
            <View style={[styles.skeletonLine, { width: '60%', height: 10 }]} />
          </SkeletonShimmer>
        </View>
      ))}
    </ScrollView>
  </View>
);

const SkeletonDetails = () => (
  <View style={styles.detailsContent}>
    <SkeletonHeader />
    
    {/* Overview section */}
    <View style={styles.section}>
      <SkeletonShimmer containerStyle={{ borderRadius: 4, width: '50%', height: 20, marginBottom: 12 }}>
        <View style={[styles.skeletonLine, { width: '100%', height: 20 }]} />
      </SkeletonShimmer>
      
      {/* Overview text lines */}
      {[1, 2, 3].map((i) => (
        <SkeletonShimmer key={i} containerStyle={{ borderRadius: 4, width: i === 3 ? '80%' : '100%', height: 14, marginBottom: 6 }}>
          <View style={[styles.skeletonLine, { width: '100%', height: 14 }]} />
        </SkeletonShimmer>
      ))}
    </View>
    
    {/* Cast section */}
    <SkeletonSection numItems={5} /> 
    
    {/* Similar section */}
    <SkeletonSection numItems={5} itemWidth={width * 0.28} itemHeight={width * 0.42 + 30}/> 
  </View>
);

// --------------------------------------------------------

const ListDetails = ({ route, navigation }) => {
  const { contentType = 'trending', movies: initialMovies, title, initialSelectedMovie } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const [movies, setMovies] = useState(initialMovies || []);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialMovies);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isSimilarLoading, setIsSimilarLoading] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  const [bgPoster, setBgPoster] = useState(null);
  
  const mainScrollViewRef = useRef(null);

  const scale = useSharedValue(1);
  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );

    const firstMovie = initialSelectedMovie || initialMovies?.[0];
    if (firstMovie) {
      setBgPoster(firstMovie.poster_path); 
      handleMoviePress(firstMovie);
    } else if (!initialMovies) {
      loadMovies(); 
    }
  }, [initialSelectedMovie]); 

  const loadMovies = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMoreContentByType(contentType, 1);
      setMovies(data);
      if (data.length > 0) {
        setBgPoster(data[0].poster_path); 
        handleMoviePress(data[0]); 
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } 
  };

  const fetchSimilarMovies = async (movieId, mediaType) => {
    setIsSimilarLoading(true);
    try {
      const media = await getSimilarMedia(movieId, mediaType);
      setSimilarMovies(media);
    } catch (error) {
      console.error('Failed to fetch similar movies:', error);
    } finally {
      setIsSimilarLoading(false);
    }
  };

  const handleMoviePress = async (movie) => {
    setSelectedSeason(null);
    setEpisodes([]);
    setIsLoading(true);

    // Scroll to top
    mainScrollViewRef.current?.scrollTo({ y: 0, animated: false });

    try {
      const details = await getMediaDetails(movie.id, movie.media_type);
      
      setBgPoster(details.poster_path); 
      setSelectedMovie(details);
      
      if (details) {
        fetchSimilarMovies(details.id, details.media_type);
        checkIfInWatchlist(details); 
        
        if (details.media_type === 'tv' && details.seasons && details.seasons.length > 0) {
          const firstSeason = details.seasons.find(s => s.season_number > 0) || details.seasons[0];
          if (firstSeason) {
            handleSeasonSelect(firstSeason.season_number);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfInWatchlist = async (movieDetails) => {
    if (!movieDetails) return;
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      setIsInWatchlist(list.some((item) => item.id === movieDetails.id));
    } catch (error) {
      console.error('Failed to check watchlist:', error);
    }
  };

  const toggleWatchlist = async () => {
    if (!selectedMovie) return;
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      const exists = list.some((item) => item.id === selectedMovie.id);

      if (exists) {
        const updatedList = list.filter((item) => item.id !== selectedMovie.id);
        await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
        setIsInWatchlist(false);
      } else {
        const updatedList = [...list, selectedMovie];
        await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
        setIsInWatchlist(true);
      }
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    }
  };

  const openTelegramSearch = () => {
    if (!selectedMovie) return;
    const title = selectedMovie.title || selectedMovie.name;
    const date = selectedMovie.release_date || selectedMovie.first_air_date;
    const year = date ? date.substring(0, 4) : '';
    const message = encodeURIComponent(`${title} ${year}`);
    
    const telegramLink = `tg://msg?text=${message}`;
    Linking.openURL(telegramLink).catch(err => {
      const webLink = `https://t.me/share/url?text=${message}`;
      Linking.openURL(webLink);
    });
  };
  
  const openTorrentSearch = () => {
    if (!selectedMovie) return;
    const query = `${selectedMovie.title || selectedMovie.name} ${(selectedMovie.release_date || selectedMovie.first_air_date)?.slice(0, 4) || ''}`;
    navigation.navigate('Search', {
      screen: 'SearchMain',
      params: { prefillQuery: query }
    });
  };

  const handleSeasonSelect = async (seasonNumber) => {
    if (!selectedMovie) return;
    setSelectedSeason(seasonNumber);
    setLoadingEpisodes(true);
    try {
      const seasonEpisodes = await getSeasonEpisodes(selectedMovie.id, seasonNumber);
      setEpisodes(seasonEpisodes);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const renderMovieCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => handleMoviePress(item)}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, IMAGE_SIZES.THUMBNAIL) }}
        style={[styles.cardImage,selectedMovie?.id === item.id && styles.selectedMovieCard]}
      />
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title || item.name}
      </Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={12} color="#E50914" />
        <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
    
  );

  // Render Movie Details Section
  const renderMovieDetails = () => {
    const castData: TMDBCastMember[] = selectedMovie.cast || [];
    
    return (
      <View style={styles.detailsContent}> 
        {/* Movie Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: getImageUrl(selectedMovie.poster_path, IMAGE_SIZES.POSTER_DETAIL) }}
            style={styles.posterImage}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.movieTitle}>
              {selectedMovie.title || selectedMovie.name}
            </Text>
            
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="star" size={14} color="#E50914" />
                <Text style={styles.metaText}>{selectedMovie.vote_average.toFixed(1)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {(selectedMovie.release_date || selectedMovie.first_air_date)?.split('-')[0] || 'N/A'}
                </Text>
              </View>
              {selectedMovie.certification && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>{selectedMovie.certification}</Text>
                </View>
              )}
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{selectedMovie.media_type === 'movie' ? 'Movie' : 'TV Show'}</Text>
              </View>
            </View>
            
            <View style={styles.heroActionRow}>
              <TouchableOpacity style={styles.heroIcon} onPress={openTelegramSearch}>
                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIcon} onPress={openTorrentSearch}>
                <Feather name="download" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIcon} onPress={toggleWatchlist}>
                <MaterialIcons 
                  name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color={isInWatchlist ? "#E50914" : "#fff"} 
                />
              </TouchableOpacity>
            </View>

          </View>
        </View>
        
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overviewText}>{selectedMovie.overview}</Text>
        </View>

        {/* Director Section */}
        {selectedMovie.media_type === 'movie' && selectedMovie.director && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Director</Text>
            <TouchableOpacity 
              style={styles.directorContainer}
              onPress={() => navigation.navigate('CastDetails', { personId: selectedMovie.director.id })}
            >
              <Text style={styles.directorName}>{selectedMovie.director.name}</Text>
              <Feather name="chevron-right" size={20} color="#E50914" />
            </TouchableOpacity>
          </View>
        )}

        {/* Cast Section */}
        {castData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <FlatList
              horizontal
              data={castData.slice(0, 6)} 
              keyExtractor={(item) => `cast-${item.id}`} 
              renderItem={({ item }) => ( 
                <TouchableOpacity 
                  style={styles.castItem}
                  onPress={() => navigation.navigate('CastDetails', { personId: item.id })}
                >
                  <Image
                    source={{ 
                      uri: item.profile_path 
                        ? getImageUrl(item.profile_path, IMAGE_SIZES.PROFILE)
                        : 'https://via.placeholder.com/185x278?text=No+Image'
                    }}
                    style={styles.castImage}
                  />
                  <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.characterName} numberOfLines={1}>{item.character}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true} 
            />
          </View>
        )}

        {/* Add Seasons Section for TV Shows */}
        {selectedMovie.media_type === 'tv' && selectedMovie.seasons && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seasons</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.seasonTabsContainer}
              nestedScrollEnabled={true} 
            >
              {(selectedMovie.seasons.filter(s => s.season_number > 0) || selectedMovie.seasons).map((season) => (
                <TouchableOpacity
                  key={`season-${season.id}`}
                  style={[
                    styles.seasonTab,
                    selectedSeason === season.season_number && styles.seasonTabActive
                  ]}
                  onPress={() => handleSeasonSelect(season.season_number)}
                >
                  <Text style={[
                    styles.seasonTabText,
                    selectedSeason === season.season_number && styles.seasonTabTextActive
                  ]}>
                    {season.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Episodes Section */}
            {selectedSeason !== null && ( 
              <View style={styles.episodesContainer}>
                {loadingEpisodes ? (
                  <ActivityIndicator size="large" color="#E50914" />
                ) : (
                  episodes.map((episode) => (
                    <View key={`episode-${episode.id}`} style={styles.episodeCard}>
                      <Image 
                        source={{ 
                          uri: episode.still_path 
                            ? getImageUrl(episode.still_path, IMAGE_SIZES.STILL)
                            : 'https://via.placeholder.com/300x169?text=No+Image'
                        }}
                        style={styles.episodeImage}
                      />
                      <View style={styles.episodeContent}>
                        <Text style={styles.episodeTitle}>
                          {episode.episode_number}. {episode.name}
                        </Text>
                        <Text style={styles.episodeOverview} numberOfLines={2}>
                          {episode.overview || 'No description available.'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* Similar Movies Section */}
        {renderSimilarMoviesSection()}
      </View>
    );
  };

  const renderSimilarMoviesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Similar Movies</Text>
        {similarMovies.length > 0 && (
          <TouchableOpacity onPress={() => navigation.push('ListDetails', { 
            movies: similarMovies,
            contentType: 'similar',
            title: `Similar to ${selectedMovie?.title || selectedMovie?.name}`
          })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {isSimilarLoading ? (
        // Use the corrected SkeletonSection for similar media
        <SkeletonSection numItems={5} itemWidth={width * 0.28} itemHeight={width * 0.42 + 30}/>
      ) : similarMovies.length > 0 ? (
        <FlatList
          horizontal
          data={similarMovies.slice(0, 10)}
          keyExtractor={(item) => `similar-${item.id}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.similarItem}
              onPress={() => navigation.push('ListDetails', { 
                movies: similarMovies,
                contentType: 'similar',
                title: `Similar to ${selectedMovie?.title || selectedMovie?.name}`,
                initialSelectedMovie: item
              })}
            >
              <Image
                source={{ uri: getImageUrl(item.poster_path, IMAGE_SIZES.THUMBNAIL) }}
                style={styles.similarImage}
              />
              <Text style={styles.similarTitle} numberOfLines={2}>
                {item.title || item.name}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#E50914" />
                <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
              </View>
            </TouchableOpacity>
          )}
          nestedScrollEnabled={true} 
        />
      ) : (
        <Text style={styles.noSimilarText}>No similar titles found</Text>
      )}
    </View>
  );

  return (
    <View style={styles.baseContainer}>
      <StatusBar barStyle="light-content" />

      {/* Animated Blurred Background */}
      <View style={styles.animatedBgContainer}>
        <Animated.Image
          source={{ uri: getImageUrl(bgPoster, IMAGE_SIZES.BLURRED_BG) }}
          style={[styles.blurredBackground, animatedBgStyle]}
          blurRadius={50}
        />
      </View>
      <View style={styles.backgroundOverlay} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          ref={mainScrollViewRef}
          style={styles.container}
          contentContainerStyle={[styles.detailsScrollContent,]}
          showsVerticalScrollIndicator={false}
        >
          {/* List Title */}
          <View style={styles.listTitleContainer}>
            <Text style={styles.listTitle}>{title}</Text>
          </View>
          
          {/* Movie List (No skeleton needed here since initialMovies are passed immediately) */}
          <View style={styles.listSection}>
            <FlatList
              horizontal
              data={movies}
              renderItem={renderMovieCard}
              keyExtractor={(item) => `movie-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              onScrollToIndexFailed={() => {}}
              nestedScrollEnabled={true} 
            />
          </View>

          {/* Details Section */}
          <View style={styles.contentSheet}> 
            {isLoading ? (
              // --- RENDER SKELETON UI WHEN LOADING ---
              <SkeletonDetails />
            ) : (
              selectedMovie && renderMovieDetails()
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// --- UPDATED STYLES FOR SKELETON ANIMATION ---
const styles = StyleSheet.create({
  // ... (Base Styles kept)
  baseContainer: {
    flex: 1,
    backgroundColor: '#141414',
  },
  animatedBgContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurredBackground: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 20, 0.75)', 
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listTitleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    zIndex: 2,
    paddingTop: 30,
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    height: width * 0.60, 
    zIndex: 2,

  },
  listTitle: {
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    zIndex: 3,
  },
  listContent: {
    paddingRight: 20,
  },
  movieCard: {
    width: width * 0.28,
    marginRight: 12,
    padding: 4,
    borderRadius: 8,
  },
  selectedMovieCard: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderWidth: 2,
    borderColor: '#E50914',
    shadowColor: '#e50914ff',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 100,
    shadowRadius: 10,
    elevation: 10,
  },
  cardImage: {
    width: '100%',
    height: width * 0.42,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: 10,
    color: '#fff',
    marginTop: 6,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 4,
    fontWeight: '500',
  },
  detailsScrollContent: {
    // paddingBottom set dynamically
  },
  contentSheet: {
    backgroundColor: 'rgba(0, 0, 0, 0.41)', 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24, 
    marginTop: 0, 
    zIndex: 3, 
  },
  detailsContent: {
    paddingHorizontal: 18, 
    paddingBottom: 70,
    
  },
  loadingContainer: { 
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', 
  },
  loadingText: { 
    color: '#aaa',
    fontSize: 16,
    marginTop: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  posterImage: {
    width: width * 0.35,
    height: width * 0.52,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  headerInfo: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'flex-start',
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flexWrap: 'wrap',
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', 
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  metaText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16, 
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginTop: 24, 
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 22,
  },
  castItem: {
    width: width * 0.25,
    marginRight: 12,
  },
  castImage: {
    width: width * 0.25,
    height: width * 0.34,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  castName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 6,
  },
  characterName: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  similarItem: {
    width: width * 0.28,
    marginRight: 12,
    marginBlockEnd: 82,
  },
  similarImage: {
    width: width * 0.28,
    height: width * 0.42,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  similarTitle: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noSimilarText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  viewAll: {
    color: '#E50914',
    fontWeight: '700',
    fontSize: 15,
  },
  seasonTabsContainer: {
    marginVertical: 8,
  },
  seasonTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  seasonTabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.25)',
    borderColor: '#E50914',
    borderWidth: 2,
  },
  seasonTabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  episodesContainer: {
    marginTop: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  episodeImage: {
    width: 120,
    height: 68,
    backgroundColor: '#1a1a1a',
  },
  episodeContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  episodeOverview: {
    color: '#bbb',
    fontSize: 12,
    lineHeight: 16,
  },
  directorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  directorName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // --- SKELETON SPECIFIC STYLES ---

  // Shimmer container - must have borderRadius and overflow: 'hidden'
  skeletonShimmerContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // We remove the background color here because the placeholder element will handle it
  },
  skeletonShimmerGradient: {
    flex: 1,
    width: SHIMMER_WIDTH, 
  },
  // Placeholder for any rectangular content (text lines, titles)
  skeletonLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Container for the poster image (needs explicit dimensions/border)
  skeletonPosterImageContainer: {
    width: width * 0.35,
    height: width * 0.52,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Placeholder inside the poster image shimmer container
  skeletonPosterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonChipContainer: {
    width: 60,
    height: 20,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonChip: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonHeroIconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonItem: {
    marginRight: 12,
    // No background here, handled by shimmer container
  },
  skeletonItemShimmer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    height: 'auto', // Let content define height
  },
  skeletonImagePlaceholder: {
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  }
});

export default ListDetails;