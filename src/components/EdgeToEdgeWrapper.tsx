import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface EdgeToEdgeWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

const EdgeToEdgeWrapper = ({ children, backgroundColor = '#000000' }: EdgeToEdgeWrapperProps) => {
  return (
    <SafeAreaProvider style={[styles.container, { backgroundColor }]}>
      {children}
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default EdgeToEdgeWrapper;
