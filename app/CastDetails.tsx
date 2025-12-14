// CastDetails.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Share,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
// Add AsyncStorage import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur'; 
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  FadeInDown,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

// Import TMDB functions (Keep your existing imports)
import { 
  getPersonDetails, 
  getPersonCombinedCredits, 
  getPersonImages,
  getImageUrl, 
  TMDBPerson, 
  TMDBResult,
  TMDBImage,
  getFullDetails
} from '../src/tmdb';

const { width, height } = Dimensions.get('window');
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

const HEADER_HEIGHT = height * 0.55;
const TOP_BAR_PADDING = (StatusBar.currentHeight || 40) + 10; 
const COLLAPSED_HEADER_HEIGHT = TOP_BAR_PADDING + 50;
const CARD_WIDTH = (width - 48) / 3;

export default function CastDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { personId } = route.params as { personId: number };

  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [credits, setCredits] = useState<TMDBResult[]>([]);
  const [personImages, setPersonImages] = useState<TMDBImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  
  // Favorites State
  const [isLiked, setIsLiked] = useState(false);
  const likedScale = useSharedValue(1);

  // Gallery State
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const headerListRef = useRef<FlatList>(null);
  const mainGalleryRef = useRef<FlatList>(null);
  const thumbnailGalleryRef = useRef<FlatList>(null);

  const scrollY = useSharedValue(0);

  useEffect(() => {
    loadData();
    checkIfLiked(); // Check storage on mount
  }, [personId]);

  // --- NEW: Check if artist is in favorites ---
  const checkIfLiked = async () => {
    try {
      const stored = await AsyncStorage.getItem('favoriteArtists');
      if (stored) {
        const artists = JSON.parse(stored);
        const exists = artists.some((a: any) => a.id === personId);
        setIsLiked(exists);
      }
    } catch (e) {
      console.log('Error checking favorites', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [personData, creditsData, imagesData] = await Promise.all([
        getPersonDetails(personId),
        getPersonCombinedCredits(personId),
        getPersonImages(personId),
      ]);
      
      setPerson(personData);
      setPersonImages(imagesData);
      
      const uniqueCredits = creditsData
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

      setCredits(uniqueCredits);
    } catch (error) {
      console.error('Error loading person details:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Handle Love Press with Storage Logic ---
  const handleLovePress = useCallback(async () => {
    if (!person) return;

    const newValue = !isLiked;
    setIsLiked(newValue); // Optimistic update
    
    // Animation
    likedScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    try {
      const stored = await AsyncStorage.getItem('favoriteArtists');
      let artists = stored ? JSON.parse(stored) : [];

      if (newValue) {
        // Add to favorites (save only essential data to save space)
        const artistToSave = {
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
          popularity: person.popularity
        };
        // Avoid duplicates
        if (!artists.some((a: any) => a.id === person.id)) {
            artists.push(artistToSave);
        }
      } else {
        // Remove from favorites
        artists = artists.filter((a: any) => a.id !== person.id);
      }

      await AsyncStorage.setItem('favoriteArtists', JSON.stringify(artists));
    } catch (e) {
      console.log('Error saving favorite', e);
      // Revert on error
      setIsLiked(!newValue);
    }

  }, [isLiked, person, likedScale]);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likedScale.value }],
  }));

  const handleGalleryShare = async () => {
    const currentImgPath = personImages[currentImageIndex]?.file_path || person?.profile_path;
    if (!currentImgPath) return;
    
    const imageUrl = getImageUrl(currentImgPath, 'original');
    try {
      await Share.share({
        message: `Check out ${person?.name}! Shared from Dormamu app. ${imageUrl}`,
        url: imageUrl,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    const heightAnim = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT],
      [HEADER_HEIGHT, COLLAPSED_HEADER_HEIGHT],
      Extrapolate.CLAMP
    );
    return { height: heightAnim };
  });

  const imageContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT - 50],
      [1, 0],
      Extrapolate.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.2, 1],
      Extrapolate.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const nameOverlayStyle = useAnimatedStyle(() => {
     const opacity = interpolate(
        scrollY.value,
        [0, HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT - 100],
        [1, 0],
        Extrapolate.CLAMP
      );
      const translateY = interpolate(
         scrollY.value,
         [0, HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT],
         [0, -50],
         Extrapolate.CLAMP
       );
      return { opacity, transform: [{translateY}] }
  });

  const CreditCard = ({ item, index }: { item: TMDBResult; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 30).springify()}
      style={styles.creditCard}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={async () => {
          try {
             const fullData = await getFullDetails(item);
             navigation.push('Detail', { movie: fullData });
          } catch(e) { console.error(e) }
        }}
      >
        <View style={styles.cardImageContainer}>
            <Image
            source={{ uri: getImageUrl(item.poster_path, 'w342') }}
            style={styles.creditImage}
            />
            <View style={styles.cardOverlay}>
                <View style={styles.ratingBadgeSmall}>
                <Ionicons name="star" size={10} color="#FFD700" />
                <Text style={styles.ratingTextSmall}>
                    {(item.vote_average || 0).toFixed(1)}
                </Text>
                </View>
            </View>
        </View>
        
        <Text style={styles.creditTitle} numberOfLines={2}>{item.title || item.name}</Text>
        {item.character && (
          <Text style={styles.creditCharacter} numberOfLines={1}>as {item.character}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderGalleryModal = () => {
    const imagesToRender = personImages.length > 0 ? personImages : (person?.profile_path ? [{file_path: person.profile_path, aspect_ratio: 1, height: 0, width: 0}] : []);

    return (
        <Modal
          visible={galleryVisible}
          transparent={true} 
          onRequestClose={() => setGalleryVisible(false)}
          animationType="fade"
          statusBarTranslucent={true}
        >
          <View style={styles.modalContainer}>
            <StatusBar hidden={true} /> 
            
            <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalIconBtn} onPress={() => setGalleryVisible(false)}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                
                <Text style={styles.galleryCounter}>
                    {currentImageIndex + 1} / {imagesToRender.length}
                </Text>

                <TouchableOpacity style={styles.modalIconBtn} onPress={handleGalleryShare}>
                    <Ionicons name="share-outline" size={22} color="white" />
                </TouchableOpacity>
            </View>

            <View style={{flex: 1, justifyContent: 'center'}}>
                <FlatList
                ref={mainGalleryRef}
                data={imagesToRender}
                horizontal
                pagingEnabled
                initialScrollIndex={currentImageIndex}
                getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `modal-main-${index}`}
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
            </View>

            {imagesToRender.length > 1 && (
                <View style={styles.thumbnailStripContainer}>
                    <FlatList
                        ref={thumbnailGalleryRef}
                        data={imagesToRender}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => `modal-thumb-${index}`}
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
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#E50914" size="large" />
      </View>
    );
  }

  if (!person) return null;

  const headerImages = personImages.length > 0 ? personImages.slice(0, 8) : (person.profile_path ? [{file_path: person.profile_path}] : []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* --- HEADER --- */}
      <Animated.View style={[styles.headerContainer, headerStyle]}>
        
        <Animated.View style={[StyleSheet.absoluteFill, imageContainerStyle]}>
            <FlatList
                ref={headerListRef}
                data={headerImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `header-${index}`}
                renderItem={({ item, index }) => (
                    <TouchableOpacity 
                        activeOpacity={0.95} 
                        onPress={() => {
                            setCurrentImageIndex(index);
                            setGalleryVisible(true);
                        }}
                    >
                        <Image
                            source={{ uri: getImageUrl(item.file_path, 'h632') }}
                            style={{ width: width, height: '100%' }}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}
            />
            <LinearGradient
                colors={['transparent', 'rgba(20,20,20,0.3)', '#141414']}
                style={styles.headerGradient}
                pointerEvents="none"
            />
        </Animated.View>
       
        {/* Glassmorphic Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.blurBtnWrapper}
          >
            <BlurView intensity={50} tint="dark" style={styles.blurBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
            </BlurView>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleLovePress}
            style={styles.blurBtnWrapper}
          >
            <BlurView intensity={50} tint="dark" style={styles.blurBtn}>
                <Animated.View style={animatedHeartStyle}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={22} 
                        color={isLiked ? "#E50914" : "#FFF"} 
                    />
                </Animated.View>
            </BlurView>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.nameOverlay, nameOverlayStyle]}>
          <Text style={styles.personName}>{person.name}</Text>
          <View style={styles.deptBadge}>
             <Text style={styles.departmentText}>{person.known_for_department}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: HEADER_HEIGHT }} />

        <View style={styles.infoGrid}>
          {person.birthday && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Born</Text>
              <Text style={styles.infoValue}>
                {person.birthday.split('-')[0]}
              </Text>
            </View>
          )}
          {person.place_of_birth && (
            <View style={[styles.infoItem, { flex: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#333' }]}>
              <Text style={styles.infoLabel}>Birthplace</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {person.place_of_birth}
              </Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Popularity</Text>
            <Text style={[styles.infoValue, { color: '#E50914' }]}>
              {Math.round(person.popularity || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biography</Text>
          <Text 
            style={styles.biographyText}
            numberOfLines={isBioExpanded ? undefined : 4}
          >
            {person.biography || "No biography available for this person."}
          </Text>
          {person.biography && person.biography.length > 200 && (
            <TouchableOpacity 
              onPress={() => setIsBioExpanded(!isBioExpanded)}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>
                {isBioExpanded ? 'Read Less' : 'Read More'}
              </Text>
              <MaterialIcons 
                name={isBioExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={20} 
                color="#E50914" 
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Filmography</Text>
            <Text style={styles.countBadge}>{credits.length}</Text>
          </View>
          
          <FlashList
            data={credits}
            renderItem={({ item, index }) => <CreditCard item={item} index={index} />}
            estimatedItemSize={220}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.creditsList}
          />
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {renderGalleryModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141414' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414' },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, overflow: 'hidden', backgroundColor: '#141414' },
  headerGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' },
  topBar: { position: 'absolute', top: TOP_BAR_PADDING, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  blurBtnWrapper: { borderRadius: 20, overflow: 'hidden' },
  blurBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  nameOverlay: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  personName: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 36, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, lineHeight: 42 },
  deptBadge: { alignSelf: 'flex-start', backgroundColor: '#E50914', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 },
  departmentText: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 12, color: '#FFF', textTransform: 'uppercase' },
  scrollContent: { paddingBottom: 20 },
  infoGrid: { flexDirection: 'row', backgroundColor: '#1F1F1F', margin: 16, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  infoItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  infoLabel: { fontFamily: 'GoogleSansFlex-Regular', fontSize: 11, color: '#8C8C8C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 14, color: '#FFF', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  sectionTitle: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 20, color: '#FFF', marginBottom: 8 },
  countBadge: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 12, color: '#141414', backgroundColor: '#8C8C8C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', marginTop: -8 },
  biographyText: { fontFamily: 'GoogleSansFlex-Regular', fontSize: 15, color: '#CCC', lineHeight: 24 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  readMoreText: { fontFamily: 'GoogleSansFlex-Bold', fontSize: 14, color: '#E50914', marginRight: 4 },
  creditsList: { paddingTop: 0 },
  creditCard: { width: CARD_WIDTH, marginBottom: 16, marginRight: 10 },
  cardImageContainer: { position: 'relative' },
  creditImage: { width: '100%', height: CARD_WIDTH * 1.5, borderRadius: 8, backgroundColor: '#2A2A2A' },
  cardOverlay: { position: 'absolute', top: 8, right: 8 },
  ratingBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, gap: 3 },
  ratingTextSmall: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', fontFamily: 'GoogleSansFlex-Bold' },
  creditTitle: { fontFamily: 'GoogleSansFlex-Medium', fontSize: 12, color: '#E5E5E5', marginTop: 8 },
  creditCharacter: { fontFamily: 'GoogleSansFlex-Regular', fontSize: 11, color: '#8C8C8C', marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#000000', width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  modalHeader: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, zIndex: 100 },
  galleryCounter: { color: 'white', fontFamily: 'GoogleSansFlex-Medium', fontSize: 16 },
  modalIconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  thumbnailStripContainer: { position: 'absolute', bottom: 40, height: 80, width: '100%' },
  thumbnailWrapper: { marginRight: 10, borderWidth: 2, borderColor: 'transparent', borderRadius: 6, overflow: 'hidden' },
  thumbnailActive: { borderColor: '#E50914' },
  thumbnailImage: { width: 50, height: 75, backgroundColor: '#222' },
});