import React, { useEffect, useState } from 'react';
import {
  View,
  Dimensions,
  ImageBackground,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { getImageUrl } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import index from './index';

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

  useEffect(() => {
    checkIfInWatchlist();
  }, []);

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

  return (
    <ScrollView style={styles.container}>
      <View>
        <ImageBackground
          source={{ uri: getImageUrl(movie.poster_path, 'original') }}
          style={styles.imageBackground}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.infoContainer}>
            <Text style={styles.title}>
              {movie.title || movie.name} ({(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'})
            </Text>
            <View style={styles.row}>
              <Text style={styles.rating}>
                Rating: {movie.vote_average.toFixed(1)}
              </Text>
              <Text style={styles.certification}>
                {movie.certification || 'Unrated'}
              </Text>
            </View>
            <Text style={styles.mediaType}>
              {movie.media_type === 'movie' ? 'Movie' : 'TV Show'}
            </Text>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.castContainer}>
          <Text style={styles.castTitle}>
            Cast:
          </Text>
          <Text style={styles.castText}>
            {movie.cast?.slice(0, 5).join(', ') || 'N/A'}
          </Text>
        </View>
        <Text style={styles.overviewTitle}>Overview</Text>
        <Text style={styles.overviewText}>
          {showFullOverview
            ? `${movie.overview} `
            : `${movie.overview.slice(0, 100)}... `}
          <Text
            onPress={() => setShowFullOverview(!showFullOverview)}
            style={styles.showMore}
          >
            {showFullOverview ? 'Show Less' : 'Show More'}
          </Text>
        </Text>
        <Button
          mode="contained"
          onPress={async () => {
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
          }}
          style={styles.watchlistButton}
        >
          {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </Button>
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate('Main', {
              screen: 'Search', // Use the bottom tab navigator's route
              params: { prefillQuery: movie.title || movie.name }, // Pass prefillQuery correctly
            })
          }
          style={styles.watchlistButton}
        >
          Search
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageBackground: {
    width: '100%',
    height: height * 0.7,
    
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
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginBottom: 20,
    
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rating: {
    fontSize: width * 0.04,
    color: '#fff',
  },
  certification: {
    fontSize: width * 0.04,
    color: '#fff',
  },
  mediaType: {
    fontSize: width * 0.04,
    color: '#fff',
    marginTop: 4,
  },
  contentContainer: {
    padding: 16,
    borderTopStartRadius: 30,
    borderTopEndRadius: 30,
    backgroundColor: '#111',
    zIndex: 10,
    marginTop: -20,
  },
  castContainer: {
    marginBottom: 16,
  },
  castTitle: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  castText: {
    fontSize: width * 0.04,
    color: '#fff',
    lineHeight: 20,
  },
  overviewTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  overviewText: {
    fontSize: width * 0.04,
    color: '#fff',
    marginBottom: 16,
  },
  showMore: {
    color: 'gray',
    fontWeight: '600',
  },
  watchlistButton: {
    marginBottom: 12,
  },
});

export default DetailPage;
