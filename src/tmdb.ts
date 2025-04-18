import axios from "axios";
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const TMDB_API_KEY = "7d3f7aa3d3623c924b57a28243c4e84e";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

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
  certification?: string; // Certification field
  cast?: string[]; // Added cast field
}

// Fetch certification helper
const fetchCertification = async (id: number, mediaType: "movie" | "tv"): Promise<string | null> => {
  try {
    if (mediaType === "movie") {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}/release_dates`, {
        params: { api_key: TMDB_API_KEY },
      });
      const results = response.data.results || [];
      const usRelease = results.find((item: any) => item.iso_3166_1 === "US");
      const certification = usRelease?.release_dates?.[0]?.certification;
      return certification || null;
    } else if (mediaType === "tv") {
      const response = await axios.get(`${TMDB_BASE_URL}/tv/${id}/content_ratings`, {
        params: { api_key: TMDB_API_KEY },
      });
      const results = response.data.results || [];
      const usRating = results.find((item: any) => item.iso_3166_1 === "US");
      const certification = usRating?.rating;
      return certification || null;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Certification not found for ${mediaType} with ID ${id}`);
      return null;
    }
    console.error(`Error fetching certification for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// Fetch cast helper
const fetchCast = async (id: number, mediaType: "movie" | "tv"): Promise<string[] | null> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/${mediaType}/${id}/credits`, {
      params: { api_key: TMDB_API_KEY },
    });
    const cast = response.data.cast?.slice(0, 10).map((member: any) => member.name) || [];
    return cast.length > 0 ? cast : null;
  } catch (error) {
    console.error(`Error fetching cast for ${mediaType} with ID ${id}:`, error);
    return null;
  }
};

// Basic multi-search (existing function)
export const searchTMDB = async (query: string): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: {
        api_key: TMDB_API_KEY,
        query,
      },
    });
    const results = response.data.results.map(async (item: any) => ({
      id: item.id,
      title: item.title || item.name,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: parseFloat(item.vote_average?.toFixed(1)) || 0,
      media_type: item.media_type,
      release_date: item.release_date || null,
      first_air_date: item.first_air_date || null,
      certification: await fetchCertification(item.id, item.media_type), // Fetch certification
      cast: await fetchCast(item.id, item.media_type), // Fetch cast
    }));
    return Promise.all(results);
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    throw new Error("Failed to fetch data from TMDB.");
  }
};

// Helper to get poster image URL
export const getImageUrl = (path: string | null, size: string = "w500"): string => {
  if (!path) return "https://via.placeholder.com/500x750?text=No+Image";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Fetch trending movies (weekly)
export const getTrendingMovies = async (): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
      params: { api_key: TMDB_API_KEY },
    });
    const movies = response.data.results.map(async (item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: parseFloat(item.vote_average?.toFixed(1)) || 0,
      media_type: "movie",
      release_date: item.release_date || null,
      first_air_date: item.first_air_date || null,
      certification: await fetchCertification(item.id, "movie"), // Fetch certification
      cast: await fetchCast(item.id, "movie"), // Fetch cast
    }));
    return Promise.all(movies);
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    throw new Error("Failed to fetch trending movies.");
  }
};

// Fetch trending TV shows (weekly)
export const getTrendingTV = async (): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
      params: { api_key: TMDB_API_KEY },
    });
    const tvShows = response.data.results.map(async (item: any) => ({
      id: item.id,
      name: item.name,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: parseFloat(item.vote_average?.toFixed(1)) || 0,
      media_type: "tv",
      release_date: item.release_date || null,
      first_air_date: item.first_air_date || null,
      certification: await fetchCertification(item.id, "tv"), // Fetch certification
      cast: await fetchCast(item.id, "tv"), // Fetch cast
    }));
    return Promise.all(tvShows);
  } catch (error) {
    console.error("Error fetching trending TV:", error);
    throw new Error("Failed to fetch trending TV shows.");
  }
};

// Fetch top rated movies
export const getTopRated = async (): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
      params: { api_key: TMDB_API_KEY },
    });
    const movies = response.data.results.map(async (item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: parseFloat(item.vote_average?.toFixed(1)) || 0,
      media_type: "movie",
      release_date: item.release_date || null,
      first_air_date: item.first_air_date || null,
      certification: await fetchCertification(item.id, "movie"), // Fetch certification
      cast: await fetchCast(item.id, "movie"), // Fetch cast
    }));
    return Promise.all(movies);
  } catch (error) {
    console.error("Error fetching top rated movies:", error);
    throw new Error("Failed to fetch top rated movies.");
  }
};

// Fetch regional movies (example: region code 'IN' for India)
export const getRegionalMovies = async (region: string): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        region,
        sort_by: "popularity.desc",
      },
    });
    const movies = response.data.results.map(async (item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: parseFloat(item.vote_average?.toFixed(1)) || 0,
      media_type: "movie",
      release_date: item.release_date || null,
      first_air_date: item.first_air_date || null,
      certification: await fetchCertification(item.id, "movie"), // Fetch certification
      cast: await fetchCast(item.id, "movie"), // Fetch cast
    }));
    return Promise.all(movies);
  } catch (error) {
    console.error(`Error fetching regional movies for region ${region}:`, error);
    throw new Error("Failed to fetch regional movies.");
  }
};
