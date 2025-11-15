// app/CastDetails.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions,ActivityIndicator} from 'react-native';
import { getPersonDetails, getPersonCombinedCredits, getImageUrl, TMDBResult, TMDBPerson, getFullDetails } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
const CARD_WIDTH = width / 2.5;


const CastDetails = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { personId } = route.params as { personId: number };
  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [movies, setMovies] = useState<TMDBResult[]>([]);
  const [tvShows, setTVShows] = useState<TMDBResult[]>([]);
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [isLoading, setIsLoading] = useState(true);
  const [expandBio, setExpandBio] = useState(false);

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        setIsLoading(true);
        const personInfo = await getPersonDetails(personId);
        const credits = await getPersonCombinedCredits(personId);
        
        // Sort by popularity/vote_average and filter out items without images
        const movieCredits = credits
          .filter((item: TMDBResult) => item.media_type === 'movie' && item.poster_path)
          .sort((a: TMDBResult, b: TMDBResult) => b.vote_average - a.vote_average);
        
        const tvCredits = credits
          .filter((item: TMDBResult) => item.media_type === 'tv' && item.poster_path)
          .sort((a: TMDBResult, b: TMDBResult) => b.vote_average - a.vote_average);
        
        setPerson(personInfo);
        setMovies(movieCredits);
        setTVShows(tvCredits);
      } catch (error) {
        console.error("Error fetching person data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonData();
  }, [personId]);
  const renderMediaCard = ({ item }: { item: TMDBResult }) => (
    <View style={styles.mediaCardContainer}>
      <TouchableOpacity 
        style={styles.mediaCard}
        onPress={async () => {
              // Get full details before navigating to detail page
              try {
                const fullDetails = await getFullDetails(item);
                navigation.navigate('Detail', { movie: fullDetails });
              } catch (error) {
                console.error("Error fetching details:", error);
                navigation.navigate('Detail', { movie: item });
              }
            }
            }>
        <Image 
          source={{ uri: getImageUrl(item.poster_path) }} 
          style={styles.mediaPoster} 
          resizeMode="cover"
        />
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.mediaTitle} numberOfLines={1}>
        {item.title || item.name}
      </Text>
      <Text style={styles.mediaYear} numberOfLines={1}>
        {(item.release_date || item.first_air_date)?.substring(0, 4) || 'N/A'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load person details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section with Gradient Overlay */}
      <View style={styles.heroSection}>
        <Image 
          source={{ uri: getImageUrl(person.profile_path, 'w780') }} 
          style={styles.heroImage} 
          resizeMode="cover"
        />
        <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.name}>{person.name}</Text>
            {person.known_for_department && (
              <Text style={styles.position}>{person.known_for_department}</Text>
            )}
            {person.birthday && (
              <Text style={styles.infoText}>
                Born: {new Date(person.birthday).toLocaleDateString()}
                {person.place_of_birth ? ` in ${person.place_of_birth}` : ''}
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Bio Section */}
      {person.biography && (
        <View style={styles.bioSection}>
          <Text style={styles.bioTitle}>Biography</Text>
          <Text style={styles.bioText}>
            {expandBio || person.biography.length <= 300 
              ? person.biography
              : `${person.biography.substring(0, 300)}...`}
          </Text>
          {person.biography.length > 300 && (
            <TouchableOpacity onPress={() => setExpandBio(!expandBio)}>
              <Text style={styles.readMoreButton}>
                {expandBio ? 'Read less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
          onPress={() => setActiveTab('movies')}
        >
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
            Movies ({movies.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tv' && styles.activeTab]}
          onPress={() => setActiveTab('tv')}
        >
          <Text style={[styles.tabText, activeTab === 'tv' && styles.activeTabText]}>
            TV Shows ({tvShows.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Label */}
      <Text style={styles.sectionLabel}>
        {activeTab === 'movies' ? 'Featured in Movies' : 'Featured in TV Shows'}
      </Text>

      {/* Media Content */}
      <View style={styles.mediaContainer}>
        {activeTab === 'movies' ? (
          movies.length > 0 ? (
            <FlatList
              data={movies}
              renderItem={renderMediaCard}
              keyExtractor={(item) => `movie-${item.id}`}
              horizontal={false}
              numColumns={3}
              contentContainerStyle={styles.mediaList}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noContent}>No movies found</Text>
          )
        ) : (
          tvShows.length > 0 ? (
            <FlatList
              data={tvShows}
              renderItem={renderMediaCard}
              keyExtractor={(item) => `tv-${item.id}`}
              horizontal={false}
              numColumns={3}
              contentContainerStyle={styles.mediaList}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noContent}>No TV shows found</Text>
          )
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414', // Netflix dark background
    marginBlockEnd: 35,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  loadingText: {
    color: '#e5e5e5',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 20,
  },
  errorText: {
    color: '#e50914',
    fontSize: 16,
  },
  heroSection: {
    height: 400,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroContent: {
    marginBottom: 16,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  position: {
    fontSize: 18,
    color: '#e5e5e5',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  bioSection: {
    padding: 16,
  },
  bioTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#b3b3b3',
    lineHeight: 20,
  },
  readMoreButton: {
    color: '#e50914',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#e50914', // Netflix red
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#b3b3b3',
  },
  activeTabText: {
    color: 'white',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  mediaContainer: {
    paddingHorizontal: 8, // Smaller horizontal padding to accommodate 3 columns
    paddingTop: 8,
  },
  mediaList: {
    justifyContent: 'space-between',
  },
  mediaCardContainer: {
    width: (width - 48) / 2.75, // Account for padding and gap for 3 columns
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  mediaCard: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mediaPoster: {
    width: '100%',
    height: '100%',
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    marginTop: 6,
    textAlign: 'center',
  },
  mediaYear: {
    fontSize: 10,
    color: '#b3b3b3',
    marginTop: 2,
    textAlign: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
  },
  ratingText: {
    color: '#FFC107', // Gold color for rating
    fontSize: 10,
    fontWeight: 'bold',
  },
  noContent: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
    padding: 16,
  },
});

export default CastDetails;