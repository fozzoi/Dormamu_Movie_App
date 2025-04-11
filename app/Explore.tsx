// ExplorePage.tsx
import React, { useEffect, useState } from 'react';
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
  RefreshControl, // Import RefreshControl
} from 'react-native';
import {
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import {
  searchTMDB,
  getTrendingMovies,
  getTrendingTV,
  getTopRated,
  getRegionalMovies,
  getImageUrl,
  TMDBResult,
} from '../src/tmdb';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3; // 3 cards per row with 16px padding

const Section = ({ title, data, navigation }: any) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <FlatList
      horizontal
      data={data}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Detail', { movie: item })}
          style={styles.sectionItem}
        >
          <Image
            source={{ uri: getImageUrl(item.poster_path) }}
            style={styles.sectionImage}
          />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

const ExplorePage = () => {
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [topRated, setTopRated] = useState<TMDBResult[]>([]);
  const [regional, setRegional] = useState<TMDBResult[]>([]);
  const [query, setQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const navigation = useNavigation();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchTMDB(query.trim());

      // Filter: Only results that start with input (case-insensitive), have poster and rating > 0
      const filtered = results.filter((item) =>
        (item.title || item.name)?.toLowerCase().startsWith(query.trim().toLowerCase()) &&
        item.poster_path &&
        item.vote_average > 0
      );
      setTmdbResults(filtered);
    } catch (error) {
      Alert.alert('Error', 'TMDB search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderSearchItem = ({ item }: { item: TMDBResult }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Detail', { movie: item })}
      style={styles.searchItem}
    >
      <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.sectionImage} />
    </TouchableOpacity>
  );

  const fetchDiscoveryContent = async () => {
    try {
      setTrendingMovies(await getTrendingMovies());
      setTrendingTV(await getTrendingTV());
      setTopRated(await getTopRated());
      setRegional(await getRegionalMovies('IN'));
    } catch (err) {
      Alert.alert('Error', 'Failed to load discovery content');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDiscoveryContent(); // Reload discovery content
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDiscoveryContent();
  }, []);

  const inSearchMode = query.trim() !== '' && tmdbResults.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        {!inSearchMode && <Text style={styles.header}>Explore</Text>}
        <TextInput
          placeholder="Search here"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text === '') {
              setTmdbResults([]);
            }
          }}
          mode="outlined"
          style={styles.searchInput}
          onSubmitEditing={handleSearch} // Trigger search when "Enter" is pressed
        />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> // Add pull-to-refresh
          }
        >
          <Section title="🔥 Trending Movies" data={trendingMovies} navigation={navigation} />
          <Section title="📺 Trending TV Shows" data={trendingTV} navigation={navigation} />
          <Section title="⭐ Top Rated" data={topRated} navigation={navigation} />
          <Section title="🌏 Regional Picks (India)" data={regional} navigation={navigation} />
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
    alignItems: 'center', // Center the heading horizontally
  },
  header: {
    color: '#fff',
    fontSize: 24, // Slightly reduced font size
    fontWeight: 'bold',
    marginBottom: 20, // Move the heading slightly down
    textAlign: 'center', // Center the text
  },
  searchInput: {
    backgroundColor: '#fff',
    width: '100%', // Ensure the search bar spans the full width
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
    borderRadius: 10,
    backgroundColor: '#333',
  },
  discoveryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default ExplorePage;
