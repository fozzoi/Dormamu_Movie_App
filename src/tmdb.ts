import axios from "axios";

// API Key
const TMDB_API_KEY = "7d3f7aa3d3623c924b57a28243c4e84e";

// --- URL CONFIGURATION ---
const DIRECT_URL = "https://api.themoviedb.org/3";
// ✅ FIXED: Added '/3' to the end so it matches TMDB API structure
const PROXY_URL = "https://dormamu.anuanoopthoppilanu.workers.dev/3"; 

const tmdbApi = axios.create({
  baseURL: DIRECT_URL,
  params: {
    api_key: TMDB_API_KEY
  },
  timeout: 10000, 
});

// --- AUTO-FAILOVER INTERCEPTOR ---
// 1. Tries Direct URL.
// 2. If it fails (network error/timeout), switches to Proxy URL and retries.
tmdbApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if we haven't retried yet AND we are currently using Direct URL
    if (!originalRequest._retry && originalRequest.baseURL === DIRECT_URL) {
      console.log("⚠️ Direct TMDB connection failed. Switching to Cloudflare Proxy...");
      
      originalRequest._retry = true;        // Mark as retried
      originalRequest.baseURL = PROXY_URL;  // Switch URL
      
      // Retry the request
      return tmdbApi(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Request cache
const requestCache = new Map();

export const clearCache = (keyPrefix: string = "") => {
  if (keyPrefix === "") {
    requestCache.clear();
  } else {
    for (const key of requestCache.keys()) {
      if (key.startsWith(keyPrefix)) requestCache.delete(key);
    }
  }
};

// --- INTERFACES ---

export interface TMDBImage {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  vote_average?: number;
}

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
  genre_ids?: number[]; // ✅ Critical for chips
  
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

// --- HELPER: FORMAT DATA ---
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
  genre_ids: item.genre_ids || [], // ✅ Passing genres through
});

const createCacheKey = (endpoint: string, params: Record<string, any> = {}) => {
  return `${endpoint}-${JSON.stringify(params)}`;
};

const fetchWithCache = async (endpoint: string, params: Record<string, any> = {}) => {
  const cacheKey = createCacheKey(endpoint, params);
  if (requestCache.has(cacheKey)) return requestCache.get(cacheKey);
  try {
    const response = await tmdbApi.get(endpoint, { params });
    requestCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// --- UPDATED FETCH FUNCTIONS (WITH GENRE FILTERING) ---

// 1. Trending (Switches to Discover if genreId is present)
export const getTrendingMovies = async (page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  try {
    // TMDB Trending endpoint DOES NOT support with_genres.
    // If a genre is selected, we switch to /discover/movie sorted by popularity.
    const endpoint = genreId ? "/discover/movie" : "/trending/movie/week";
    const params: any = { page };
    
    if (genreId) {
      params.with_genres = genreId;
      params.sort_by = "popularity.desc";
    }

    const data = await fetchWithCache(endpoint, params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "movie" }));
  } catch (error) { return []; }
};

export const getTrendingTV = async (page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  try {
    const endpoint = genreId ? "/discover/tv" : "/trending/tv/week";
    const params: any = { page };
    
    if (genreId) {
      params.with_genres = genreId;
      params.sort_by = "popularity.desc";
    }

    const data = await fetchWithCache(endpoint, params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "tv" }));
  } catch (error) { return []; }
};

// 2. Top Rated (Switches to Discover if genreId is present)
export const getTopRated = async (page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  try {
    const endpoint = genreId ? "/discover/movie" : "/movie/top_rated";
    const params: any = { page };
    
    if (genreId) {
      params.with_genres = genreId;
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 300; // Filter out movies with 1 vote
    }

    const data = await fetchWithCache(endpoint, params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "movie" }));
  } catch (error) { return []; }
};

// 3. Regional & Language (Appends genreId)
export const getRegionalMovies = async (region: string = 'IN', page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  const params: any = { region, sort_by: "popularity.desc", page };
  if (genreId) params.with_genres = genreId;

  try {
    const data = await fetchWithCache("/discover/movie", params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "movie" }));
  } catch (error) { return []; }
};

export const getLanguageMovies = async (language: string, page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  const params: any = { with_original_language: language, sort_by: "popularity.desc", page };
  if (genreId) params.with_genres = genreId;

  try {
    const data = await fetchWithCache("/discover/movie", params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "movie" }));
  } catch (error) { return []; }
};

