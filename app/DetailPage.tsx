import React, { useEffect, useState, useMemo, useRef, useContext, useCallback } from 'react';
import { ScrollContext } from '../context/ScrollContext';
import {
  View,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
  Share,
} from 'react-native';
import { Text } from 'react-native-paper';
import { 
  getImageUrl, 
  getMovieGenres, 
  getSimilarMedia, 
  getSeasonEpisodes, 
  getMovieImages, 
  TMDBEpisode, 
  TMDBSeason,
  TMDBCastMember,
  TMDBImage, 
  getFullDetails,
  getMediaDetails // <--- ✅ MAKE SURE THIS IS IMPORTED FROM TMDB
} from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate,
  FadeInDown,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

const TOP_BAR_PADDING = (StatusBar.currentHeight || 40) + 10; 
const HEADER_HEIGHT = height * 0.6;
const IMAGE_SIZES = { THUMBNAIL: 'w154', POSTER_DETAIL: 'w780', STILL: 'w300', ORIGINAL: 'original' };

// --- COMPONENTS ---

const AnimatedFooter = () => {
  const { tabBarVisible, tabBarHeight } = useContext(ScrollContext);
  const animatedFooterStyle = useAnimatedStyle(() => ({
    height: withTiming(tabBarVisible ? tabBarHeight : 20, { duration: 300 }),
  }));
  return <Animated.View style={animatedFooterStyle} />;
};

