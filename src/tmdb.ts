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
  cast?: string[];
  castIds?: number[];
  character?: string; // Character played by the person in the movie/show
  number_of_seasons?: number; // For TV shows only
  seasons?: TMDBSeason[]; // For TV shows only
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

export const getPersonCombinedCredits = async (personId: number): Promise<TMDBResult[]> => {
  const data = await fetchWithCache(`/person/${personId}/combined_credits`);
  
  // Process cast items to ensure they have all required fields
  const castItems = data.cast || [];
  
  return castItems.map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    name: item.name,
    overview: item.overview || "No description available.",
    poster_path: item.poster_path,
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
    return [];
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

// Optimized cast fetch - lazy loading
const fetchCast = async (id: number, mediaType: "movie" | "tv") => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const cast = data.cast?.slice(0, 10) || [];
    return cast.length > 0 
      ? cast.map((member: any) => ({ 
          name: member.name, 
          id: member.id,
          profile_path: member.profile_path,
          character: member.character
        })) 
      : null;
  } catch (error) {
    console.error(`Error fetching cast for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// Add this new function to fetch crew
const fetchCrew = async (id: number, mediaType: "movie" | "tv") => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const director = data.crew?.find(member => member.job === "Director") || null;
    return director ? {
      id: director.id,
      name: director.name,
      profile_path: director.profile_path,
      job: director.job
    } : null;
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
    // Return basic data first, then lazily load additional data if needed
    return data.results.map((item: any) => formatBasicItemData(item));
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    throw new Error("Failed to fetch data from TMDB.");
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
      cast: castData?.map(c => c.name),
      castIds: castData?.map(c => c.id),
      cast_profiles: castData?.map(c => c.profile_path),
      characters: castData?.map(c => c.character),
      director: directorData,
      seasons: seasonsData || []
    };
  } catch (error) {
    console.error("Error in getFullDetails:", error);
    return item;
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
    throw error;
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
    throw new Error("Failed to fetch trending movies.");
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
    throw new Error("Failed to fetch trending TV shows.");
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
    throw new Error("Failed to fetch top rated movies.");
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
    throw new Error("Failed to fetch regional movies.");
  }
};

// Parallel fetch all discovery content at once for initial page load
export const fetchAllDiscoveryContent = async () => {
  try {
    const [trending, trendingTV, topRated, regional] = await Promise.all([
      getTrendingMovies(),
      getTrendingTV(),
      getTopRated(),
      getRegionalMovies('IN')
    ]);
    
    return {
      trendingMovies: trending,
      trendingTV,
      topRated,
      regional
    };
  } catch (error) {
    console.error("Error fetching discovery content:", error);
    throw new Error("Failed to fetch discovery content.");
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