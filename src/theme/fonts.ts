// Font configuration for Google Sans Flex
export const fonts = {
  regular: 'GoogleSansFlex-Regular',
  medium: 'GoogleSansFlex-Medium',
  bold: 'GoogleSansFlex-Bold',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

// Helper function to create text styles
export const createTextStyle = (
  fontSize: number = fontSizes.base,
  fontWeight: 'regular' | 'medium' | 'bold' = 'regular',
  lineHeight?: number
) => ({
  fontFamily: fonts[fontWeight],
  fontSize,
  lineHeight: lineHeight || fontSize * 1.5,
});
