// WatchListPage.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageUrl } from '../src/tmdb'; // if using the same helper for poster images
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

const WatchListPage = () => {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const loadWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadWatchlist);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Detail', { movie: item })}
      style={{ width: CARD_WIDTH, margin: 8 }}
    >
      <Card>
        <Card.Cover
          source={{ uri: item.poster_path ? getImageUrl(item.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image' }}
          style={{ height: CARD_WIDTH * 1.5 }}
        />
        <Card.Title title={item.title || item.name} subtitle={`Rating: ${item.vote_average}`} />
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#000' }}>
      {loading ? (
        <ActivityIndicator animating={true} size="large" />
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
};

export default WatchListPage;