export const getLanguageTV = async (language: string, page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  const params: any = { with_original_language: language, sort_by: "popularity.desc", page };
  if (genreId) params.with_genres = genreId;

  try {
    const data = await fetchWithCache("/discover/tv", params);
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "tv" }));
  } catch (error) { return []; }
};

// 4. Anime (Merges IDs)
const ANIME_GENRE_ID = 16;
const ANIME_KEYWORD_ID = 210024;

export const getAnimeContent = async (page: number = 1, isMovie: boolean = true, genreId?: number): Promise<TMDBResult[]> => {
  try {
    const mediaType = isMovie ? 'movie' : 'tv';
    // Combine Anime Genre (16) with selected genre (e.g., 16,28 for Action Anime)
    const genres = genreId ? `${ANIME_GENRE_ID},${genreId}` : `${ANIME_GENRE_ID}`;

    const data = await fetchWithCache(`/discover/${mediaType}`, {
      with_genres: genres,
      with_keywords: ANIME_KEYWORD_ID,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page
    });
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: mediaType }));
  } catch (error) { return []; }
};

export const getAnimatedMovies = async (page: number = 1, genreId?: number): Promise<TMDBResult[]> => {
  const genres = genreId ? `${ANIME_GENRE_ID},${genreId}` : `${ANIME_GENRE_ID}`;
  try {
    const data = await fetchWithCache('/discover/movie', { 
      with_genres: genres,
      sort_by: 'popularity.desc',
      page
    });
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: 'movie' }));
  } catch (error) { return []; }
};


// --- BATCH FETCH (The main function used by Explore.tsx) ---
export const fetchAllDiscoveryContent = async (genreId?: number) => {
  const gId = genreId === 0 ? undefined : genreId;

  try {
    const [
      trending, trendingTV, topRated, regional,
      hindiMovies, malayalamMovies, tamilMovies,
      hindiTV, malayalamTV,
      koreanMovies, koreanTV,
      japaneseMovies, japaneseTV,
      animeMovies, animeShows, animatedMovies 
    ] = await Promise.all([
      getTrendingMovies(1, gId),
      getTrendingTV(1, gId),
      getTopRated(1, gId),
      getRegionalMovies('IN', 1, gId),
      getLanguageMovies('hi', 1, gId),
      getLanguageMovies('ml', 1, gId),
      getLanguageMovies('ta', 1, gId),
      getLanguageTV('hi', 1, gId),
      getLanguageTV('ml', 1, gId),
      getLanguageMovies('ko', 1, gId),
      getLanguageTV('ko', 1, gId),
      getLanguageMovies('ja', 1, gId),
      getLanguageTV('ja', 1, gId),
      getAnimeContent(1, true, gId),
      getAnimeContent(1, false, gId),
      getAnimatedMovies(1, gId)
    ]);
    
    return {
      trendingMovies: trending, trendingTV, topRated, regional,
      hindiMovies, malayalamMovies, tamilMovies,
      hindiTV, malayalamTV,
      koreanMovies, koreanTV,
      japaneseMovies, japaneseTV,
      animeMovies, animeShows, animatedMovies
    };
  } catch (error) {
    console.error("Error fetching discovery content:", error);
    // Return empty arrays on error
    return { trendingMovies: [], trendingTV: [], topRated: [], regional: [], hindiMovies: [], malayalamMovies: [], tamilMovies: [], hindiTV: [], malayalamTV: [], koreanMovies: [], koreanTV: [], japaneseMovies: [], japaneseTV: [], animeMovies: [], animeShows: [], animatedMovies: [] };
  }
};

// --- GENRES & DETAILS ---

// ✅ Restored getMovieGenres
export const getMovieGenres = async (id: number, mediaType: "movie" | "tv" = "movie"): Promise<{ id: number; name: string }[]> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}`);
    return data.genres || [];
  } catch (error) {
    return [];
  }
};

export const getTVShowSeasons = async (tvId: number): Promise<TMDBSeason[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}`);
    return data.seasons || [];
  } catch (error) { return []; }
};

export const getSeasonEpisodes = async (tvId: number, seasonNumber: number): Promise<TMDBEpisode[]> => {
  try {
    const data = await fetchWithCache(`/tv/${tvId}/season/${seasonNumber}`);
    return data.episodes || [];
  } catch (error) { return []; }
};

