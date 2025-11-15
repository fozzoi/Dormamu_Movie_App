import axios from "axios";

const TMDB_API_KEY = "7d3f7aa3d3623c924b57a28243c4e84e";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Create and reuse axios instance for better performance
const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY
  }
});

// Request cache to avoid duplicate API calls
const requestCache = new Map();

// --- NEW/UPDATED INTERFACES ---

export interface TMDBCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  character: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  profile_path: string | null;
  job: string;
}

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  certification?: string;
  
  // OPTIMIZED: Replaced separate string[]/number[] with structured objects
  cast?: TMDBCastMember[]; 
  director?: TMDBCrewMember;

  // For getPersonCombinedCredits context
  character?: string; 
  
  // For TV shows only
  number_of_seasons?: number; 
  seasons?: TMDBSeason[];
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string | null;
  episodes?: TMDBEpisode[]; // Episodes will be loaded on demand
}

export interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  vote_average: number;
  runtime: number | null;
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  also_known_as?: string[];
  deathday?: string | null;
  gender?: number;
  popularity?: number;
  homepage?: string | null;
}

export const getPersonDetails = async (personId: number): Promise<TMDBPerson> => {
  return await fetchWithCache(`/person/${personId}`);
};

// --- FIXED FUNCTION ---
// Now includes all credits, passing null posters to be handled by getImageUrl
// and providing a fallback for overview.
export const getPersonCombinedCredits = async (personId: number): Promise<TMDBResult[]> => {
  const data = await fetchWithCache(`/person/${personId}/combined_credits`);
  
  const castItems = data.cast || [];
  
  return castItems.map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    name: item.name,
    overview: item.overview || "No description available for this credit.",
    poster_path: item.poster_path || null, // Pass null, getImageUrl will handle it
    vote_average: parseFloat((item.vote_average || 0).toFixed(1)),
    media_type: item.media_type || (item.title ? "movie" : "tv"),
    release_date: item.release_date || null,
    first_air_date: item.first_air_date || null,
    character: item.character || null
  }));
};

// Helper function to create a cache key
const createCacheKey = (endpoint: string, params: Record<string, any> = {}) => {
  return `${endpoint}-${JSON.stringify(params)}`;
};

// Fetch data with caching
const fetchWithCache = async (endpoint: string, params: Record<string, any> = {}) => {
  const cacheKey = createCacheKey(endpoint, params);
  
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }
  
  try {
    const response = await tmdbApi.get(endpoint, { params });
    requestCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

// NEW: Get similar movies or TV shows
export const getSimilarMedia = async (id: number, mediaType: "movie" | "tv", page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/similar`, { page });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: mediaType
    }));
  } catch (error) {
    console.error(`Error fetching similar ${mediaType} content:`, error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// NEW: Get TV show seasons
export const getTVShowSeasons = async (tvId: number): Promise<TMDBSeason[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}`);
    return data.seasons || [];
  } catch (error) {
    console.error(`Error fetching TV show seasons for ID ${tvId}:`, error);
    return [];
  }
};

// NEW: Get TV show season episodes
export const getSeasonEpisodes = async (tvId: number, seasonNumber: number): Promise<TMDBEpisode[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}/season/${seasonNumber}`);
    return data.episodes || [];
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} episodes for TV ID ${tvId}:`, error);
    return [];
  }
};

