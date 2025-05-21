import React, { useState, useEffect, useRef } from 'react';
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
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMoreContentByType, getImageUrl, getMediaDetails, getSimilarMedia } from '../src/tmdb';

const { width, height } = Dimensions.get('window');

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
  
  const mainScrollViewRef = useRef(null);

  useEffect(() => {
    if (!initialMovies) {
      loadMovies();
    } else {
      // If there's a specified initial movie, select it
      if (initialSelectedMovie) {
        handleMoviePress(initialSelectedMovie);
      } else if (movies.length > 0) {
        handleMoviePress(movies[0]);
      }
    }
  }, [initialSelectedMovie]); // Add initialSelectedMovie to dependencies

  const loadMovies = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMoreContentByType(contentType, 1);
      setMovies(data);
      // Movie details will be loaded by useEffect when movies state updates
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    try {
      const details = await getMediaDetails(movie.id, movie.media_type);
      setSelectedMovie(details);
      if (details) {
        // Fetch similar movies when a movie is selected
        const similarMedia = await getSimilarMedia(details.id, details.media_type);
        setSimilarMovies(similarMedia);
      }
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfInWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      setIsInWatchlist(list.some((item) => item.id === selectedMovie?.id));
    } catch (error) {
      console.error('Failed to check watchlist:', error);
    }
  };

  const toggleWatchlist = async () => {
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

  const handleSeasonSelect = async (seasonNumber) => {
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

  // Render a movie card in the horizontal list
  const renderMovieCard = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.movieCard,
        selectedMovie?.id === item.id && styles.selectedMovieCard
      ]}
      onPress={() => handleMoviePress(item)}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, 'w342') }}
        style={styles.cardImage}
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
    if (!selectedMovie) return null;
    
    return (
      <View style={styles.detailsContainer}>
        {/* Movie Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: getImageUrl(selectedMovie.poster_path, 'w500') }}
            style={styles.posterImage}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.movieTitle}>
              {selectedMovie.title || selectedMovie.name}
            </Text>
            <Text style={styles.year}>
              {(selectedMovie.release_date || selectedMovie.first_air_date)?.split('-')[0] || 'N/A'}
            </Text>
            
            <View style={styles.metaRow}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#E50914" />
                <Text style={styles.detailsRating}>{selectedMovie.vote_average.toFixed(1)}</Text>
              </View>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.certification}>{selectedMovie.certification || 'Unrated'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.mediaType}>
                {selectedMovie.media_type === 'movie' ? 'Movie' : 'TV Show'}
              </Text>
            </View>
            
          </View>
        </View>
      <View style={styles.contentRow}>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={openTelegramSearch}
              >
                <Text style={styles.actionButtonText}>Search on Telegram</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Main', {
                  screen: 'Search',
                  params: {
                    prefillQuery: `${selectedMovie.title || selectedMovie.name}${(selectedMovie.release_date || selectedMovie.first_air_date) && ' ' + (selectedMovie.release_date || selectedMovie.first_air_date).slice(0, 4)}`
                  },
                })}
              >
                <Text style={styles.actionButtonText}>Search on Torrent</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.watchlistButton}
              onPress={toggleWatchlist}>
            <View style={styles.circleButton}>
              <MaterialIcons 
                name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color="#fff" 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overviewText}>{selectedMovie.overview}</Text>
        </View>

        {/* Cast Section - if available */}
        {selectedMovie.cast && selectedMovie.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <FlatList
              horizontal
              data={selectedMovie.cast.slice(0, 6).map((name, index) => ({
                id: selectedMovie.castIds?.[index],
                name,
                character: selectedMovie.characters?.[index] || 'Unknown Role',
                profile_path: selectedMovie.cast_profiles?.[index],
              }))}
              keyExtractor={(item, index) => `cast-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.castItem}
                  onPress={() => navigation.navigate('CastDetails', { personId: item.id })}
                >
                  <Image
                    source={{ 
                      uri: item.profile_path 
                        ? getImageUrl(item.profile_path, 'w185')
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
              {selectedMovie.seasons.map((season) => (
                <TouchableOpacity
                  key={`season-${season.id}`}
                  style={[
                    styles.seasonTab,
                    selectedSeason === season.season_number && styles.seasonTabActive
                  ]}
                  onPress={() => handleSeasonSelect(season.season_number)}
                >
                  <Text style={styles.seasonTabText}>{season.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Episodes Section */}
            {selectedSeason && (
              <View style={styles.episodesContainer}>
                {loadingEpisodes ? (
                  <ActivityIndicator size="large" color="#E50914" />
                ) : (
                  episodes.map((episode) => (
                    <View key={`episode-${episode.id}`} style={styles.episodeCard}>
                      <Image 
                        source={{ 
                          uri: episode.still_path 
                            ? getImageUrl(episode.still_path, 'w300')
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
        <Text style={styles.loadingText}>Loading similar titles...</Text>
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
                source={{ uri: getImageUrl(item.poster_path, 'w342') }}
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        ref={mainScrollViewRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={[styles.titleHeader, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.listTitle}>{title}</Text>
        </View>

        {/* Movie List Section - Now inside the ScrollView */}
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
        
        {/* Loading or Details Section */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : renderMovieDetails()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#141414',
  },
  container: {
    flex: 1,
  },
  titleHeader: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: '#141414',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#141414',
    height: width * 0.65,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  listContent: {
    paddingRight: 16,
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
  },
  cardImage: {
    width: '100%',
    height: width * 0.42,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 4,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 12,
  },
  detailsContainer: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  posterImage: {
    width: width * 0.35,
    height: width * 0.5,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  headerInfo: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'flex-start',
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flexWrap: 'wrap',
  },
  year: {
    fontSize: 16,
    color: '#ddd',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsRating: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  metaDot: {
    fontSize: 14,
    color: '#aaa',
    marginHorizontal: 6,
  },
  certification: {
    fontSize: 14,
    color: '#fff',
  },
  mediaType: {
    fontSize: 14,
    color: '#fff',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  castItem: {
    width: width * 0.25,
    marginRight: 12,
  },
  castImage: {
    width: width * 0.22,
    height: width * 0.3,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noSimilarText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  viewAll: {
    color: '#E50914',
    fontWeight: '600',
    fontSize: width * 0.035,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 16,
  },
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  watchlistButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonTabsContainer: {
    marginVertical: 8,
  },
  seasonTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#282828',
  },
  seasonTabActive: {
    backgroundColor: '#E50914',
  },
  seasonTabText: {
    color: '#fff',
    fontSize: 14,
  },
  episodesContainer: {
    marginTop: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#282828',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  episodeImage: {
    width: 120,
    height: 68,
    backgroundColor: '#1a1a1a',
  },
  episodeContent: {
    flex: 1,
    padding: 8,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  episodeOverview: {
    color: '#aaa',
    fontSize: 12,
  },
});

export default ListDetails;