// LoadingSection.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import LoadingCard from './LoadingCard';

interface LoadingSectionProps {
  title: string;
  count?: number;
}

const LoadingSection = ({ title, count = 5 }: LoadingSectionProps) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Array.from({ length: count }).map((_, index) => (
          <LoadingCard key={index} index={index} delay={index} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default LoadingSection;