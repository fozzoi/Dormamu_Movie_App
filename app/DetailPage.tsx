import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { 
  getImageUrl, 
  getMovieGenres, 
  getSimilarMedia, 
  getSeasonEpisodes, 
  TMDBEpisode, 
  TMDBSeason,
  TMDBCastMember 
} from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface HistoryItem {
  query: string;
  date: string;
}

const { width, height } = Dimensions.get('window');

// --- IMAGE SIZE CONSTANTS ---
const IMAGE_SIZES = {
  // REDUCED from w342 for list items:
  THUMBNAIL: 'w154',    
  // REDUCED from original for blurred background:
  POSTER_DETAIL: 'w780', 
  // REDUCED from w185 for profiles:
  PROFILE: 'w154',      
  STILL: 'w300',        
  // Kept ORIGINAL for the modal viewer:
  BLURRED_BG: 'original', 
};
// ----------------------------

// --- SKELETON ANIMATION COMPONENTS ---
const SHIMMER_WIDTH = width * 0.7; 

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
          colors={['transparent', 'rgba(255, 255, 255, 0.15)', 'transparent']} 
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.skeletonShimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// --- SKELETON COMPONENTS ---

const SkeletonHeader = () => (
    <View style={styles.skeletonHeaderContainer}>
        {/* Title and Metadata Placeholder */}
        <View style={styles.heroContent}>
            <View style={styles.skeletonTextWrapper}>
                <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '90%', height: 30, marginBottom: 12 }]} />
            </View>
            <View style={styles.skeletonTextWrapper}>
                <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '70%', height: 30, marginBottom: 12 }]} />
            </View>

            <View style={styles.metaRow}>
                <View style={styles.skeletonChipWrapper}><SkeletonShimmer containerStyle={styles.skeletonChip} /></View>
                <View style={styles.skeletonChipWrapper}><SkeletonShimmer containerStyle={styles.skeletonChip} /></View>
                <View style={styles.skeletonChipWrapper}><SkeletonShimmer containerStyle={styles.skeletonChip} /></View>
            </View>
            
            <View style={styles.heroActionRow}>
                <View style={styles.skeletonHeroIconWrapper}><SkeletonShimmer containerStyle={styles.skeletonHeroIcon} /></View>
                <View style={styles.skeletonHeroIconWrapper}><SkeletonShimmer containerStyle={styles.skeletonHeroIcon} /></View>
                <View style={styles.skeletonHeroIconWrapper}><SkeletonShimmer containerStyle={styles.skeletonHeroIcon} /></View>
            </View>
        </View>
    </View>
);

