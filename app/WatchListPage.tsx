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
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.30; // Slightly smaller for better Netflix look
const FEATURED_HEIGHT = height * 0.65; // Height for featured content


const WatchListPage = () => {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
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
    setIsEditMode(false);
    await AsyncStorage.setItem('watchlist', JSON.stringify(newList));
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadWatchlist);
    return unsubscribe;
  }, [navigation]);

  const toggleSelect = (id: number) => {
    const updated = new Set(selected);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelected(updated);
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      setSelected(new Set());
    }
    setIsEditMode(!isEditMode);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => isEditMode ? toggleSelect(item.id) : navigation.navigate('Detail', { movie: item })}
        style={styles.cardWrapper}
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
          
          {isEditMode && (
            <View style={[styles.checkboxOverlay, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <MaterialIcons name="check-circle" size={32} color="#E50914" />
              )}
            </View>
          )}
          
          <View style={styles.cardGradient} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title || item.name}
            </Text>
            <Text style={styles.cardRating}>
              {item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : 'No rating'}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My List</Text>
        {watchlist.length > 0 && (
          <TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
            <Text style={styles.editButtonText}>
              {isEditMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isEditMode && selected.size > 0 && (
        <Button
          mode="contained"
          onPress={clearSelected}
          style={styles.clearButton}
          buttonColor="#E50914"
          labelStyle={styles.clearButtonLabel}
        >
          Remove ({selected.size})
        </Button>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" color="#E50914" />
        </View>
      ) : watchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="movie-filter" size={80} color="#555" />
          <Text style={styles.emptyText}>Your list is empty</Text>
          <Text style={styles.emptySubtext}>
            Add movies and TV shows to your list to watch later
          </Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#141414', // Netflix dark background
    paddingTop: 40,
    paddingHorizontal: 16,

  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    marginTop: 20,
  },
  header: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    color: '#E50914', // Netflix red
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  clearButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 16,
  },
  cardWrapper: {
    margin: 5,
    marginBottom: 10,
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    height: CARD_WIDTH * 1.5, // Maintain aspect ratio
  },
  cardImage: {
    height: CARD_WIDTH * 1.5,
    borderRadius: 0,
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  checkboxSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardRating: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default WatchListPage;