const axios = require('axios');

async function getGiphyGif(searchTerm) {
  try {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GIPHY_API_KEY_HERE') {
      return getFallbackGif(searchTerm);
    }

    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: apiKey,
        q: searchTerm,
        limit: 20,
        rating: 'g'
      }
    });

    if (response.data.data && response.data.data.length > 0) {
      const randomIndex = Math.floor(Math.random() * response.data.data.length);
      return response.data.data[randomIndex].images.original.url;
    }

    return getFallbackGif(searchTerm);
  } catch (error) {
    console.error('Giphy API error:', error.message);
    return getFallbackGif(searchTerm);
  }
}

function getFallbackGif(searchTerm) {
  const fallbackGifs = {
    hug: 'https://media.giphy.com/media/3bqtLDeiDtwhq/giphy.gif',
    kiss: 'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
    pat: 'https://media.giphy.com/media/109ltuoSQT212w/giphy.gif',
    slap: 'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
    highfive: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    poke: 'https://media.giphy.com/media/pDn1909dT6nUQ/giphy.gif',
    wave: 'https://media.giphy.com/media/hvq8ONQhQ1XLq/giphy.gif',
    dance: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    cry: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif',
    laugh: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'
  };

  return fallbackGifs[searchTerm] || fallbackGifs.wave;
}

module.exports = { getGiphyGif };
