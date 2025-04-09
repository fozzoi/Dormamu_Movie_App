import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Provider as PaperProvider, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import type { SeriesInfo } from './types';

export default function Episodes() {
  const { series: seriesParam } = useLocalSearchParams();
  const series: SeriesInfo = JSON.parse(seriesParam as string);
  const theme = useTheme();

  const handleDownloadEpisode = (seasonNum: number, episodeNum: number, quality: string) => {
    const episode = series.seasons[seasonNum][episodeNum][quality];
    console.log(`Downloading Episode: Season ${seasonNum}, Episode ${episodeNum}, Quality: ${quality}`, episode);
  };

  const handleDownloadSeason = (seasonNum: number) => {
    console.log(`Downloading Season ${seasonNum} in all available qualities.`);
    Alert.alert(
      "Download Season",
      "Choose quality for season download",
      series.qualities.map(quality => ({
        text: quality,
        onPress: () => console.log(`Downloading season ${seasonNum} in ${quality}`)
      }))
    );
  };

  return (
    <PaperProvider theme={theme}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{series.name}</Text>
        {Object.entries(series.seasons).map(([seasonNum, episodes]) => (
          <Card key={seasonNum} style={styles.seasonCard}>
            <Card.Title 
              title={`Season ${seasonNum}`}
              right={() => (
                <Button 
                  onPress={() => handleDownloadSeason(parseInt(seasonNum))}
                >
                  Download Season
                </Button>
              )}
            />
            <Card.Content>
              {Object.entries(episodes).map(([episodeNum, qualities]) => (
                <View key={episodeNum} style={styles.episodeRow}>
                  <Text style={styles.episodeTitle}>
                    Episode {episodeNum}
                  </Text>
                  <View style={styles.qualityButtons}>
                    {Object.entries(qualities).map(([quality]) => (
                      <Button
                        key={quality}
                        mode="contained"
                        style={styles.qualityButton}
                        onPress={() => handleDownloadEpisode(
                          parseInt(seasonNum),
                          parseInt(episodeNum),
                          quality
                        )}
                      >
                        {quality}
                      </Button>
                    ))}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    color: '#fff',
  },
  seasonCard: {
    margin: 8,
    backgroundColor: '#1e1e1e',
  },
  episodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    marginHorizontal: 4,
  },
});
