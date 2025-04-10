import axios from "axios";

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
}

// Basic multi-search (existing function)
export const searchTMDB = async (query: string): Promise<TMDBResult[]> => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: {
        api_key: TMDB_API_KEY,
        query,
      },
    });
    return response.data.results.map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: item.vote_average || 0,
      media_type: item.media_type,
    }));
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
    return response.data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: item.vote_average || 0,
      media_type: "movie",
    }));
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
    return response.data.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: item.vote_average || 0,
      media_type: "tv",
    }));
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
    return response.data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: item.vote_average || 0,
      media_type: "movie",
    }));
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
    return response.data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      overview: item.overview || "No description available.",
      poster_path: item.poster_path,
      vote_average: item.vote_average || 0,
      media_type: "movie",
    }));
  } catch (error) {
    console.error(`Error fetching regional movies for region ${region}:`, error);
    throw new Error("Failed to fetch regional movies.");
  }
};