const SkeletonSection = ({ numItems = 6, itemWidth = width * 0.28, itemHeight = width * 0.42 + 30, isCast = false }) => (
    <View style={styles.sectionContainer}>
        <View style={styles.skeletonTextWrapper}>
            <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '40%', height: 20, marginBottom: 12 }]} />
        </View>
        
        <FlatList
          horizontal
          data={Array(numItems).fill(0)}
          keyExtractor={(_, index) => `skel-${index}-${isCast}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={isCast ? styles.castList : styles.similarList}
          renderItem={() => (
            <View style={[styles.skeletonItem, { width: itemWidth }]}>
                <View style={styles.skeletonItemShimmer}>
                    <SkeletonShimmer containerStyle={[styles.skeletonImagePlaceholder, { 
                        width: '100%', 
                        height: isCast ? itemWidth * 1.4 : itemWidth * 1.5,
                        borderRadius: isCast ? 8 : 8 
                    }]} />
                </View>
                
                <View style={styles.skeletonTextWrapper}>
                    <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '80%', height: 14, marginTop: 6 }]} />
                </View>
                
                <View style={styles.skeletonTextWrapper}>
                    <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '60%', height: 12, marginTop: 4 }]} />
                </View>
            </View>
          )}
        />
    </View>
);

const SkeletonDetails = () => (
  <View style={styles.detailsContent}>
    
    {/* Genres section */}
    <View style={styles.sectionContainer}>
      <View style={styles.skeletonTextWrapper}>
        <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '30%', height: 20, marginBottom: 12 }]} />
      </View>
      
      {/* Genre chips row */}
      <View style={styles.genreScroll}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonChipHorizontal}>
            <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: 80, height: 30 }]} />
          </View>
        ))}
      </View>
    </View>

    {/* Overview section */}
    <View style={styles.sectionContainer}>
      <View style={styles.skeletonTextWrapper}>
        <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '50%', height: 20, marginBottom: 12 }]} />
      </View>
      
      {/* Overview text lines */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonTextWrapper}>
            <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: i === 3 ? '80%' : '100%', height: 16, marginBottom: 8 }]} />
        </View>
      ))}
    </View>
    
    {/* Cast section */}
    <SkeletonSection 
        numItems={5} 
        itemWidth={width * 0.25} 
        isCast={true}
    /> 
    
    {/* Director section placeholder */}
    <View style={styles.sectionContainer}>
        <View style={styles.skeletonTextWrapper}>
            <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: '30%', height: 20, marginBottom: 12 }]} />
        </View>
        <View style={styles.glassCard}>
            <View style={styles.directorContainer}>
                 <View style={styles.skeletonTextWrapper}>
                    <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: 120, height: 16 }]} />
                </View>
                 <View style={styles.skeletonTextWrapper}>
                    <SkeletonShimmer containerStyle={[styles.skeletonLine, { width: 20, height: 20 }]} />
                </View>
            </View>
        </View>
    </View>

    {/* Similar section */}
    <SkeletonSection 
        numItems={4} 
        itemWidth={width * 0.28} 
        isCast={false}
    /> 
  </View>
);
// ---------------------------------------------


const DetailPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { movie } = route.params as { movie: any };

  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [genres, setGenres] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // <-- Set to TRUE initially
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  const [isPosterModalVisible, setIsPosterModalVisible] = useState(false);

  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const scale = useSharedValue(1);
  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Scroll-based animations
  const posterTranslateY = scrollY.interpolate({
    inputRange: [0, height * 0.3],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const posterOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.2, height * 0.35],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.15, height * 0.3],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });

  const overlayBorderRadius = scrollY.interpolate({
    inputRange: [0, height * 0.2],
    outputRange: [0, 32],
    extrapolate: 'clamp',
  });

  const castWithCharacters: TMDBCastMember[] = useMemo(() => {
    if (!movie.cast || !Array.isArray(movie.cast)) {
      return [];
    }
    return movie.cast;
  }, [movie.cast]);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );

    const loadDetails = async () => {
      try {
        await checkIfInWatchlist();
        await fetchGenres();
        await fetchSimilarMovies();
        
        if (movie.media_type === 'tv' && movie.seasons && movie.seasons.length > 0) {
          const firstSeason = movie.seasons.find(s => s.season_number > 0);
          if (firstSeason) {
            setSelectedSeason(firstSeason.season_number);
            await fetchEpisodes(firstSeason.season_number);
          } else if (movie.seasons.length > 0) {
            setSelectedSeason(movie.seasons[0].season_number);
            await fetchEpisodes(movie.seasons[0].season_number);
          }
        }
      } catch (error) {
        console.error("Error loading details:", error);
      } finally {
        setIsLoading(false); // <-- Stop loading after all async calls complete
      }
    };

    loadDetails();
  }, [movie.id, scale]); 

  const fetchGenres = async () => {
    try {
      const movieGenres = await getMovieGenres(movie.id, movie.media_type);
      setGenres(movieGenres);
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    }
  };

  const fetchSimilarMovies = async () => {
    try {
      const media = await getSimilarMedia(movie.id, movie.media_type);
      setSimilarMovies(media);
    } catch (error) {
      console.error('Failed to fetch similar movies:', error);
    }
  };
  
  const fetchEpisodes = async (seasonNumber: number) => {
    setLoadingEpisodes(true);
    try {
      const seasonEpisodes = await getSeasonEpisodes(movie.id, seasonNumber);
      setEpisodes(seasonEpisodes);
    } catch (error) { 
      console.error('Failed to fetch episodes:', error);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const checkIfInWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      const exists = list.some((item: any) => item.id === movie.id);
      setIsInWatchlist(exists);
    } catch (error) {
      console.log('Failed to check watchlist:', error);
    }
  };

  const toggleWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      const exists = list.some((item: any) => item.id === movie.id);

      if (exists) {
        const updatedList = list.filter((item: any) => item.id !== movie.id);
        await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
        setIsInWatchlist(false);
      } else {
        const updatedList = [...list, movie];
        await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
        setIsInWatchlist(true);
      }
    } catch (error) {
      console.log('Failed to update watchlist:', error);
    }
  };

  const openTelegramSearch = () => {
    const title = movie.title || movie.name;
    const date = movie.release_date || movie.first_air_date;
    const year = date ? date.substring(0, 4) : '';
    const message = encodeURIComponent(`${title} ${year}`);
  
    const telegramLink = `tg://msg?text=${message}`;
  
    Linking.openURL(telegramLink).catch(err => {
      const webLink = `https://t.me/share/url?text=${message}`;
      Linking.openURL(webLink);
    });
  };
  
  const openTorrentSearch = () => {
    const query = `${movie.title || movie.name} ${(movie.release_date || movie.first_air_date)?.slice(0, 4) || ''}`;
    navigation.navigate('Search', {
      screen: 'SearchMain',
      params: { prefillQuery: query }
    });
  };
  
  const handleViewGenres = () => {
    navigation.navigate('ViewAll', { 
      title: 'Genres', 
      data: genres,
      type: 'genres',
      movieId: movie.id 
    });
  };
  
  const handleSeasonSelect = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    fetchEpisodes(seasonNumber);
  };

  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 
      ? `${hours}h ${remainingMinutes}m` 
      : `${remainingMinutes}m`;
  };

  const renderCastSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cast</Text>
        {castWithCharacters.length > 10 && (
          <TouchableOpacity onPress={() => navigation.navigate('ViewAll', { 
            title: 'Full Cast',
            data: castWithCharacters,
            type: 'cast'
          })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        horizontal
        data={castWithCharacters.slice(0, 10)}
        keyExtractor={(item, index) => `cast-${item?.id || 'item'}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.castList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.castItem}
            onPress={() => navigation.navigate('CastDetails', { personId: item.id })}
          >
            <Image
              source={{ 
                // --- OPTIMIZED SIZE: Use THUMBNAIL size (w154) for cast photos ---
                uri: item.profile_path 
                  ? getImageUrl(item.profile_path, IMAGE_SIZES.THUMBNAIL)
                  : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'
              }}
              style={styles.castImage}
            />
            <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.characterName} numberOfLines={1}>{item.character}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSimilarMoviesSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Similar {movie.media_type === 'movie' ? 'Movies' : 'Shows'}
        </Text>
        {similarMovies.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('ListDetails', { 
            movies: similarMovies,
            contentType: 'similar',
            title: `Similar to ${movie.title || movie.name}`,
            initialSelectedMovie: similarMovies[0]
          })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {similarMovies.length > 0 ? (
        <FlatList
          horizontal
          data={similarMovies.slice(0, 10)}
          keyExtractor={(item, index) => `similar-${item?.id || 'item'}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.similarList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.similarItem}
              onPress={() => navigation.navigate('ListDetails', { 
                movies: similarMovies,
                contentType: 'similar',
                title: `Similar to ${movie.title || movie.name}`,
                initialSelectedMovie: item
              })}
            >
              <Image
                // --- OPTIMIZED SIZE: Use THUMBNAIL size (w154) for similar cards ---
                source={{ uri: getImageUrl(item.poster_path, IMAGE_SIZES.THUMBNAIL) }}
                style={styles.similarImage}
              />
              <Text style={styles.similarTitle} numberOfLines={2}>
                {item.title || item.name}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#E50914" />
                <Text style={styles.similarRating}>{item.vote_average.toFixed(1)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.noSimilarText}>No similar titles found</Text>
      )}
    </View>
  );
  
  const renderSeasonsSection = () => {
    if (movie.media_type !== 'tv' || !movie.seasons || movie.seasons.length === 0) {
      return null;
    }
    
    const filteredSeasons = movie.seasons.length > 1 
      ? movie.seasons.filter(season => season.season_number > 0)
      : movie.seasons;
      
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Seasons</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonTabsContainer}
        >
          {filteredSeasons.map((season: TMDBSeason) => (
            <TouchableOpacity
              key={`season-${season.id}`}
              style={[
                styles.seasonTab,
                selectedSeason === season.season_number && styles.seasonTabActive
              ]}
              onPress={() => handleSeasonSelect(season.season_number)}
            >
              <BlurView
                intensity={90}
                tint="dark"
                style={styles.seasonTabBlur}
              >
                <Text 
                  style={[
                    styles.seasonTabText,
                    selectedSeason === season.season_number && styles.seasonTabTextActive
                  ]}
                >
                  {season.name}
                </Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {selectedSeason !== null && (
          <View style={styles.episodesContainer}>
            {loadingEpisodes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
              </View>
            ) : episodes.length > 0 ? (
              episodes.map((episode) => (
                <BlurView
                  key={`episode-${episode.id}`}
                  style={styles.episodeCard}
                  intensity={90}
                  tint="dark"
                >
                  <View style={styles.episodeHeader}>
                    <Image 
                      source={{ 
                        // --- OPTIMIZED SIZE: Use STILL size (w300) for episode images ---
                        uri: episode.still_path 
                          ? getImageUrl(episode.still_path, IMAGE_SIZES.STILL) 
                          : 'https://via.placeholder.com/300x169?text=No+Image'
                      }}
                      style={styles.episodeImage}
                    />
                    <View style={styles.episodeOverlay}>
                      <Text style={styles.episodeNumber}>
                        E{episode.episode_number}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.episodeContent}>
                    <View style={styles.episodeContentHeader}>
                      <Text style={styles.episodeTitle} numberOfLines={1}>
                        {episode.name}
                      </Text>
                      <View style={styles.episodeRatingContainer}>
                        <Ionicons name="star" size={14} color="#E50914" />
                        <Text style={styles.episodeRating}>{episode.vote_average.toFixed(1)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.episodeMetaRow}>
                      {episode.air_date && (
                        <Text style={styles.episodeMetaText}>
                          {new Date(episode.air_date).toLocaleDateString()}
                        </Text>
                      )}
                      {episode.runtime && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.episodeMetaText}>
                            {formatRuntime(episode.runtime)}
                          </Text>
                        </>
                      )}
                    </View>
                    
                    <Text 
                      style={styles.episodeOverview} 
                      numberOfLines={2}
                    >
                      {episode.overview || 'No description available.'}
                    </Text>
                  </View>
                </BlurView>
              ))
            ) : (
              <Text style={styles.noEpisodesText}>
                No episodes information available
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.baseContainer}>
      
      <View style={styles.animatedBgContainer}>
        <Animated.Image
          // --- OPTIMIZED SIZE: Use POSTER_DETAIL (w780) for the blurred background ---
          source={{ uri: getImageUrl(movie.poster_path, IMAGE_SIZES.POSTER_DETAIL) }}
          style={[styles.blurredBackground, animatedBgStyle]}
          blurRadius={40}
        />
      </View>
      <View style={styles.backgroundOverlay} />

      <Modal
        visible={isPosterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPosterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setIsPosterModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            // --- FULL RESOLUTION: Use BLURRED_BG (original) for the modal image ---
            source={{ uri: getImageUrl(movie.poster_path, IMAGE_SIZES.BLURRED_BG) }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <RNAnimated.View 
          style={[
            styles.heroContainer,
            {
              transform: [{ translateY: posterTranslateY }],
              opacity: posterOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => setIsPosterModalVisible(true)}
          >
            <ImageBackground
              // --- OPTIMIZED SIZE: Use POSTER_DETAIL (w780) for the main image background ---
              source={{ uri: getImageUrl(movie.poster_path, IMAGE_SIZES.POSTER_DETAIL) }}
              style={styles.imageBackground}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  'rgba(20, 20, 20, 0.8)',
                  'transparent',
                  'rgba(20, 20, 20, 0.85)'
                ]}
                style={styles.gradientOverlay}
              >
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <BlurView
                    intensity={90}
                    tint="dark"
                    style={styles.blurViewStyle}
                  >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                  </BlurView>
                </TouchableOpacity>
                
                {/* RENDER SKELETON HEADER OR REAL HEADER CONTENT */}
                {isLoading ? (
                    <SkeletonHeader />
                ) : (
                <View style={styles.heroContent}>
                  <Text style={styles.title}>
                    {movie.title || movie.name}
                  </Text>
                  
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="star" size={14} color="#E50914" />
                      <Text style={styles.metaText}>{movie.vote_average.toFixed(1)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaText}>
                        {(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaText}>{movie.certification || 'Unrated'}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaText}>{movie.media_type === 'movie' ? 'Movie' : 'TV Show'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.heroActionRow}>
                    <TouchableOpacity onPress={openTelegramSearch}>
                      <BlurView style={styles.heroIcon} intensity={90} tint="dark">
                        <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openTorrentSearch}>
                      <BlurView style={styles.heroIcon} intensity={90} tint="dark">
                        <Feather name="download" size={20} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleWatchlist}>
                      <BlurView style={styles.heroIcon} intensity={90} tint="dark">
                        <MaterialIcons 
                          name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                          size={20} 
                          color={isInWatchlist ? "#E50914" : "#fff"} 
                        />
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
          
          <RNAnimated.View
            style={[
              styles.blurredRoundedOverlay,
              {
                opacity: overlayOpacity,
                borderRadius: overlayBorderRadius,
              }
            ]}
            pointerEvents="none"
          >
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          </RNAnimated.View>
        </RNAnimated.View>

        <View style={styles.contentContainer}>
          
          {/* RENDER SKELETON DETAILS OR REAL SECTIONS */}
          {isLoading ? (
             <SkeletonDetails />
          ) : (
          <>
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Genres</Text>
                <TouchableOpacity onPress={handleViewGenres}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
                {genres.map(genre => (
                  <BlurView 
                    key={genre.id} 
                    style={styles.genreChip}
                    intensity={90}
                    tint="dark"
                  >
                    <TouchableOpacity
                       onPress={() => navigation.navigate('ViewAll', { 
                        title: `${genre.name} ${movie.media_type === 'movie' ? 'Movies' : 'Shows'}`,
                        genreId: genre.id,
                        type: 'genre',
                        data: []
                      })}
                    >
                      <Text style={styles.genreChipText}>
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  </BlurView>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overviewText}>
                {showFullOverview || movie.overview.length <= 150
                  ? `${movie.overview} `
                  : `${movie.overview.slice(0, 150)}... `}
                {movie.overview.length > 150 && (
                  <Text
                    onPress={() => setShowFullOverview(!showFullOverview)}
                    style={styles.showMore}
                  >
                    {showFullOverview ? 'Show Less' : 'Show More'}
                  </Text>
                )}
              </Text>
            </View>
            
            {castWithCharacters.length > 0 && renderCastSection()}

            {movie.media_type === 'movie' && movie.director && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Director</Text>
                <BlurView style={styles.glassCard} intensity={90} tint="dark">
                  <TouchableOpacity 
                    style={styles.directorContainer}
                    onPress={() => navigation.navigate('CastDetails', { personId: movie.director.id })}
                  >
                    <Text style={styles.directorName}>{movie.director.name}</Text>
                    <Feather name="chevron-right" size={20} color="#E50914" />
                  </TouchableOpacity>
                </BlurView>
              </View>
            )}
            
            {movie.media_type === 'tv' && renderSeasonsSection()}
            
            {renderSimilarMoviesSection()}
          </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  heroContainer: {
    height: height * 0.55,
    position: 'relative',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 16,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurViewStyle: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    padding: 16,
    paddingBottom: 24,
    marginTop: 'auto',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: 'transparent',
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  viewAll: {
    color: '#E50914',
    fontWeight: '600',
    fontSize: 14,
  },
  genreScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  genreChip: {
    marginRight: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  genreChipText: {
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 14,
  },
  overviewText: {
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
  },
  showMore: {
    color: '#E50914',
    fontWeight: 'bold',
  },
  glassCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  directorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  directorName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  castList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  castItem: {
    width: width * 0.28, // Using a consistent size
    marginRight: 12,
  },
  castImage: {
    width: width * 0.25,
    height: width * 0.35,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  castName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  characterName: {
    fontSize: 12,
    color: '#aaa',
  },
  similarList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  similarItem: {
    width: width * 0.28,
    marginRight: 12,
  },
  similarImage: {
    width: width * 0.28,
    height: width * 0.42,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  similarTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  similarRating: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 4,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
  noSimilarText: {
    color: '#aaa',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
  seasonTabsContainer: {
    paddingVertical: 8,
  },
  seasonTab: {
    marginRight: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seasonTabActive: {
    borderColor: '#E50914',
  },
  seasonTabBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seasonTabText: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '500',
  },
  seasonTabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  episodesContainer: {
    marginTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  episodeCard: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  episodeHeader: {
    position: 'relative',
  },
  episodeImage: {
    width: '100%',
    height: width * 0.4,
    backgroundColor: '#1a1a1a',
  },
  episodeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 8,
  },
  episodeNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  episodeContent: {
    padding: 12,
  },
  episodeContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  episodeTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    flex: 1,
  },
  episodeRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeRating: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  episodeMetaText: {
    color: '#aaa',
    fontSize: 12,
  },
  metaDot: {
    color: '#aaa',
    marginHorizontal: 6,
  },
  episodeOverview: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  noEpisodesText: {
    color: '#aaa',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 70,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  blurredRoundedOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  // --- SKELETON SPECIFIC STYLES ---

  skeletonHeaderContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    paddingTop: 40,
    // Add a temporary background to the whole hero area to ensure the shimmer works
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
  },
  skeletonShimmerContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // The placeholder view handles the background color
  },
  skeletonShimmerGradient: {
    flex: 1,
    width: SHIMMER_WIDTH, 
  },
  // Wrapper for text lines to control height and margin
  skeletonTextWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Placeholder for any rectangular content (text lines, titles)
  skeletonLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skeletonChipWrapper: {
    width: 60,
    height: 20,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Placeholder background
  },
  skeletonChip: {
    width: '100%',
    height: '100%',
  },
  skeletonHeroIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Placeholder background
  },
  skeletonHeroIcon: {
    width: '100%',
    height: '100%',
  },
  skeletonItem: {
    marginRight: 12,
  },
  skeletonItemShimmer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Placeholder background
    width: '100%',
    height: 'auto',
  },
  skeletonImagePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  skeletonChipHorizontal: {
    marginRight: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  }
});

export default DetailPage;