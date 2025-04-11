import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  ImageBackground,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { getImageUrl } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageBackground
        source={{ uri: getImageUrl(movie.poster_path, 'original') }}
        style={{ width: '100%', height: width * 1.5 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            position: 'absolute',
            top: 40,
            left: 16,
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 20,
            padding: 8,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
            {movie.title || movie.name} ({(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'})
          </Text>
          <Text style={{ fontSize: 16, color: '#fff', marginTop: 4 }}>
            Rating: {movie.vote_average.toFixed(1)}
          </Text>
        </View>
      </ImageBackground>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
          Overview
        </Text>
        <Text style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>
          {showFullOverview
            ? `${movie.overview} `
            : `${movie.overview.slice(0, 100)}... `}
          <Text
            onPress={() => setShowFullOverview(!showFullOverview)}
            style={{ color: 'gray', fontWeight: '600' }}
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
                Alert.alert('Removed', 'Movie removed from watchlist');
              } else {
                const updatedList = [...list, movie];
                await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
                setIsInWatchlist(true);
                Alert.alert('Added', 'Movie added to watchlist');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update watchlist');
            }
          }}
          style={{ marginBottom: 12 }}
        >
          {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </Button>
      </View>
    </ScrollView>
  );
};

export default DetailPage;
