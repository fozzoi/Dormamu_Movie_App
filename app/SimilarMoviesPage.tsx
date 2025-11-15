import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSimilarMedia, getImageUrl, TMDBResult } from '../src/tmdb';

const { width, height } = Dimensions.get('window');

const SimilarMoviesPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { title, movieId, mediaType } = route.params as { 
    title: string,
    movieId: number,
    mediaType: 'movie' | 'tv' 
  };

  const [movies, setMovies] = useState<TMDBResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSimilarMovies = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) {
      setIsLoading(true);
    }
    
    try {
      const results = await getSimilarMedia(movieId, mediaType, pageNum);
      
      if (results.length === 0) {
        setHasMorePages(false);
      } else {
        if (refresh || pageNum === 1) {
          setMovies(results);
        } else {
          setMovies(prevMovies => [...prevMovies, ...results]);
        }
      }
    } catch (error) {
      console.error('Error fetching similar movies:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [movieId, mediaType]);

  const handleLoadMore = () => {
    if (!isLoading && hasMorePages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSimilarMovies(nextPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMorePages(true);
    fetchSimilarMovies(1, true);
  };

  useEffect(() => {
    fetchSimilarMovies();
  }, [fetchSimilarMovies]);

  const renderMovieItem = ({ item }: { item: TMDBResult }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate('Details', { movie: item })}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, 'w342') }}
        style={styles.poster}
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.title || item.name}
        </Text>
        <Text style={styles.movieYear}>
          {(item.release_date || item.first_air_date)?.split('-')[0] || 'N/A'}
        </Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#E50914" />
          <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No similar titles found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Movie list */}
      <FlatList
        data={movies}
        keyExtractor={(item) => `movie-${item.id}`}
        renderItem={renderMovieItem}
        numColumns={3}
        contentContainerStyle={styles.list}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: '#161616',
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  list: {
    padding: 12,
    paddingBottom: 50,
  },
  movieItem: {
    width: (width - 48) / 3,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  poster: {
    width: '100%',
    height: (width - 48) / 3 * 1.5,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  movieInfo: {
    marginTop: 6,
  },
  movieTitle: {
    color: '#fff',
    fontSize: width * 0.035,
    fontWeight: '600',
  },
  movieYear: {
    color: '#aaa',
    fontSize: width * 0.03,
    marginVertical: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#aaa',
    fontSize: width * 0.03,
    marginLeft: 4,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#aaa',
    fontSize: width * 0.04,
    textAlign: 'center',
  },
});

export default SimilarMoviesPage;