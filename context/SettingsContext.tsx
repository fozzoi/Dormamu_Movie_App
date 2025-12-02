import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

type Theme = 'light' | 'dark';

interface SettingsContextProps {
    theme: Theme;
    toggleTheme: () => void;
    nsfw: boolean;
    toggleNsfw: () => void;
    highRes: boolean;
    toggleHighRes: () => void;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextProps>({
    theme: 'dark',
    toggleTheme: () => { },
    nsfw: true,
    toggleNsfw: () => { },
    highRes: false,
    toggleHighRes: () => { },
    isLoading: true,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState<Theme>('dark');
    const [nsfw, setNsfw] = useState(true); // Default ON (filter NSFW)
    const [highRes, setHighRes] = useState(false); // Default OFF
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('settings_theme');
            const storedNsfw = await AsyncStorage.getItem('settings_nsfw');
            const storedHighRes = await AsyncStorage.getItem('settings_highRes');

            if (storedTheme) {
                setTheme(storedTheme as Theme);
            } else {
                // Default to dark if not set, or system preference if you prefer
                setTheme('dark');
            }

            if (storedNsfw !== null) {
                setNsfw(JSON.parse(storedNsfw));
            }

            if (storedHighRes !== null) {
                setHighRes(JSON.parse(storedHighRes));
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        await AsyncStorage.setItem('settings_theme', newTheme);
    };

    const toggleNsfw = async () => {
        const newValue = !nsfw;
        setNsfw(newValue);
        await AsyncStorage.setItem('settings_nsfw', JSON.stringify(newValue));
    };

    const toggleHighRes = async () => {
        const newValue = !highRes;
        setHighRes(newValue);
        await AsyncStorage.setItem('settings_highRes', JSON.stringify(newValue));
    };

    // Construct the Paper theme
    const paperTheme = theme === 'dark'
        ? {
            ...MD3DarkTheme,
            colors: {
                ...MD3DarkTheme.colors,
                background: "#000000",
                surface: "#1e1e1e",
                primary: "#E50914",
                onSurface: "#ffffff",
                // Add other custom colors if needed
            },
        }
        : {
            ...MD3LightTheme,
            colors: {
                ...MD3LightTheme.colors,
                background: "#f5f5f5",
                surface: "#ffffff",
                primary: "#E50914",
                onSurface: "#000000",
            },
        };

    return (
        <SettingsContext.Provider
            value={{
                theme,
                toggleTheme,
                nsfw,
                toggleNsfw,
                highRes,
                toggleHighRes,
                isLoading,
            }}
        >
            <PaperProvider theme={paperTheme}>
                {children}
            </PaperProvider>
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
