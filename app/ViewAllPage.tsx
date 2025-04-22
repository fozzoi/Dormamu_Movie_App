import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl, getFullDetails, fetchMoreContentByType, TMDBResult } from '../src/tmdb';

const { width } = Dimensions.get('window');

const GRID_COLUMNS = 3; 
const ITEM_WIDTH = (width - 48) / GRID_COLUMNS;

const ViewAllPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { title, data, type, genreId } = route.params;
  
  // State for pagination
  const [allItems, setAllItems] = useState<TMDBResult[]>(data || []);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [contentType, setContentType] = useState('');

  // Get content type from title for API calls
  const getContentType = useCallback(() => {
    if (type === 'genre' && genreId) {
      return `genre/${genreId}`;
    }
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('search:')) return title; // Keep full search query
    if (lowerTitle.includes('tv')) return 'tv';
    if (lowerTitle.includes('movie') || lowerTitle.includes('trending')) return 'trending';
    if (lowerTitle.includes('top')) return 'top';
    if (lowerTitle.includes('indian')) return 'regional';
    return 'trending'; // Default fallback
  }, [title, type, genreId]);

  // Set content type on initial load
  useEffect(() => {
    setContentType(getContentType());
  }, [getContentType]);

  // Load more content when reaching end of list
  const loadMoreData = useCallback(async () => {
    if (isLoading || !hasMoreData) return;
    
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const moreData = await fetchMoreContentByType(contentType, nextPage);
      
      if (moreData && moreData.length > 0) {
        // Filter out duplicates by ID
        const uniqueNewItems = moreData.filter(
          newItem => !allItems.some(existingItem => existingItem.id === newItem.id)
        );
        
        if (uniqueNewItems.length > 0) {
          setAllItems(prev => [...prev, ...uniqueNewItems]);
          setPage(nextPage);
        } else {
          setHasMoreData(false);
        }
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error("Error fetching more content:", error);
      setHasMoreData(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMoreData, allItems, contentType]);

  const renderGridItem = ({ item, index }) => {
    if (!item.poster_path) return null;
    
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={async () => {
          try {
            const fullDetails = await getFullDetails(item);
            navigation.navigate('Detail', { movie: fullDetails });
          } catch (error) {
            console.error("Error fetching details:", error);
            navigation.navigate('Detail', { movie: item });
          }
        }}
      >
        <Image
          source={{ uri: getImageUrl(item.poster_path, 'w342') }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        <Text style={styles.gridItemTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <Text style={styles.gridItemYear}>
          {(item.release_date || item.first_air_date || '').substring(0, 4)}
        </Text>
        {item.vote_average > 0 && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{item.vote_average.toFixed(1)} ★</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#E50914" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  // Empty list component
  const renderEmptyList = () => {
    if (isLoading && page === 1) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.emptyText}>Loading content...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No content available</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Content Grid */}
      <FlatList
        data={allItems}
        renderItem={renderGridItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyList}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50, // Account for status bar
    paddingBottom: 16,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32, // Placeholder for centering title
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 32,
    minHeight: '100%',
  },
  gridItem: {
    width: ITEM_WIDTH,
    marginBottom: 24,
    marginHorizontal: 4,
    position: 'relative',
  },
  gridImage: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    borderRadius: 4,
    marginBottom: 4,
  },
  gridItemTitle: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  gridItemYear: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 2,
  },
  ratingContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loaderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#AAAAAA',
    marginLeft: 8,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 16,
  },
});

export default ViewAllPage;