const InfoChip = ({ label, value, icon }: { label: string, value: string, icon: any }) => (
  <View style={styles.infoChipContainer}>
    <Text style={styles.infoLabel}>{label}</Text>
    <View style={styles.infoValueRow}>
      <Feather name={icon} size={12} color="#E50914" style={{marginRight: 4}} />
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const DetailPage = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { movie: initialMovie } = route.params as { movie: any };

  const [movie, setMovie] = useState(initialMovie);
  const [movieImages, setMovieImages] = useState<TMDBImage[]>([]);
  
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [genres, setGenres] = useState<{id: number, name: string}[]>([]);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const mainGalleryRef = useRef<FlatList>(null);
  const thumbnailGalleryRef = useRef<FlatList>(null);

  const scrollY = useSharedValue(0);
  const { setTabBarVisible } = useContext(ScrollContext);

  useEffect(() => {
    loadDeepDetails();
  }, [initialMovie.id]);

  const loadDeepDetails = async () => {
    try {
      checkIfInWatchlist();

      // ✅ FIX 2: Use getMediaDetails instead of getFullDetails
      // This fetches "Status", "Budget", "Revenue" which are missing in the initial list data
      const [fullDetails, imagesData, genresData, similarData] = await Promise.all([
        getMediaDetails(initialMovie.id, initialMovie.media_type), 
        getMovieImages(initialMovie.id, initialMovie.media_type),
        getMovieGenres(initialMovie.id, initialMovie.media_type),
        getSimilarMedia(initialMovie.id, initialMovie.media_type)
      ]);

      setMovie(fullDetails); 
      setMovieImages(imagesData);
      setGenres(genresData);
      setSimilarMovies(similarData);

      if (initialMovie.media_type === 'tv' && fullDetails.seasons?.length > 0) {
        // Filter out "Specials" (Season 0) usually
        const validSeasons = fullDetails.seasons.filter((s: any) => s.season_number > 0);
        const seasonNum = validSeasons.length > 0 ? validSeasons[0].season_number : fullDetails.seasons[0].season_number;
        
        setSelectedSeason(seasonNum);
        fetchEpisodes(seasonNum);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEpisodes = async (seasonNumber: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await getSeasonEpisodes(movie.id, seasonNumber);
      setEpisodes(data);
    } catch (e) { console.error(e); } 
    finally { setLoadingEpisodes(false); }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${movie.title || movie.name} on Dormamu!`,
      });
    } catch (error) {}
  };

  const checkIfInWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      setIsInWatchlist(list.some((item: any) => item.id === movie.id));
    } catch (e) {}
  };

  const toggleWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      const list = stored ? JSON.parse(stored) : [];
      const exists = list.some((item: any) => item.id === movie.id);
      
      const newList = exists 
        ? list.filter((item: any) => item.id !== movie.id)
        : [...list, movie];
        
      await AsyncStorage.setItem('watchlist', JSON.stringify(newList));
      setIsInWatchlist(!exists);
    } catch (e) {}
  };

  const openTelegramSearch = () => {
    const title = movie.title || movie.name;
    const date = movie.release_date || movie.first_air_date;
    const year = date ? date.substring(0, 4) : '';
    const message = encodeURIComponent(`${title} ${year}`);
    const telegramLink = `tg://msg?text=${message}`;
    Linking.openURL(telegramLink).catch(err => {
      const webLink = `https://t.me/share/url?text=${message}`;
      Linking.openURL(webLink);
    });
  };
  
  const openTorrentSearch = () => {
    const query = `${movie.title || movie.name} ${(movie.release_date || movie.first_air_date)?.slice(0, 4) || ''}`;
    navigation.navigate('Search', {
      screen: 'SearchMain',
      params: { prefillQuery: query }
    });
  };

  // --- ANIMATIONS ---
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (event.contentOffset.y > 50 && event.velocity && event.velocity.y > 0) {
       runOnJS(setTabBarVisible)(false);
    } else if (event.velocity && event.velocity.y < 0) {
       runOnJS(setTabBarVisible)(true);
    }
  });

  const heroStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.5], [1, 0], Extrapolate.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return value >= 1000000 
      ? `$${(value / 1000000).toFixed(1)}M` 
      : `$${value.toLocaleString()}`;
  };

  const renderGalleryModal = () => {
    const imagesToRender = movieImages.length > 0 
      ? movieImages 
      : [{ file_path: movie.poster_path, aspect_ratio: 0.67, height: 0, width: 0 }];

    return (
      <Modal
        visible={galleryVisible}
        transparent={true}
        onRequestClose={() => setGalleryVisible(false)}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalBackground}>
          <StatusBar hidden={true} /> 
          
          <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalIconBtn} onPress={() => setGalleryVisible(false)}>
                  <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.galleryCounter}>
                  {currentImageIndex + 1} / {imagesToRender.length}
              </Text>
              <TouchableOpacity style={styles.modalIconBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
          </View>

          <FlatList
            ref={mainGalleryRef}
            data={imagesToRender}
            horizontal
            pagingEnabled
            initialScrollIndex={currentImageIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `gal-${index}`}
            onMomentumScrollEnd={(ev) => {
                const newIndex = Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(newIndex);
                thumbnailGalleryRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0.5 });
            }}
            renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                    source={{ uri: getImageUrl(item.file_path, 'original') }}
                    style={{ width: SCREEN_WIDTH, height: '100%' }}
                    resizeMode="contain"
                />
                </View>
            )}
          />

          {imagesToRender.length > 1 && (
            <View style={styles.thumbnailStripContainer}>
                <FlatList
                    ref={thumbnailGalleryRef}
                    data={imagesToRender}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, index) => `thumb-${index}`}
                    contentContainerStyle={{paddingHorizontal: 20}}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity 
                            onPress={() => {
                                setCurrentImageIndex(index);
                                mainGalleryRef.current?.scrollToIndex({ index, animated: true });
                            }}
                            style={[
                                styles.thumbnailWrapper,
                                currentImageIndex === index && styles.thumbnailActive
                            ]}
                        >
                            <Image
                                source={{ uri: getImageUrl(item.file_path, 'w154') }}
                                style={styles.thumbnailImage}
                            />
                        </TouchableOpacity>
                    )}
                />
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.baseContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* --- HERO HEADER --- */}
      <View style={styles.fixedHeader}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
         </TouchableOpacity>
         <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity onPress={handleShare} style={styles.roundBtn}>
                <Ionicons name="share-social-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleWatchlist} style={styles.roundBtn}>
                <MaterialIcons 
                  name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={isInWatchlist ? "#E50914" : "#FFF"} 
                />
            </TouchableOpacity>
         </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 20}}
      >
        {/* Parallax Image */}
        <TouchableOpacity 
            activeOpacity={0.95} 
            onPress={() => setGalleryVisible(true)}
            style={{ height: HEADER_HEIGHT }}
        >
            <Animated.Image
                source={{ uri: getImageUrl(movie.poster_path, IMAGE_SIZES.POSTER_DETAIL) }}
                style={[StyleSheet.absoluteFill, heroStyle]}
                resizeMode="cover"
            />
            <LinearGradient
                colors={['transparent', 'rgba(20,20,20,0.2)', '#141414']}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Title Overlay */}
            <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{movie.title || movie.name}</Text>
                
                {/* Meta Chips */}
                <View style={styles.metaRow}>
                    <BlurView intensity={30} tint="dark" style={styles.metaChip}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.metaText}>{movie.vote_average.toFixed(1)}</Text>
                    </BlurView>
                    <BlurView intensity={30} tint="dark" style={styles.metaChip}>
                        <Text style={styles.metaText}>
                            {(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'}
                        </Text>
                    </BlurView>
                    {movie.runtime && (
                        <BlurView intensity={30} tint="dark" style={styles.metaChip}>
                            <Text style={styles.metaText}>{Math.floor(movie.runtime/60)}h {movie.runtime%60}m</Text>
                        </BlurView>
                    )}
                </View>
                
                {/* Tagline */}
                {movie.tagline && <Text style={styles.tagline}>"{movie.tagline}"</Text>}
                
                {/* HERO ACTION ROW (Download & Telegram) */}
                <View style={styles.heroActionRow}>
                    <TouchableOpacity onPress={openTelegramSearch}>
                      <BlurView style={styles.heroIcon} intensity={30} tint="dark">
                        <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openTorrentSearch}>
                      <BlurView style={styles.heroIcon} intensity={30} tint="dark">
                        <Feather name="download" size={20} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>

        {/* --- MAIN CONTENT --- */}
        <View style={styles.contentContainer}>
            
            {/* 1. New Info Grid */}
            <View style={styles.infoGrid}>
                <InfoChip label="Status" value={movie.status || 'N/A'} icon="activity" />
                <InfoChip label="Language" value={(movie.original_language || 'en').toUpperCase()} icon="globe" />
                {movie.budget > 0 && <InfoChip label="Budget" value={formatCurrency(movie.budget)} icon="dollar-sign" />}
                {movie.revenue > 0 && <InfoChip label="Revenue" value={formatCurrency(movie.revenue)} icon="trending-up" />}
            </View>

            {/* 2. Overview */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overviewText}>
                    {showFullOverview || (movie.overview?.length || 0) <= 150
                    ? movie.overview 
                    : `${movie.overview?.slice(0, 150)}...`}
                </Text>
                {(movie.overview?.length || 0) > 150 && (
                    <TouchableOpacity onPress={() => setShowFullOverview(!showFullOverview)}>
                        <Text style={styles.readMore}>{showFullOverview ? 'Read Less' : 'Read More'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 3. Genres - ✅ FIX 3: Updated onPress to pass correct type format */}
            <View style={styles.section}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                    {genres.map(g => (
                        <TouchableOpacity key={g.id} style={styles.genreTag} onPress={() => navigation.navigate('ViewAll', { 
                            title: `${g.name} ${movie.media_type === 'movie' ? 'Movies' : 'Shows'}`,
                            genreId: g.id,
                            type: `genre/${g.id}`, // <--- ✅ KEY FIX
                            data: []
                        })}>
                            <Text style={styles.genreText}>{g.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 4. Cast */}
            {movie.cast && movie.cast.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Cast</Text>
                    <FlatList
                        horizontal
                        data={movie.cast.slice(0, 10)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{paddingRight: 16}}
                        renderItem={({ item, index }) => (
                            <Animated.View 
                                entering={FadeInDown.delay(index * 50)}
                                style={styles.castCard}
                            >
                                <TouchableOpacity onPress={() => navigation.push('CastDetails', { personId: item.id })}>
                                    <Image 
                                        source={{ uri: item.profile_path ? getImageUrl(item.profile_path, IMAGE_SIZES.THUMBNAIL) : 'https://via.placeholder.com/150' }} 
                                        style={styles.castImage}
                                    />
                                    <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.castRole} numberOfLines={1}>{item.character}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    />
                </View>
            )}

            {/* 5. Seasons (TV Only) - ✅ FIX 1: Removed .slice(0, 5) */}
            {movie.media_type === 'tv' && movie.seasons && (
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Seasons</Text>
                        <Text style={styles.seasonCount}>{movie.number_of_seasons} Seasons</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingBottom: 10}}>
                        {movie.seasons.filter((s:any) => s.season_number > 0).map((s: any) => (
                            <TouchableOpacity 
                                key={s.id} 
                                style={[styles.seasonChip, selectedSeason === s.season_number && styles.seasonChipActive]}
                                onPress={() => { setSelectedSeason(s.season_number); fetchEpisodes(s.season_number); }}
                            >
                                <Text style={[styles.seasonText, selectedSeason === s.season_number && styles.seasonTextActive]}>
                                    {s.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    
                    {/* Episodes List - NOW SHOWS ALL EPISODES */}
                    {loadingEpisodes ? <ActivityIndicator color="#E50914" /> : (
                        <View style={{gap: 10}}>
                            {episodes.map(ep => (
                                <View key={ep.id} style={styles.episodeRow}>
                                    <Image 
                                        source={{ uri: ep.still_path ? getImageUrl(ep.still_path, IMAGE_SIZES.STILL) : 'https://via.placeholder.com/100' }} 
                                        style={styles.episodeThumb} 
                                    />
                                    <View style={{flex: 1, justifyContent: 'center'}}>
                                        <Text style={styles.epTitle}>{ep.episode_number}. {ep.name}</Text>
                                        <Text style={styles.epOverview} numberOfLines={2}>{ep.overview}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* 6. Similar */}
            {similarMovies.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>You might also like</Text>
                    <FlatList
                        horizontal
                        data={similarMovies}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.similarCard}
                                onPress={() => navigation.push('Detail', { movie: item })}
                            >
                                <Image source={{ uri: getImageUrl(item.poster_path, IMAGE_SIZES.THUMBNAIL) }} style={styles.similarImage} />
                                <View style={styles.ratingBadge}>
                                    <Ionicons name="star" size={10} color="#FFD700" />
                                    <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                                </View>
                                <Text style={styles.similarTitle} numberOfLines={1}>{item.title || item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

        </View>
        <AnimatedFooter />
      </Animated.ScrollView>

      {renderGalleryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
    backgroundColor: '#141414',
  },
  fixedHeader: {
      position: 'absolute',
      top: TOP_BAR_PADDING,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      zIndex: 100,
  },
  roundBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  heroContent: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
  },
  heroTitle: {
      fontFamily: 'GoogleSansFlex-Bold',
      fontSize: 32,
      color: 'white',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 4,
      marginBottom: 8,
  },
  tagline: {
      fontFamily: 'GoogleSansFlex-Medium',
      fontSize: 14,
      color: '#ddd',
      fontStyle: 'italic',
      marginTop: 8,
  },
  metaRow: {
      flexDirection: 'row',
      gap: 8,
  },
  metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      overflow: 'hidden',
      gap: 4,
  },
  metaText: {
      color: 'white',
      fontSize: 12,
      fontFamily: 'GoogleSansFlex-Bold',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentContainer: {
      padding: 16,
  },
  infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: '#1F1F1F',
      borderRadius: 12,
      padding: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#333',
  },
  infoChipContainer: {
      width: '50%',
      marginBottom: 12,
  },
  infoLabel: {
      color: '#888',
      fontSize: 11,
      fontFamily: 'GoogleSansFlex-Regular',
      marginBottom: 2,
  },
  infoValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  infoValue: {
      color: '#fff',
      fontSize: 13,
      fontFamily: 'GoogleSansFlex-Medium',
  },
  section: {
      marginBottom: 24,
  },
  sectionTitle: {
      fontSize: 18,
      color: 'white',
      fontFamily: 'GoogleSansFlex-Bold',
      marginBottom: 12,
  },
  overviewText: {
      color: '#ccc',
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'GoogleSansFlex-Regular',
  },
  readMore: {
      color: '#E50914',
      fontWeight: 'bold',
      marginTop: 4,
  },
  genreTag: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#2A2A2A',
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#444',
  },
  genreText: {
      color: '#fff',
      fontSize: 13,
      fontFamily: 'GoogleSansFlex-Medium',
  },
  // Cast Cards
  castCard: {
      width: 100,
      marginRight: 12,
  },
  castImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#333',
  },
  castName: {
      color: 'white',
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'GoogleSansFlex-Medium',
  },
  castRole: {
      color: '#888',
      fontSize: 10,
      textAlign: 'center',
  },
  // Similar Cards
  similarCard: {
      width: 120,
      marginRight: 12,
  },
  similarImage: {
      width: 120,
      height: 180,
      borderRadius: 8,
      backgroundColor: '#222',
      marginBottom: 6,
  },
  ratingBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
  },
  ratingText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  similarTitle: {
      color: '#ccc',
      fontSize: 12,
      fontFamily: 'GoogleSansFlex-Medium',
  },
  // Seasons
  rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  seasonCount: {
      color: '#666',
      fontSize: 12,
  },
  seasonChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#222',
  },
  seasonChipActive: {
      backgroundColor: '#E50914',
  },
  seasonText: {
      color: '#888',
      fontSize: 13,
  },
  seasonTextActive: {
      color: '#fff',
      fontWeight: 'bold',
  },
  episodeRow: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: 'rgba(255,255,255,0.05)',
      padding: 8,
      borderRadius: 8,
  },
  episodeThumb: {
      width: 100,
      height: 56,
      borderRadius: 4,
      backgroundColor: '#333',
  },
  epTitle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 2,
  },
  epOverview: {
      color: '#888',
      fontSize: 11,
  },
  // Modal (Same as CastDetails)
  modalBackground: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 100,
  },
  galleryCounter: {
      color: 'white',
      fontFamily: 'GoogleSansFlex-Medium',
      fontSize: 16,
  },
  modalIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  thumbnailStripContainer: {
      position: 'absolute',
      bottom: 40,
      height: 80,
      width: '100%',
  },
  thumbnailWrapper: {
      marginRight: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 6,
      overflow: 'hidden',
  },
  thumbnailActive: {
      borderColor: '#E50914',
  },
  thumbnailImage: {
      width: 50,
      height: 75,
      backgroundColor: '#222',
  },
});

export default DetailPage;