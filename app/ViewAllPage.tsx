// ViewAllPage.tsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { ScrollContext } from '../context/ScrollContext';
import { getMoviesByGenre, getImageUrl, getFullDetails, TMDBResult } from '../src/tmdb'; // Make sure to import getMoviesByGenre
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
  
  // Get all params
  const { title, data, genreId } = route.params as {
    title: string;
    data?: TMDBResult[];
    genreId?: number;
  };

  // --- NEW STATE ---
  // Use passed data as initial, otherwise empty array
  const [movies, setMovies] = useState<TMDBResult[]>(data || []);
  const [isLoading, setIsLoading] = useState(false);
  
  const { setTabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const lastScrollY = useRef(0);

  // --- NEW LOGIC ---
  // If a genreId is passed, fetch data
  useEffect(() => {
    // Only fetch if genreId is provided AND data is not already passed
    if (genreId && !data) {
      const fetchByGenre = async () => {
        setIsLoading(true);
        try {
          const genreMovies = await getMoviesByGenre(genreId);
          setMovies(genreMovies);
        } catch (error) {
          console.error("Failed to fetch genre movies:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchByGenre();
    }
  }, [genreId, data]); // Depend on genreId and data

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
          ListFooterComponent={AnimatedFooter}
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
    color: '#E5E5E5',
    fontSize: 13,
    marginTop: 6,
  },
});

export default ViewAllPage;