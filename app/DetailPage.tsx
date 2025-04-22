import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { getImageUrl, getMovieGenres, getSimilarMedia } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

interface HistoryItem {
  query: string;
  date: string;
}

const { width, height } = Dimensions.get('window');

const DetailPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { movie } = route.params as { movie: any };

  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [director, setDirector] = useState<{ name: string, id: number } | null>(null);
  const [genres, setGenres] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Update cast mapping to include all required data
  const castWithCharacters = useMemo(() => {
    if (!movie.cast) return [];
    return movie.cast.map((name, index) => ({
      id: movie.castIds?.[index],
      name,
      character: movie.characters?.[index] || 'Unknown Role',
      profile_path: movie.cast_profiles?.[index],
    }));
  }, [movie]);

  useEffect(() => {
    checkIfInWatchlist();
    fetchDirector();
    fetchGenres();
    fetchSimilarMovies();
  }, []);

  const fetchDirector = async () => {
    // This would be replaced with actual API call
    // For now using mock data
    setDirector({ name: "Christopher Nolan", id: 525 });
  };

  const fetchGenres = async () => {
    try {
      const movieGenres = await getMovieGenres(movie.id);
      setGenres(movieGenres);
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    }
  };

  const fetchSimilarMovies = async () => {
    setIsLoading(true);
    try {
      const media = await getSimilarMedia(movie.id, movie.media_type);
      setSimilarMovies(media);
    } catch (error) {
      console.error('Failed to fetch similar movies:', error);
    } finally {
      setIsLoading(false);
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
  
  
  

  const handleViewGenres = () => {
    navigation.navigate('ViewAll', { 
      title: 'Genres', 
      data: genres,
      type: 'genres',
      movieId: movie.id 
    });
  };

  // Update cast section render
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
        keyExtractor={(item) => `cast-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.castList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.castItem}
            onPress={() => navigation.navigate('CastDetails', { personId: item.id })}
          >
            <Image
              source={{ 
                uri: item.profile_path 
                  ? getImageUrl(item.profile_path, 'w185')
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

  // New similar movies section
  // In DetailPage.tsx, modify the renderSimilarMoviesSection function:

const renderSimilarMoviesSection = () => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Similar Movies</Text>
      {similarMovies.length > 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('SimilarList', { 
          similarMovies: similarMovies,  // Pass the already fetched similar movies
          originalMovieId: movie.id,  // Pass the original movie ID for reference
          mediaType: movie.media_type,  // Pass the media type
          title: `Similar to ${movie.title || movie.name}`  // Pass a title
        })}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
    
    {isLoading ? (
      <Text style={styles.loadingText}>Loading similar titles...</Text>
    ) : similarMovies.length > 0 ? (
      <FlatList
        horizontal
        data={similarMovies.slice(0, 10)}
        keyExtractor={(item) => `similar-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.similarItem}
            onPress={() => navigation.push('Details', { movie: item })}
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section with Large Background Image */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={{ uri: getImageUrl(movie.poster_path, 'original') }}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.gradientOverlay}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.heroContent}>
              <Text style={styles.title}>
                {movie.title || movie.name}
              </Text>
              <Text style={styles.year}>
                {(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'}
              </Text>
              
              <View style={styles.metaRow}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#E50914" />
                  <Text style={styles.rating}>{movie.vote_average.toFixed(1)}</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.certification}>{movie.certification || 'Unrated'}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.mediaType}>{movie.media_type === 'movie' ? 'Movie' : 'TV Show'}</Text>
              </View>
              <View style={styles.contentRow}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.telegramButton}
                    onPress={openTelegramSearch}
                  >
                    <Text style={styles.telegramButtonText}>Search on Telegram</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.telegramButton}
                    onPress={() => navigation.navigate('Main', {
                      screen: 'Search',
                      params: {
                        prefillQuery: `${movie.title || movie.name}${(movie.release_date || movie.first_air_date) && ' ' + (movie.release_date || movie.first_air_date).slice(0, 4)}`
                      },
                    })}
                  >
                    <Text style={styles.telegramButtonText}>Search on Torrent</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.watchlistButton}
                  onPress={toggleWatchlist}
                >
                  <View style={styles.circleButton}>
                    <MaterialIcons 
                      name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                      size={24} 
                      color="#fff" 
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Genres Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <TouchableOpacity onPress={handleViewGenres}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
            {genres.map(genre => (
              <Chip 
                key={genre.id} 
                style={styles.genreChip} 
                textStyle={styles.genreChipText}
                onPress={() => navigation.navigate('ViewAll', { 
                  title: `${genre.name} Movies`,
                  genreId: genre.id,
                  type: 'genre',
                  data: []  // Start with empty data, let ViewAll fetch it
                })}
              >
                {genre.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
        
        {/* Overview Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overviewText}>
            {showFullOverview
              ? `${movie.overview} `
              : `${movie.overview.slice(0, 150)}... `}
            <Text
              onPress={() => setShowFullOverview(!showFullOverview)}
              style={styles.showMore}
            >
              {showFullOverview ? 'Show Less' : 'Show More'}
            </Text>
          </Text>
        </View>
        
        {/* Director Section */}
        {director && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Director</Text>
            <TouchableOpacity 
              style={styles.directorContainer}
              onPress={() => navigation.navigate('CastDetails', { personId: director.id })}
            >
              <Text style={styles.directorName}>{director.name}</Text>
              <Feather name="chevron-right" size={20} color="#E50914" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Cast Section */}
        {castWithCharacters.length > 0 && renderCastSection()}
        
        {/* Similar Movies Section */}
        {renderSimilarMoviesSection()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  heroContainer: {
    height: height * 0.65,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  heroContent: {
    padding: 16,
    paddingBottom: 24,
    marginTop: 'auto',
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  year: {
    fontSize: width * 0.04,
    color: '#ddd',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: width * 0.035,
    color: '#fff',
    marginLeft: 4,
  },
  metaDot: {
    fontSize: width * 0.035,
    color: '#aaa',
    marginHorizontal: 6,
  },
  certification: {
    fontSize: width * 0.035,
    color: '#fff',
  },
  mediaType: {
    fontSize: width * 0.035,
    color: '#fff',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 16,
  },
  watchlistButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  telegramButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '48%',  // Adjust to control button width
    alignItems: 'center',
  },
  telegramButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#141414',
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
    fontSize: width * 0.045,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  viewAll: {
    color: '#E50914',
    fontWeight: '600',
    fontSize: width * 0.035,
  },
  genreScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  genreChip: {
    marginRight: 8,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  genreChipText: {
    color: '#fff',
  },
  overviewText: {
    fontSize: width * 0.037,
    color: '#ddd',
    lineHeight: 22,
  },
  showMore: {
    color: '#E50914',
    fontWeight: '600',
  },
  directorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#282828',
    padding: 12,
    borderRadius: 8,
  },
  directorName: {
    fontSize: width * 0.04,
    color: '#fff',
    fontWeight: '500',
  },
  castList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  castItem: {
    width: width * 0.28,
    marginRight: 12,
  },
  castImage: {
    width: width * 0.25,
    height: width * 0.35,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  castName: {
    fontSize: width * 0.035,
    color: '#fff',
    fontWeight: '600',
  },
  characterName: {
    fontSize: width * 0.03,
    color: '#aaa',
  },
  // Similar Movies Styles
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
    fontSize: width * 0.035,
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
    fontSize: width * 0.03,
    color: '#aaa',
    marginLeft: 4,
  },
  loadingText: {
    color: '#aaa',
    fontSize: width * 0.035,
    padding: 16,
    textAlign: 'center',
  },
  noSimilarText: {
    color: '#aaa',
    fontSize: width * 0.035,
    padding: 16,
    textAlign: 'center',
  },
});

export default DetailPage;