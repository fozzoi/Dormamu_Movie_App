// src/tmdb.ts
import axios from "axios";

// Your existing API Key
const TMDB_API_KEY = "7d3f7aa3d3623c924b57a28243c4e84e";

// ✅ YOUR NEW CLOUDFLARE PROXY URL
// (I removed the trailing slash '/' to ensure it works perfectly)
const TMDB_BASE_URL = "https://dormamu.anuanoopthoppilanu.workers.dev"; 

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY
  },
  timeout: 15000,
});

// Request cache to avoid duplicate API calls
const requestCache = new Map();

// --- Function to clear the cache, e.g., on pull-to-refresh ---
export const clearCache = (keyPrefix: string = "") => {
  if (keyPrefix === "") {
    requestCache.clear();
    console.log("TMDB cache cleared.");
  } else {
    for (const key of requestCache.keys()) {
      if (key.startsWith(keyPrefix)) {
        requestCache.delete(key);
      }
    }
    console.log(`TMDB cache cleared for keys starting with: ${keyPrefix}`);
  }
};

// --- INTERFACES (No changes) ---

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
  
  cast?: TMDBCastMember[]; 
  director?: TMDBCrewMember;
  character?: string; 
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
  episodes?: TMDBEpisode[];
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
  const castItems = data.cast || [];
  return castItems.map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    name: item.name,
    overview: item.overview || "No description available for this credit.",
    poster_path: item.poster_path || null,
    vote_average: parseFloat((item.vote_average || 0).toFixed(1)),
    media_type: item.media_type || (item.title ? "movie" : "tv"),
    release_date: item.release_date || null,
    first_air_date: item.first_air_date || null,
    character: item.character || null
  }));
};

const createCacheKey = (endpoint: string, params: Record<string, any> = {}) => {
  return `${endpoint}-${JSON.stringify(params)}`;
};

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
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }
    throw error;
  }
};

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

export const getTVShowSeasons = async (tvId: number): Promise<TMDBSeason[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}`);
    return data.seasons || [];
  } catch (error) {
    console.error(`Error fetching TV show seasons for ID ${tvId}:`, error);
    return [];
  }
};

export const getSeasonEpisodes = async (tvId: number, seasonNumber: number): Promise<TMDBEpisode[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}/season/${seasonNumber}`);
    return data.episodes || [];
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} episodes for TV ID ${tvId}:`, error);
    return [];
  }
};

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
    } else {
      console.error(`Error fetching certification for ${mediaType} with ID ${id}:`, error);
    }
    return null;
  }
};

const fetchCast = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBCastMember[] | null> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const cast = data.cast?.slice(0, 10) || [];
    if (cast.length === 0) return null;
    return cast.map((member: any) => ({ 
        id: member.id,
        name: member.name || "Unknown Actor",
        profile_path: member.profile_path || null,
        character: member.character || "Unknown Character"
      }));
  } catch (error) {
    console.error(`Error fetching cast for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

const fetchCrew = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBCrewMember | null> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/credits`);
    const director = data.crew?.find(member => member.job === "Director") || null;
    if (!director) return null;
    return {
      id: director.id,
      name: director.name || "Unknown Director",
      profile_path: director.profile_path || null,
      job: director.job || "Director"
    };
  } catch (error) {
    console.error(`Error fetching crew for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

const formatBasicItemData = (item: any): Omit<TMDBResult, 'certification' | 'cast'> => ({
  id: item.id,
  title: item.title || item.name,
  name: item.name,
  overview: item.overview || "No description available.",
  poster_path: item.poster_path,
  vote_average: parseFloat((item.vote_average || 0).toFixed(1)),
  media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
  release_date: item.release_date,
  first_air_date: item.first_air_date,
  number_of_seasons: item.number_of_seasons,
});

export const searchTMDB = async (query: string, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/search/multi", { query, page });
    return data.results.map((item: any) => formatBasicItemData(item));
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    return [];
  }
};

export const getFullDetails = async (item: TMDBResult): Promise<TMDBResult> => {
  try {
    const [certification, castData, directorData] = await Promise.all([
      fetchCertification(item.id, item.media_type),
      fetchCast(item.id, item.media_type),
      fetchCrew(item.id, item.media_type)
    ]);
    
    let seasonsData = null;
    if (item.media_type === "tv") {
      seasonsData = await getTVShowSeasons(item.id);
    }
    
    return {
      ...item,
      certification,
      cast: castData,
      director: directorData,
      seasons: seasonsData || []
    };
  } catch (error) {
    console.error("Error in getFullDetails:", error);
    return item;
  }
};