export const getSimilarMedia = async (id: number, mediaType: "movie" | "tv", page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${id}/similar`, { page });
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: mediaType }));
  } catch (error) { return []; }
};

// --- PERSON & SEARCH ---
export const getPersonDetails = async (personId: number): Promise<TMDBPerson> => {
  return await fetchWithCache(`/person/${personId}`);
};

export const getPersonCombinedCredits = async (personId: number): Promise<TMDBResult[]> => {
  const data = await fetchWithCache(`/person/${personId}/combined_credits`);
  const castItems = data.cast || [];
  return castItems.map((item: any) => ({
    ...formatBasicItemData(item),
    media_type: item.media_type || (item.title ? "movie" : "tv"),
    character: item.character || null
  }));
};

// ✅ NEW: Fetch Person Images for Gallery
export const getPersonImages = async (personId: number): Promise<TMDBImage[]> => {
  try {
    const data = await fetchWithCache(`/person/${personId}/images`);
    return data.profiles || [];
  } catch (error) {
    console.error("Error fetching person images:", error);
    return [];
  }
};

export const getMovieImages = async (movieId: number, mediaType: "movie" | "tv"): Promise<TMDBImage[]> => {
  try {
    const data = await fetchWithCache(`/${mediaType}/${movieId}/images`);
    // Combine posters and backdrops, prioritizing posters
    const images = [...(data.posters || []), ...(data.backdrops || [])];
    return images.slice(0, 20); // Limit to top 20 images
  } catch (error) {
    return [];
  }
};

export const searchTMDB = async (query: string, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/search/multi", { query, page });
    return data.results.map((item: any) => formatBasicItemData(item));
  } catch (error) { return []; }
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
  } catch (error) { return []; }
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
  } catch (error) { return []; }
};

// --- DETAILS HELPERS ---
const fetchCertification = async (id: number, mediaType: "movie" | "tv"): Promise<string | null> => {
  const endpoint = mediaType === "movie" ? `/movie/${id}/release_dates` : `/tv/${id}/content_ratings`;
  try {
    const data = await fetchWithCache(endpoint);
    const results = data.results || [];
    const usRelease = results.find((item: any) => item.iso_3166_1 === "US");
    if (mediaType === "movie") return usRelease?.release_dates?.[0]?.certification || null;
    return usRelease?.rating || null;
  } catch (error) { return null; }
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
  } catch (error) { return null; }
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
  } catch (error) { return null; }
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
  } catch (error) { return item; }
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
    throw error;
  }
};

export const fetchMoreContentByType = async (type: string, page: number = 1): Promise<TMDBResult[]> => {
  if (type.startsWith('genre/')) {
    const genreId = parseInt(type.split('/')[1]);
    return await getMoviesByGenre(genreId, page);
  }
  
  if (type.startsWith('similar/')) {
    const [mediaType, id] = type.split('/').slice(1);
    return await getSimilarMedia(parseInt(id), mediaType as "movie" | "tv", page);
  }

  switch (type.toLowerCase()) {
    case 'trendingmovies': return await getTrendingMovies(page);
    case 'trendingtv': return await getTrendingTV(page);
    case 'toprated': return await getTopRated(page);
    case 'regional': return await getRegionalMovies('IN', page);
    case 'hindimovies': return await getLanguageMovies('hi', page);
    case 'malayalammovies': return await getLanguageMovies('ml', page);
    case 'tamilmovies': return await getLanguageMovies('ta', page);
    case 'koreanmovies': return await getLanguageMovies('ko', page);
    case 'japanesemovies': return await getLanguageMovies('ja', page);
    case 'hinditv': return await getLanguageTV('hi', page);
    case 'malayalamtv': return await getLanguageTV('ml', page);
    case 'koreantv': return await getLanguageTV('ko', page);
    case 'japanesetv': return await getLanguageTV('ja', page);
    case 'animemovies': return await getAnimeContent(page, true);
    case 'animeshows': return await getAnimeContent(page, false);
    case 'animatedmovies': return await getAnimatedMovies(page);
    default:
      if (type.startsWith('search:')) {
        const query = type.substring(7);
        return await searchTMDB(query, page);
      }
      return await getTrendingMovies(page);
  }
};

export const getMoviesByGenre = async (genreId: number, page: number = 1): Promise<TMDBResult[]> => {
  try {
    const data = await fetchWithCache("/discover/movie", {
      with_genres: genreId,
      sort_by: "popularity.desc",
      page
    });
    return data.results.map((item: any) => ({ ...formatBasicItemData(item), media_type: "movie" }));
  } catch (error) { return []; }
};