import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  ImageBackground,
  Alert,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { getImageUrl } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const DetailPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { movie } = route.params as { movie: any };

  const [isInWatchlist, setIsInWatchlist] = useState(false);

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

  const addToWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      const exists = list.some((item: any) => item.id === movie.id);

      if (!exists) {
        const updatedList = [...list, movie];
        await AsyncStorage.setItem('watchlist', JSON.stringify(updatedList));
        setIsInWatchlist(true);
        Alert.alert('Added', 'Movie added to watchlist');
      } else {
        Alert.alert('Already Exists', 'This movie is already in your watchlist');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to watchlist');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageBackground
        source={{ uri: getImageUrl(movie.poster_path, 'original') }}
        style={{ width: '100%', height: width * 1.5 }}
        blurRadius={5}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
            {movie.title || movie.name}
          </Text>
          <Text style={{ fontSize: 16, color: '#fff', marginTop: 4 }}>
            Rating: {movie.vote_average}
          </Text>
        </View>
      </ImageBackground>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>
          {movie.overview}
        </Text>

        <Button
          mode="contained"
          onPress={addToWatchlist}
          style={{ marginBottom: 12 }}
          disabled={isInWatchlist}
        >
          {isInWatchlist ? 'Already in Watchlist' : 'Add to Watchlist'}
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} textColor="#fff">
          Go Back
        </Button>
      </View>
    </ScrollView>
  );
};

export default DetailPage;
