// ViewAllPage.tsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { ScrollContext } from '../context/ScrollContext';
import { getMoviesByGenre, getImageUrl, getFullDetails, TMDBResult } from '../src/tmdb';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const SCROLL_THRESHOLD = 50;
const SPARE_BOTTOM_SPACE = 20;

// --- Animated Footer Component ---
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
// --- End Footer ---

const ViewAllPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { title, data, genreId } = route.params as {
    title: string;
    data?: TMDBResult[];
    genreId?: number;
  };

  const [movies, setMovies] = useState<TMDBResult[]>(data || []);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- FIX: Added new state for pagination ---
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Tracks if more pages are available
  
  const { setTabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Only fetch if genreId is provided AND data is not already passed
    if (genreId && !data) {
      const fetchInitialPage = async () => {
        setIsLoading(true);
        setPage(1); // Reset to page 1
        setHasMore(true); // Assume there are more pages
        try {
          // Fetch page 1
          const genreMovies = await getMoviesByGenre(genreId, 1);
          setMovies(genreMovies);
          if (genreMovies.length === 0) {
            setHasMore(false); // No results, stop pagination
          }
        } catch (error) {
          console.error("Failed to fetch genre movies:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialPage();
    } else if (data) {
      // If data was passed directly (like "Trending"), we can't paginate it
      setHasMore(false);
    }
  }, [genreId, data]); // Depend on genreId and data

  // --- FIX: New function to load more movies ---
  const loadMoreMovies = async () => {
    // Stop if we're already loading, if there's no genreId, or if the API has no more pages
    if (isLoading || isLoadingMore || !genreId || !hasMore) {
      return;
    }
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const newMovies = await getMoviesByGenre(genreId, nextPage);
      
      if (newMovies.length > 0) {
        // Add new movies to the end of the current list
        setMovies((prevMovies) => [...prevMovies, ...newMovies]);
        setPage(nextPage);
      } else {
        // No more results, stop fetching
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch more genre movies:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  const renderMovieCard = ({ item }: { item: TMDBResult }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={async () => {
        const fullDetails = await getFullDetails(item);
        navigation.navigate('Detail', { movie: fullDetails });
      }}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path, 'w342') }}
        style={styles.cardImage}
      />
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title || item.name}
      </Text>
    </TouchableOpacity>
  );

  // --- FIX: New footer to show loading spinner at the bottom ---
  const renderFooter = () => {
    // Show the loading spinner only when loading more
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#E50914" />
        </View>
      );
    }
    // Always render the AnimatedFooter for spacing
    return <AnimatedFooter />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlashList
          data={movies}
          renderItem={renderMovieCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          estimatedItemSize={200}
          contentContainerStyle={styles.listContent}
          onScroll={handleScrollChange}
          scrollEventThrottle={16}
          // --- FIX: Added pagination props ---
          onEndReached={loadMoreMovies}
          onEndReachedThreshold={0.5} // Fetch when 50% from the end
          ListFooterComponent={renderFooter} // Use new footer
        />
      )}
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
    paddingTop: (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  cardContainer: {
    flex: 1 / 3,
    padding: 6,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3, // Standard poster ratio
    borderRadius: 8,
    backgroundColor: '#222',
  },
  cardTitle: {
    color: '#E5E5EV', // Typo fixed
    fontSize: 13,
    marginTop: 6,
  },
  // --- FIX: Added style for the new footer loader ---
  footerLoading: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ViewAllPage;