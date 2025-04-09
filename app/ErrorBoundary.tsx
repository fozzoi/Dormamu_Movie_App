import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, Button } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Optionally reload the app
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.message?.toString() || "An unknown error occurred."} {/* Ensure the error message is a string */}
          </Text>
          <Button title="Try Again" onPress={this.handleReset} />
          <Button title="Retry" onPress={this.handleRetry} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
});
