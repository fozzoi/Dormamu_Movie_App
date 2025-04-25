import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
      <ScrollView style={styles.detailsContainer}>
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
            />
          </View>
        )}

        {/* Similar Movies Section */}
        {renderSimilarMoviesSection()}
      </ScrollView>
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
        />
      ) : (
        <Text style={styles.noSimilarText}>No similar titles found</Text>
      )}
    </View>
  );

  // Update scrollTo behavior when a movie is selected
  useEffect(() => {
    if (selectedMovie) {
      const selectedIndex = movies.findIndex(m => m.id === selectedMovie.id);
      if (selectedIndex !== -1 && listRef.current) {
        listRef.current.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5
        });
      }
    }
  }, [selectedMovie]);

  const listRef = React.useRef(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.listSection, { paddingTop: insets.top }]}>
          <Text style={styles.listTitle}>{title}</Text>
          <View style={styles.listWrapper}>
            <FlatList
              ref={listRef}
              horizontal
              data={movies}
              renderItem={renderMovieCard}
              keyExtractor={(item) => `movie-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              onScrollToIndexFailed={() => {}}
            />
          </View>
        </View>
        
        {/* Details Section */}
        <View style={styles.detailsSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : renderMovieDetails()}
        </View>
      </View>
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
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#141414',
  },
  listWrapper: {
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
  detailsSection: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
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
});

export default ListDetails;