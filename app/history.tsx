import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import moment from "moment";

interface HistoryItem {
  query: string;
  date: string;
}

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = -80;

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigation = useNavigation();
  const [currentlyOpenSwipeable, setCurrentlyOpenSwipeable] = useState<number | null>(null);
  const animatedValues = useRef<{[key: string]: Animated.Value}>({}).current;
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const loadHistory = async () => {
    const jsonValue = await AsyncStorage.getItem("searchHistory");
    if (jsonValue) {
      const parsed = JSON.parse(jsonValue);
      setHistory(parsed.reverse()); // Latest first
    }
  };

  const clearHistory = () => {
    setIsAlertVisible(true);
  };

  const handleClearHistory = async () => {
    await AsyncStorage.removeItem("searchHistory");
    setHistory([]);
    setIsAlertVisible(false);
  };

  const deleteHistoryItem = async (itemIndex: number) => {
    const itemToDelete = history[itemIndex];
    const updatedHistory = history.filter(
      (item, index) => index !== itemIndex
    );
    setHistory(updatedHistory);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    // Reset the animation for the deleted item
    if (animatedValues[`item-${itemIndex}`]) {
      animatedValues[`item-${itemIndex}`].setValue(0);
    }
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

  const getSwipeableItemProps = (itemIndex: number) => {
    if (!animatedValues[`item-${itemIndex}`]) {
      animatedValues[`item-${itemIndex}`] = new Animated.Value(0);
    }
    
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        // When a new swipe starts, close any currently open swipeable
        if (currentlyOpenSwipeable !== null && currentlyOpenSwipeable !== itemIndex) {
          Animated.spring(animatedValues[`item-${currentlyOpenSwipeable}`], {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
        setCurrentlyOpenSwipeable(itemIndex);
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit movement to only left swipes and no more than -100
        const newValue = Math.max(gestureState.dx, -100);
        animatedValues[`item-${itemIndex}`].setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // If swiped far enough, keep open
          Animated.spring(animatedValues[`item-${itemIndex}`], {
            toValue: -100,
            useNativeDriver: false,
          }).start();
        } else {
          // Otherwise, close
          Animated.spring(animatedValues[`item-${itemIndex}`], {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setCurrentlyOpenSwipeable(null);
        }
      },
    });
    
    return {
      panHandlers: panResponder.panHandlers,
      animatedStyle: {
        transform: [{ translateX: animatedValues[`item-${itemIndex}`] }],
      },
    };
  };

  const groupedHistory = groupHistoryByDate();
  console.log("Grouped History:", groupedHistory);

  const renderHistoryItem = (item: HistoryItem, index: number, groupOffset: number) => {
    const itemIndex = index + groupOffset;
    const { animatedStyle, panHandlers } = getSwipeableItemProps(itemIndex);
    
    return (
      <View key={index} style={styles.swipeContainer}>
        <Animated.View style={[styles.historyItemContainer, animatedStyle]} {...panHandlers}>
          <TouchableOpacity
            style={styles.historyItem}
            onPress={() => navigation.navigate("Search", { prefillQuery: item.query })}
          >
            <Text style={styles.queryText} numberOfLines={1} ellipsizeMode="tail">
              {item.query}
            </Text>
            <Text style={styles.dateText}>
              {moment(item.date).format("MMM D, YYYY h:mm A")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteHistoryItem(itemIndex)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomAlert = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAlertVisible}
      onRequestClose={() => setIsAlertVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Clear History</Text>
          <Text style={styles.modalMessage}>Are you sure you want to clear all search history?</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setIsAlertVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={handleClearHistory}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {renderCustomAlert()}
      <View style={styles.header}>
        <Text style={styles.title}>Search History</Text>
        <TouchableOpacity 
          style={styles.clearButtonContainer}
          onPress={clearHistory}
        >
          <Text style={styles.clearButton}>Clear</Text>
        </TouchableOpacity>
      </View>

      {Object.entries(groupedHistory).map(([group, items], groupIndex) =>
        items.length > 0 ? (
          <View key={group} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group}</Text>
            <View style={styles.itemsContainer}>
              {items.map((item, index) => {
                // Calculate the offset for item indices based on previous groups
                let groupOffset = 0;
                for (let i = 0; i < groupIndex; i++) {
                  const prevGroup = Object.values(groupedHistory)[i];
                  groupOffset += prevGroup.length;
                }
                return renderHistoryItem(item, index, groupOffset);
              })}
            </View>
          </View>
        ) : null
      )}

      {history.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No search history yet.</Text>
          <Text style={styles.emptySubText}>Your search history will appear here</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default HistoryPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414", // Netflix background color
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    marginTop: 20,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "GoogleSansFlex-Bold",
    letterSpacing: 0.3,
  },
  clearButtonContainer: {
    backgroundColor: "rgba(255, 55, 55, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  clearButton: {
    color: "#E50914", // Netflix red
    fontWeight: "600",
    fontFamily: 'GoogleSansFlex-Medium',
  },
  groupContainer: {
    marginBottom: 28,
  },
  groupTitle: {
    color: "#E5E5E5", // Light gray
    fontSize: 20,
    fontWeight: "600",
    fontFamily: 'GoogleSansFlex-Medium',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  itemsContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  swipeContainer: {
    position: "relative",
    marginBottom: 2,
    height: 64, // Fixed height for swipe items
    overflow: "hidden",
  },
  historyItemContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  historyItem: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    height: "100%",
    justifyContent: "center",
    borderRadius: 4,
  },
  queryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: 'GoogleSansFlex-Medium',
    marginBottom: 4,
  },
  dateText: {
    color: "#B3B3B3", // Netflix light gray text
    fontSize: 12,
    fontFamily: 'GoogleSansFlex-Regular',
  },
  deleteButton: {
    position: "absolute",
    backgroundColor: "#E50914", // Netflix red
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "600",
    fontFamily: 'GoogleSansFlex-Medium',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    color: "#E5E5E5",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: 'GoogleSansFlex-Bold',
  },
  emptySubText: {
    color: "#999999",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'GoogleSansFlex-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'GoogleSansFlex-Bold',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#B3B3B3',
    fontSize: 16,
    fontFamily: 'GoogleSansFlex-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'GoogleSansFlex-Regular',
  },
  modalButtonDanger: {
    backgroundColor: '#E50914',
    borderRadius: 4,
  },
  modalButtonTextDanger: {
    fontWeight: 'bold',
  },
});