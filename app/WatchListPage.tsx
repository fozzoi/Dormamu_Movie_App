// WatchListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  StyleSheet,
  Text,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageUrl } from '../src/tmdb';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Reanimated for smooth tab pill
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  FadeInDown,
  Layout
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
// Standardize Card Width to match CastDetails (3 columns)
const CARD_WIDTH = (width - 32) / 3; 
const TAB_WIDTH = width - 40;
const TAB_ITEM_WIDTH = (TAB_WIDTH - 4) / 2;

const WatchListPage = () => {
  // Tabs: 0 = Movies, 1 = Artists
  const [activeTab, setActiveTab] = useState(0); 
  
  const [watchlist, setWatchlist] = useState<any[]>([]); 
  const [artists, setArtists] = useState<any[]>([]);   
  
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Animation Values
  const tabPosition = useSharedValue(0);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const storedMovies = await AsyncStorage.getItem('watchlist');
      const storedArtists = await AsyncStorage.getItem('favoriteArtists');
      
      if (storedMovies) setWatchlist(JSON.parse(storedMovies));
      if (storedArtists) setArtists(JSON.parse(storedArtists));
    } catch (error) {
      console.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  // Handle Tab Change with Animation
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    tabPosition.value = withSpring(index * TAB_ITEM_WIDTH, {
        damping: 15,
        stiffness: 120
    });
  };

  const animatedTabStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabPosition.value }],
    };
  });

  // --- UNSAVE LOGIC ---
  const handleUnsave = async (id: number, type: 'movie' | 'artist') => {
    if (type === 'movie') {
        const newList = watchlist.filter(item => item.id !== id);
        setWatchlist(newList);
        await AsyncStorage.setItem('watchlist', JSON.stringify(newList));
    } else {
        const newList = artists.filter(item => item.id !== id);
        setArtists(newList);
        await AsyncStorage.setItem('favoriteArtists', JSON.stringify(newList));
    }
  };

  // --- RENDER ITEM (Standardized) ---
  const renderCard = ({ item, index }: { item: any, index: number }) => {
    const isMovie = activeTab === 0;
    const imageUrl = isMovie 
        ? getImageUrl(item.poster_path, 'w342') 
        : getImageUrl(item.profile_path, 'w342');
    
    const title = isMovie ? (item.title || item.name) : item.name;
    const subtitle = isMovie 
        ? (item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '') 
        : (item.known_for_department || 'Artist');

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 50).springify()}
        layout={Layout.springify()} // Smooth layout shift when deleting
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
             if (isMovie) navigation.navigate('Detail', { movie: item });
             else navigation.navigate('CastDetails', { personId: item.id });
          }}
          style={styles.cardContainer}
        >
            {/* Image */}
            <Image
                source={{ uri: imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
            />

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.cardGradient}
            />

            {/* Text Content */}
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
            </View>

            {/* UNSAVE BUTTON (Top Right) */}
            <TouchableOpacity 
                style={styles.unsaveButton}
                onPress={() => handleUnsave(item.id, isMovie ? 'movie' : 'artist')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <BlurView 
                    intensity={40} 
                    tint="dark" 
                    style={styles.unsaveBlur}
                >
                    <Ionicons name="close" size={16} color="#FFF" />
                </BlurView>
            </TouchableOpacity>

        </TouchableOpacity>
      </Animated.View>
    );
  };

  const currentList = activeTab === 0 ? watchlist : artists;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Library</Text>
      </View>

      {/* --- GLASSMORPHIC TAB SWITCHER --- */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
            {/* Background Blur */}
            <View style={styles.blurContainer}>
                <BlurView 
                    intensity={Platform.OS === 'android' ? 20 : 50}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={StyleSheet.absoluteFill}
                />
                {/* Fallback dark bg for safe blur visibility */}
                <View style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,30,30,0.4)'}} />
            </View>

            {/* Animated Pill */}
            <Animated.View style={[styles.activePill, animatedTabStyle]} />
            
            {/* Buttons */}
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange(0)}>
                <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>Movies</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange(1)}>
                <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>Artists</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* --- CONTENT --- */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" color="#E50914" />
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          {activeTab === 0 ? (
             <MaterialIcons name="movie-filter" size={60} color="#333" />
          ) : (
             <Ionicons name="people" size={60} color="#333" />
          )}
          <Text style={styles.emptyText}>
             {activeTab === 0 ? "Watchlist Empty" : "No Favorites"}
          </Text>
          <Text style={styles.emptySubtext}>
             {activeTab === 0 
                ? "Movies you save will appear here." 
                : "Artists you love will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          key={activeTab === 0 ? 'movies' : 'artists'} 
          data={currentList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 10 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
      flex: 1, 
      backgroundColor: '#141414', 
      paddingTop: 40,
  },
  headerContainer: { 
      paddingHorizontal: 20, 
      marginTop: 10,
      marginBottom: 15,
  },
  header: { 
      color: '#fff', 
      fontSize: 28, 
      fontFamily: 'GoogleSansFlex-Bold',
  },
  
  // --- TABS ---
  tabWrapper: {
      alignItems: 'center',
      marginBottom: 20,
  },
  tabContainer: {
      flexDirection: 'row',
      width: TAB_WIDTH,
      height: 44,
      borderRadius: 22,
      position: 'relative',
      // The parent clip fix for Android Blur
      overflow: 'hidden', 
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
  },
  blurContainer: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 22,
      overflow: 'hidden',
  },
  activePill: {
      position: 'absolute',
      width: TAB_ITEM_WIDTH,
      top: 2,
      bottom: 2,
      left: 2,
      backgroundColor: '#E50914', // Netflix Red
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
  },
  tabButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
  },
  tabText: {
      color: '#CCC',
      fontFamily: 'GoogleSansFlex-Medium',
      fontSize: 14,
  },
  activeTabText: {
      color: '#FFF',
      fontFamily: 'GoogleSansFlex-Bold',
  },

  // --- CARDS ---
  listContent: { 
      paddingHorizontal: 16, 
      paddingBottom: 100 
  },
  cardWrapper: { 
      width: CARD_WIDTH,
      marginBottom: 16,
  },
  cardContainer: {
      borderRadius: 12,
      backgroundColor: '#1F1F1F',
      overflow: 'hidden',
      height: CARD_WIDTH * 1.5,
      position: 'relative',
  },
  cardImage: { 
      width: '100%', 
      height: '100%',
      backgroundColor: '#2A2A2A',
  },
  cardGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '50%',
      zIndex: 1,
  },
  cardContent: { 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      padding: 8,
      zIndex: 2,
  },
  cardTitle: { 
      color: '#E5E5E5', 
      fontSize: 12, 
      fontFamily: 'GoogleSansFlex-Bold', 
      marginBottom: 2,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
  },
  cardSubtitle: { 
      color: '#CCC', 
      fontSize: 10, 
      fontFamily: 'GoogleSansFlex-Regular',
  },

  // --- UNSAVE BUTTON ---
  unsaveButton: {
      position: 'absolute',
      top: 6,
      right: 6,
      zIndex: 10,
      borderRadius: 15,
      overflow: 'hidden',
  },
  unsaveBlur: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)', // Fallback
  },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
  emptyText: { color: '#fff', fontSize: 20, fontFamily: 'GoogleSansFlex-Bold', marginTop: 20, marginBottom: 8 },
  emptySubtext: { color: '#aaa', fontSize: 14, fontFamily: 'GoogleSansFlex-Regular', textAlign: 'center' },
});

export default WatchListPage;