export const getImageUrl = (path: string | null, size: string = "w500"): string => {
  if (!path) return "https://via.placeholder.com/500x750?text=No+Image";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getMediaDetails = async (id: number, mediaType: "movie" | "tv"): Promise<TMDBResult> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}`);
    const item = formatBasicItemData({...data, media_type: mediaType});
    return await getFullDetails(item);
  } catch (error) {
    console.error(`Error fetching ${mediaType} details:`, error);
    throw error;
  }
};

export const getTrendingMovies = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/trending/movie/week", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    return [];
  }
};

export const getTrendingTV = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/trending/tv/week", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "tv"
    }));
  } catch (error) {
    console.error("Error fetching trending TV:", error);
    return [];
  }
};

export const getTopRated = async (page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/movie/top_rated", { page });
    return data.results.map((item: any) => ({
      ...formatBasicItemData(item),
      media_type: "movie"
    }));
  } catch (error) {
    console.error("Error fetching top rated movies:", error);
    return [];
  }
};

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
    return [];
  }
};

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

const ANIME_GENRE_ID = 16;
const ANIME_KEYWORD_ID = 210024;

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
      getLanguageMovies('hi'),
      getLanguageMovies('ml'),
      getLanguageMovies('ta'),
      getLanguageTV('hi'),
      getLanguageTV('ml'),
      getLanguageMovies('ko'),
      getLanguageTV('ko'),
      getLanguageMovies('ja'),
      getLanguageTV('ja'),
      getAnimeContent(1, true),
      getAnimeContent(1, false),
      getAnimatedMovies()
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

// --- FIX: This function is now complete ---
// It can handle all categories from your Explore page
export const fetchMoreContentByType = async (type: string, page: number = 1): Promise<TMDBResult[]> => {
  console.log("Fetching type:", type, "Page:", page); // For debugging
  
  if (type.startsWith('genre/')) {
    const genreId = parseInt(type.split('/')[1]);
    return await getMoviesByGenre(genreId, page);
  }
  
  if (type.startsWith('similar/')) {
    const [mediaType, id] = type.split('/').slice(1);
    return await getSimilarMedia(parseInt(id), mediaType as "movie" | "tv", page);
  }

  // Handle all categories from Explore page
  switch (type.toLowerCase()) {
    case 'trendingmovies':
      return await getTrendingMovies(page);
    case 'trendingtv':
      return await getTrendingTV(page);
    case 'toprated':
      return await getTopRated(page);
    case 'regional':
      return await getRegionalMovies('IN', page);
    
    // Languages - Movies
    case 'hindimovies':
      return await getLanguageMovies('hi', page);
    case 'malayalammovies':
      return await getLanguageMovies('ml', page);
    case 'tamilmovies':
      return await getLanguageMovies('ta', page);
    case 'koreanmovies':
      return await getLanguageMovies('ko', page);
    case 'japanesemovies':
      return await getLanguageMovies('ja', page);
      
    // Languages - TV
    case 'hinditv':
      return await getLanguageTV('hi', page);
    case 'malayalamtv':
      return await getLanguageTV('ml', page);
    case 'koreantv':
      return await getLanguageTV('ko', page);
    case 'japanesetv':
      return await getLanguageTV('ja', page);
    
    // Anime
    case 'animemovies':
      return await getAnimeContent(page, true);
    case 'animeshows':
      return await getAnimeContent(page, false);
    case 'animatedmovies':
      return await getAnimatedMovies(page);
      
    // Search
    default:
      if (type.startsWith('search:')) {
        const query = type.substring(7);
        return await searchTMDB(query, page);
      }
      // Fallback
      console.warn(`Unknown fetch type: ${type}. Defaulting to trending movies.`);
      return await getTrendingMovies(page);
  }
};
// --- END FIX ---

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
    const [movieGenres, tvGenres] = await Promise.all([
      fetchWithCache("/genre/movie/list"),
      fetchWithCache("/genre/tv/list")
    ]);

    const allGenres = [...movieGenres.genres, ...tvGenres.genres];
    const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values());

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