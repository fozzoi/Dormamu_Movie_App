import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import moment from "moment";

interface HistoryItem {
  query: string;
  date: string;
}

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigation = useNavigation();

  const loadHistory = async () => {
    const jsonValue = await AsyncStorage.getItem("searchHistory");
    if (jsonValue) {
      const parsed = JSON.parse(jsonValue);
      setHistory(parsed.reverse()); // Latest first
    }
  };

  const clearHistory = async () => {
    Alert.alert("Clear History", "Are you sure you want to clear all search history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("searchHistory");
          setHistory([]);
        },
      },
    ]);
  };

  const groupHistoryByDate = () => {
    const grouped: { Today: HistoryItem[]; Yesterday: HistoryItem[]; Older: HistoryItem[] } = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    history.forEach((item) => {
      const itemDate = moment(item.date);
      const today = moment();
      if (itemDate.isSame(today, "day")) {
        grouped.Today.push(item);
      } else if (itemDate.isSame(today.clone().subtract(1, "day"), "day")) {
        grouped.Yesterday.push(item);
      } else {
        grouped.Older.push(item);
      }
    });

    return grouped;
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const groupedHistory = groupHistoryByDate();
  console.log("Grouped History:", groupedHistory);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search History</Text>
        <TouchableOpacity onPress={clearHistory}>
          <Text style={styles.clearButton}>Clear</Text>
        </TouchableOpacity>
      </View>

      {Object.entries(groupedHistory).map(([group, items]) =>
        items.length > 0 ? (
          <View key={group} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group}</Text>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyItem}
                onPress={() => navigation.navigate("Search", { prefillQuery: item.query })}
              >
                <Text style={styles.queryText}>{item.query}</Text>
                <Text style={styles.dateText}>
                  {moment(item.date).format("MMM D, YYYY h:mm A")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null
      )}

      {history.length === 0 && (
        <Text style={styles.emptyText}>No search history yet.</Text>
      )}
    </ScrollView>
  );
};

export default HistoryPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  clearButton: {
    color: "red",
    fontWeight: "600",
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  historyItem: {
    backgroundColor: "#262626",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  queryText: {
    color: "white",
    fontSize: 16,
  },
  dateText: {
    color: "#a3a3a3",
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: "#999",
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
  },
});
