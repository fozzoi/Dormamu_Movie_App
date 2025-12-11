# Google Sans Flex Font Integration Guide

## ✅ Setup Complete

Your app has been configured to use **Google Sans Flex** fonts. Here's what was done:

### 1. **Fonts Added** 📦
- `GoogleSansFlex-Regular.ttf`
- `GoogleSansFlex-Medium.ttf`
- `GoogleSansFlex-Bold.ttf`

Located in: `assets/fonts/`

### 2. **Font Loading** 🔄
Updated `app/_layout.tsx` to:
- Import fonts using `expo-font`
- Load them on app startup
- Show splash screen while fonts load

### 3. **Font Configuration** ⚙️
Created `src/theme/fonts.ts` with:
- Font family constants
- Font size presets
- Font weight definitions
- Helper function `createTextStyle()`

## 📝 How to Use

### Option 1: Using the Font Configuration (Recommended)

```tsx
import { createTextStyle, fonts, fontSizes } from '../src/theme/fonts';

// In your component:
<Text style={createTextStyle(fontSizes.lg, 'bold')}>
  Large Bold Text
</Text>

// Or directly with fonts object:
<Text style={{ fontFamily: fonts.medium, fontSize: 16 }}>
  Medium Text
</Text>
```

### Option 2: Inline Styles

```tsx
<Text style={{ fontFamily: 'GoogleSansFlex-Bold', fontSize: 20 }}>
  Bold Text
</Text>

<Text style={{ fontFamily: 'GoogleSansFlex-Medium', fontSize: 18 }}>
  Medium Text
</Text>

<Text style={{ fontFamily: 'GoogleSansFlex-Regular', fontSize: 16 }}>
  Regular Text
</Text>
```

### Option 3: Create a Custom Theme

Create a new file `src/theme/index.ts`:

```tsx
import { fonts, fontSizes } from './fonts';

export const theme = {
  colors: {
    text: '#FFFFFF',
    background: '#000000',
  },
  typography: {
    h1: {
      fontFamily: fonts.bold,
      fontSize: fontSizes['4xl'],
    },
    h2: {
      fontFamily: fonts.bold,
      fontSize: fontSizes['3xl'],
    },
    h3: {
      fontFamily: fonts.bold,
      fontSize: fontSizes['2xl'],
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.base,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
    },
  },
};
```

Then use it:

```tsx
import { theme } from '../src/theme';

<Text style={theme.typography.h1}>Heading 1</Text>
<Text style={theme.typography.body}>Body Text</Text>
```

## 🎨 Font Weight Names

In Expo/React Native, use these exact font family names:

| Style | Font Family |
|-------|-------------|
| Regular (400) | `GoogleSansFlex-Regular` |
| Medium (500) | `GoogleSansFlex-Medium` |
| Bold (700) | `GoogleSansFlex-Bold` |

## 📱 Common Text Sizes

```tsx
import { fontSizes, fonts } from '../src/theme/fonts';

// Headings
<Text style={{ fontFamily: fonts.bold, fontSize: fontSizes['4xl'] }}>  
  Page Title
</Text>

// Subheadings
<Text style={{ fontFamily: fonts.bold, fontSize: fontSizes['2xl'] }}>
  Section Header
</Text>

// Body Text
<Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.base }}>
  This is regular body text
</Text>

// Small Text
<Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.sm }}>
  Small caption text
</Text>
```

## 🔧 Customization

Edit `src/theme/fonts.ts` to:
- Add more font weights if needed
- Adjust font size presets
- Add new typography styles

## 🚀 Apply to Existing Components

Go through your components and update text styles:

**Before:**
```tsx
<Text style={{ fontSize: 16 }}>Text</Text>
```

**After:**
```tsx
<Text style={{ fontFamily: fonts.regular, fontSize: 16 }}>Text</Text>
```

Or use the helper:
```tsx
<Text style={createTextStyle(16, 'regular')}>Text</Text>
```

## ✨ Additional Notes

- Google Sans Flex is a variable font with excellent readability
- It looks great on both light and dark backgrounds
- Font files are automatically loaded when your app starts
- The fonts are cached by Expo after the first load
