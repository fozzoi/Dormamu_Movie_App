import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PROXY_URL || 'http://192.168.1.2:5000';

export const fetchPirateBayResults = async (query, category) => {
  try {
    const response = await axios.get(`${BASE_URL}/proxy`, {
      params: { q: query, cat: category },
    });
    return response.data;
  } catch (error) {
    console.error('PirateBay Error:', error);
    throw error;
  }
};
