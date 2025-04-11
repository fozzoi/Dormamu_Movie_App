import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  StyleSheet,
  Text,
} from 'react-native';
import { Card, ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageUrl } from '../src/tmdb';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3;

const WatchListPage = () => {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
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

  const clearSelected = async () => {
    const newList = watchlist.filter((item) => !selected.has(item.id));
    setWatchlist(newList);
    setSelected(new Set());
    await AsyncStorage.setItem('watchlist', JSON.stringify(newList));
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadWatchlist);
    return unsubscribe;
  }, [navigation]);

  const handleLongPress = (id: number) => {
    const updated = new Set(selected);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelected(updated);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Detail', { movie: item })}
        onLongPress={() => handleLongPress(item.id)}
        style={[styles.cardWrapper, isSelected && styles.selectedCard]}
      >
        <Card style={styles.card}>
          <Card.Cover
            source={{
              uri: item.poster_path
                ? getImageUrl(item.poster_path)
                : 'https://via.placeholder.com/500x750?text=No+Image',
            }}
            style={styles.cardImage}
          />
          <Card.Title 
            title={item.title || item.name}
            subtitle={`Rating: ${item.vote_average}`}
            titleNumberOfLines={2}
            subtitleNumberOfLines={1}
            titleStyle={{ color: 'gray', fontSize: 14 }}
            subtitleStyle={{ color: 'gray',fontSize: 12 }}
          />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Watchlist</Text>

      {selected.size > 0 && (
        <Button
          mode="contained"
          onPress={clearSelected}
          style={styles.clearButton}
          buttonColor="#d9534f"
        >
          Clear Selected
        </Button>
      )}

      {loading ? (
        <ActivityIndicator animating={true} size="large" />
      ) : watchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nothing to watch</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  header: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  clearButton: {
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  cardWrapper: {
    margin: 4,
    width: CARD_WIDTH,
  },
  selectedCard: {
    borderColor: '#f00',
    borderWidth: 2,
    borderRadius: 10,
  },
  card: {
    backgroundColor: '#111',
  },
  cardImage: {
    height: CARD_WIDTH * 1.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 20,
    fontStyle: 'italic',
  },
});

export default WatchListPage;

