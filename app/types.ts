export interface SeriesEpisode {
  season: number;
  episode: number;
  url: string;
  quality: string;
  size: string;
}

export interface SeriesInfo {
  name: string;
  seasons: {
    [season: number]: {
      [episode: number]: {
        [quality: string]: SeriesEpisode;
      }
    }
  };
  totalEpisodes: number;
  qualities: string[];
}

export default {};
