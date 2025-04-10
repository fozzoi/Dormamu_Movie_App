// DetailPage.tsx
import React from 'react';
import { View, ScrollView, Dimensions, ImageBackground } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { getImageUrl } from '../src/tmdb';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DetailPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // Expecting a "movie" parameter passed from Explore or WatchList
  const { movie } = route.params as { movie: any };

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
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    </ScrollView>
  );
};

export default DetailPage;
