const axios = require('axios');

exports.handler = async function(event, context) {
  const apiKey = '78CA1D0236874D76AC9288FFA0267CA3';
  const location = 'Sheffield';
  const url = `https://api.tripadvisor.com/api/partner/2.0/hotels/search?location=${location}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching data from TripAdvisor API' }),
    };
  }
};
