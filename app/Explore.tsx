// ExplorePage.tsx
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
} from 'react-native';
import {
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  searchTMDB,
  fetchAllDiscoveryContent,
  getImageUrl,
  getFullDetails,
  TMDBResult,
} from '../src/tmdb';
import LoadingSection from './LoadingSection';
import LoadingCard from './LoadingCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3; // 3 cards per row with 16px padding

// Card component with animation
const MovieCard = ({ item, onPress, index = 0 }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(index * 50)}
      exiting={FadeOut.duration(200)}
    >
      <TouchableOpacity
        onPress={onPress}
        style={styles.sectionItem}
      >
        <Image
          source={{ uri: getImageUrl(item.poster_path) }}
          style={styles.sectionImage}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const Section = ({ title, data, navigation, isLoading = false }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
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
              // Get full details before navigating to detail page
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
  const navigation = useNavigation();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchTMDB(query.trim());

      // Filter: Only results that start with input (case-insensitive), have poster and rating > 0
      const filtered = results.filter((item) =>
        (item.title || item.name)?.toLowerCase().includes(query.trim().toLowerCase()) &&
        item.poster_path &&
        item.vote_average > 0
      );
      setTmdbResults(filtered);
    } catch (error) {
      Alert.alert('Error', 'TMDB search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

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
          <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.sectionImage} />
          <Text style={{ color: 'white', marginTop: 4 }}>
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
    } catch (err) {
      Alert.alert('Error', 'Failed to load discovery content');
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

  const inSearchMode = query.trim() !== '' && tmdbResults.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        {!inSearchMode && <Text style={styles.header}>Explore</Text>}
        <View style={styles.searchInputContainer}>
          <TextInput
            textColor='white'
            placeholder="Search here"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text === '') {
                setTmdbResults([]);
              }
            }}
            underlineColor='transparent'
            activeUnderlineColor='transparent'
            cursorColor='white'
            placeholderTextColor='gray'
            selectionColor='gray'
            style={styles.searchInput}
            onSubmitEditing={handleSearch}
          />
          {query.trim() !== '' && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setTmdbResults([]);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={24} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : inSearchMode ? (
        <FlatList
          data={tmdbResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          numColumns={3}
          contentContainerStyle={styles.searchResultsContainer}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.discoveryContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Section 
            title="🔥 Trending Movies" 
            data={trendingMovies} 
            navigation={navigation} 
            isLoading={contentLoading} 
          />
          <Section 
            title="📺 Trending TV Shows" 
            data={trendingTV} 
            navigation={navigation} 
            isLoading={contentLoading} 
          />
          <Section 
            title="⭐ Top Rated" 
            data={topRated} 
            navigation={navigation} 
            isLoading={contentLoading} 
          />
          <Section 
            title="🌏 Regional Picks (India)" 
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
    backgroundColor: '#000',
  },
  searchSection: {
    padding: 16,
    alignItems: 'center',
  },
  header: {
    color: '#fff',
    fontSize: 35,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 20,
  },
  searchInputContainer: {
    position: 'relative',
    width: '100%',
  },
  searchInput: {
    backgroundColor: 'black',
    color: 'white',
    fontSize: 16,
    width: '100%',
    paddingRight: 40,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'gray',
    borderTopEndRadius: 20,
    borderTopLeftRadius: 20,
    paddingStart: 10,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  loader: {
    marginTop: 20,
  },
  searchResultsContainer: {
    padding: 16,
  },
  searchItem: {
    width: CARD_WIDTH,
    margin: 4,
  },
  sectionContainer: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionItem: {
    marginRight: 12,
  },
  sectionImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    resizeMode: 'cover',
    borderRadius: 10,
    backgroundColor: '#333',
  },
  discoveryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default ExplorePage;