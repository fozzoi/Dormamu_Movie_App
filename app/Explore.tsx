// ExplorePage.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { getTrendingMovies, getTrendingTV, getTopRated, getRegionalMovies, getImageUrl } from '../src/tmdb';
import { useNavigation } from '@react-navigation/native';
import { searchTMDB, TMDBResult } from '../src/tmdb';


const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.32;

const Section = ({ title, data, navigation }: any) => (
  <View style={{ marginVertical: 12 }}>
    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{title}</Text>
    <FlatList
      horizontal
      data={data}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Detail', { movie: item })}
          style={{ marginRight: 12 }}
        >
          <Image
            source={{ uri: getImageUrl(item.poster_path) }}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5, borderRadius: 10 }}
          />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

const ExplorePage = () => {
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [topRated, setTopRated] = useState<TMDBResult[]>([]);
  const [regional, setRegional] = useState<TMDBResult[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      setTrendingMovies(await getTrendingMovies());
      setTrendingTV(await getTrendingTV());
      setTopRated(await getTopRated());
      setRegional(await getRegionalMovies('IN'));
    })();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      <Section title="🔥 Trending Movies" data={trendingMovies} navigation={navigation} />
      <Section title="📺 Trending TV Shows" data={trendingTV} navigation={navigation} />
      <Section title="⭐ Top Rated" data={topRated} navigation={navigation} />
      <Section title="🌏 Regional Picks (India)" data={regional} navigation={navigation} />
    </ScrollView>
  );
};

export default ExplorePage;