#!/usr/bin/env bash
set -e

echo "📦 Updating system..."
sudo dnf update -y

echo "☕ Installing OpenJDK 17..."
# Fedora 39+ uses modular Java streams
sudo dnf install -y java-latest-openjdk java-latest-openjdk-devel

# Verify the Java version (should show 17 or higher)
java -version

echo "🔧 Installing Android platform tools (adb, fastboot)..."
sudo dnf install -y android-tools wget unzip

echo "📁 Creating Android SDK directories..."
mkdir -p $HOME/Android/Sdk/cmdline-tools
cd $HOME/Android/Sdk/cmdline-tools

if [ ! -f "commandlinetools.zip" ]; then
  echo "⬇️  Downloading Android command line tools..."
  wget -O commandlinetools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
fi

echo "📦 Extracting SDK tools..."
unzip -o commandlinetools.zip -d latest
rm -f commandlinetools.zip

echo "⚙️  Setting up environment variables..."
BASHRC_PATH="$HOME/.bashrc"

if ! grep -q "ANDROID_HOME" "$BASHRC_PATH"; then
  {
    echo "export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin"
  } >> "$BASHRC_PATH"
  echo "✅ Added Android environment variables to .bashrc"
fi

source "$BASHRC_PATH"

echo "🧩 Installing SDK packages..."
yes | sdkmanager --licenses || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "cmdline-tools;latest"

echo "✅ Android SDK setup complete!"