// Optimized certification fetch - lazy loading
const fetchCertification = async (id: number, mediaType: "movie" | "tv"): Promise<string | null> => {
  const endpoint = mediaType === "movie" 
    ? `/movie/${id}/release_dates` 
    : `/tv/${id}/content_ratings`;
  
  try {
    const data = await fetchWithCache(endpoint);
    const results = data.results || [];
    const usRelease = results.find((item: any) => item.iso_3166_1 === "US");
    
    if (mediaType === "movie") {
      return usRelease?.release_dates?.[0]?.certification || null;
    } else {
      return usRelease?.rating || null;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Certification not found for ${mediaType} with ID ${id}`);
      return null;
    }
    console.error(`Error fetching certification for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// --- UPDATED/FIXED FUNCTION ---
// Optimized cast fetch with fallback strings to prevent render errors
const fetchCast = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBCastMember[] | null> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const cast = data.cast?.slice(0, 10) || [];
    
    if (cast.length === 0) return null;

    return cast.map((member: any) => ({ 
        // Provide fallbacks for all critical fields
        id: member.id, // We keep the id (null or not) for the keyExtractor
        name: member.name || "Unknown Actor", // Ensures name is ALWAYS a string
        profile_path: member.profile_path || null,
        character: member.character || "Unknown Character" // Ensures character is ALWAYS a string
      }));
  } catch (error) {
    console.error(`Error fetching cast for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// --- UPDATED/FIXED FUNCTION ---
// Optimized crew fetch with fallback strings to prevent render errors
const fetchCrew = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBCrewMember | null> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const director = data.crew?.find(member => member.job === "Director") || null;
    
    if (!director) return null;

    return {
      id: director.id,
      name: director.name || "Unknown Director", // Ensures name is ALWAYS a string
      profile_path: director.profile_path || null,
      job: director.job || "Director"
    };
  } catch (error) {
    console.error(`Error fetching crew for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// Helper to format basic item data
const formatBasicItemData = (item: any): Omit<TMDBResult, 'certification' | 'cast'> => ({
  id: item.id,
  title: item.title || item.name,
  name: item.name,
  overview: item.overview || "No description available.",
  poster_path: item.poster_path,
  vote_average: parseFloat((item.vote_average || 0).toFixed(1)),
  media_type: item.media_type || (item.first_air_date ? "tv" : "movie"), // Better media type detection
  release_date: item.release_date,
  first_air_date: item.first_air_date,
  number_of_seasons: item.number_of_seasons,
});

// Enhanced search function with lazy loading
export const searchTMDB = async (query: string, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/search/multi", { query, page });
    return data.results.map((item: any) => formatBasicItemData(item));
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// Get full details for a single item (with cert and cast)
export const getFullDetails = async (item: TMDBResult): Promise<TMDBResult> => {
  try {
    const [certification, castData, directorData] = await Promise.all([
      fetchCertification(item.id, item.media_type),
      fetchCast(item.id, item.media_type),
      fetchCrew(item.id, item.media_type)
    ]);
    
    // Add seasons data if it's a TV show
    let seasonsData = null;
    if (item.media_type === "tv") {
      seasonsData = await getTVShowSeasons(item.id);
    }
    
    return {
      ...item,
      certification,
      cast: castData,       // Cleanly assign the cast array
      director: directorData, // Cleanly assign the director object
      seasons: seasonsData || []
    };
  } catch (error) {
    console.error("Error in getFullDetails:", error);
    return item; // Return original item on failure
  }
};

// Helper to get poster image URL
export const getImageUrl = (path: string | null, size: string = "w500"): string => {
  if (!path) return "https://via.placeholder.com/500x750?text=No+Image";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Get media details (movie or TV show)
export const getMediaDetails = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBResult> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}`);
    const item = formatBasicItemData({...data, media_type: mediaType}); // Ensure media_type is set
    return await getFullDetails(item);
  } catch (error) {
    console.error(`Error fetching ${mediaType} details:`, error);
    throw error; // Let the calling component handle a 404 for a single item
  }
};

// Optimized trending movies fetch with pagination
export const getTrendingMovies = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/trending/movie/week", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// Optimized trending TV shows fetch with pagination
export const getTrendingTV = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/trending/tv/week", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "tv"
    }));
  } catch (error) {
    console.error("Error fetching trending TV:", error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// Optimized top rated movies fetch with pagination
export const getTopRated = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/movie/top_rated", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error("Error fetching top rated movies:", error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// Optimized regional movies fetch with pagination
export const getRegionalMovies = async (region: string = 'IN', page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/discover/movie", {
      region,
      sort_by: "popularity.desc",
      page
    });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error(`Error fetching regional movies for region ${region}:`, error);
    return []; // OPTIMIZED: Return empty array on error
  }
};

// Add new regional movie functions
export const getLanguageMovies = async (language: string, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/discover/movie", {
      with_original_language: language,
      sort_by: "popularity.desc",
      page
    });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error(`Error fetching ${language} movies:`, error);
    return [];
  }
};

// Add new function for language-specific TV shows
export const getLanguageTV = async (language: string, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/discover/tv", {
      with_original_language: language,
      sort_by: "popularity.desc",
      page
    });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "tv"
    }));
  } catch (error) {
    console.error(`Error fetching ${language} TV shows:`, error);
    return [];
  }
};

// Add anime and animation genre IDs
const ANIME_GENRE_ID = 16;      // Animation genre ID in TMDB
const ANIME_KEYWORD_ID = 210024; // Anime keyword ID in TMDB

// Add anime/animation content discovery function
export const getAnimeContent = async (page: number = 1, isMovie: boolean = true): Promise<TMDBResult[]> => {
  try {
    const mediaType = isMovie ? 'movie' : 'tv';
    const data = await fetchWithCache(`/discover/${mediaType}`, {
      with_genres: ANIME_GENRE_ID,
      with_keywords: ANIME_KEYWORD_ID,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page
    });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: isMovie ? 'movie' : 'tv'
    }));
  } catch (error) {
    console.error('Error fetching anime content:', error);
    return [];
  }
};

// --- NEW HELPER FUNCTION ---
// Extracted from fetchAllDiscoveryContent for cleanliness
export const getAnimatedMovies = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache('/discover/movie', { 
      with_genres: ANIME_GENRE_ID,
      sort_by: 'popularity.desc',
      page
    });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: 'movie'
    }));
  } catch (error) {
    console.error('Error fetching animated movies:', error);
    return [];
  }
};


// Parallel fetch all discovery content at once for initial page load
export const fetchAllDiscoveryContent = async () => {
  try {
    const [
      trending,
      trendingTV, 
      topRated,
      regional,
      hindiMovies,
      malayalamMovies,
      tamilMovies,
      hindiTV,
      malayalamTV,
      koreanMovies,
      koreanTV,
      japaneseMovies,
      japaneseTV,
      animeMovies,
      animeShows,
      animatedMovies 
    ] = await Promise.all([
      getTrendingMovies(),
      getTrendingTV(),
      getTopRated(),
      getRegionalMovies('IN'),
      getLanguageMovies('hi'), // Hindi
      getLanguageMovies('ml'), // Malayalam
      getLanguageMovies('ta'), // Tamil
      getLanguageTV('hi'),     // Hindi TV shows
      getLanguageTV('ml'),      // Malayalam TV shows
      getLanguageMovies('ko'), // Korean
      getLanguageTV('ko'),      // Korean TV shows
      getLanguageMovies('ja'), // Japanese
      getLanguageTV('ja'),      // Japanese TV shows
      getAnimeContent(1, true),
      getAnimeContent(1, false),
      getAnimatedMovies()      // Using the clean helper function
    ]);
    
    return {
      trendingMovies: trending,
      trendingTV,
      topRated,
      regional,
      hindiMovies,
      malayalamMovies,
      tamilMovies,
      hindiTV,
      malayalamTV,
      koreanMovies,
      koreanTV,
      japaneseMovies,
      japaneseTV,
      animeMovies,
      animeShows,
      animatedMovies
    };
  } catch (error) {
    console.error("Error fetching discovery content:", error);
    // Return a partial or empty object so the app doesn't crash
    return {
      trendingMovies: [],
      trendingTV: [],
      topRated: [],
      regional: [],
      hindiMovies: [],
      malayalamMovies: [],
      tamilMovies: [],
      hindiTV: [],
      malayalamTV: [],
      koreanMovies: [],
      koreanTV: [],
      japaneseMovies: [],
      japaneseTV: [],
      animeMovies: [],
      animeShows: [],
      animatedMovies: []
    };
  }
};

// Fetch more content by type with pagination
export const fetchMoreContentByType = async (type: string, page: number = 1): Promise<TMDBResult[]> => {
  if (type.startsWith('genre/')) {
    const genreId = parseInt(type.split('/')[1]);
    return await getMoviesByGenre(genreId, page);
  }
  
  // NEW: Added support for similar media type
  if (type.startsWith('similar/')) {
    const [mediaType, id] = type.split('/').slice(1);
    return await getSimilarMedia(parseInt(id), mediaType as "movie" | "tv", page);
  }

  switch (type.toLowerCase()) {
    case 'movie':
    case 'trending':
      return await getTrendingMovies(page);
    case 'tv':
      return await getTrendingTV(page);
    case 'top':
      return await getTopRated(page);
    case 'regional':
      return await getRegionalMovies('IN', page);
    // You can add more language cases here if needed
    case 'hindi':
      return await getLanguageMovies('hi', page);
    case 'malayalam':
      return await getLanguageMovies('ml', page);
    case 'korean':
        return await getLanguageMovies('ko', page);
    // ... etc.
    default:
      // Search mode
      if (type.startsWith('search:')) {
        const query = type.substring(7);
        return await searchTMDB(query, page);
      }
      // Default to trending movies
      return await getTrendingMovies(page);
  }
};

export const searchPeople = async (query: string, page: number = 1): Promise<TMDBPerson[]> => {
  try {
    const data = await fetchWithCache("/search/person", { query, page });
    return data.results.map((person: any) => ({
      id: person.id,
      name: person.name,
      profile_path: person.profile_path,
      popularity: person.popularity,
      known_for_department: person.known_for_department
    }));
  } catch (error) {
    console.error("Error searching people:", error);
    return [];
  }
};

export const searchGenres = async (query: string): Promise<{ id: number; name: string }[]> => {
  try {
    // First get all genres
    const [movieGenres, tvGenres] = await Promise.all([
      fetchWithCache("/genre/movie/list"),
      fetchWithCache("/genre/tv/list")
    ]);

    // Combine and deduplicate genres
    const allGenres = [...movieGenres.genres, ...tvGenres.genres];
    const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values());

    // Filter genres based on query
    return uniqueGenres.filter(genre => 
      genre.name.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error("Error fetching genres:", error);
    return [];
  }
};

export const getMovieGenres = async (id: number, mediaType: "movie" | "tv" = "movie"): Promise<{ id: number; name: string }[]> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}`);
    return data.genres || [];
  } catch (error) {
    console.error(`Error fetching ${mediaType} genres:`, error);
    return [];
  }
};

export const getMoviesByGenre = async (genreId: number, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/discover/movie", {
      with_genres: genreId,
      sort_by: "popularity.desc",
      page
    });
    
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreId}:`, error);
    return [];
  }
};