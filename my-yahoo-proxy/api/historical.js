// Fichier : /api/historical.js
// Build V2.00

export default async function handler(request, response) {
  // Définir les en-têtes CORS pour chaque réponse
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { provider, ticker, ...params } = request.query;

  if (!provider || !ticker) {
    return response.status(400).json({ error: "Les paramètres 'provider' et 'ticker' sont requis." });
  }

  let targetUrl;
  const queryParams = new URLSearchParams();

  try {
    switch (provider) {
      case 'yahoo':
        if (!params.period1 || !params.period2) {
          return response.status(400).json({ error: "Pour Yahoo, 'period1' et 'period2' sont requis." });
        }
        targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${params.period1}&period2=${params.period2}&interval=1d&events=history`;
        break;

      case 'yahoo_search':
        targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}`;
        break;
        
      case 'eod_search':
        // Use the EOD API key from environment variables, or fallback to the 'demo' key.
        const eodSearchKey = process.env.EOD_API_KEY || 'demo';
        
        queryParams.append('api_token', eodSearchKey);
        queryParams.append('fmt', 'json'); // Ensure JSON format
        targetUrl = `https://eodhistoricaldata.com/api/search/${ticker}?${queryParams.toString()}`;
        break;

      default:
        return response.status(400).json({ error: `Fournisseur '${provider}' non supporté.` });
    }

    const apiResponse = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Erreur de l'API externe (${provider}): ${errorText}`);
      return response.status(apiResponse.status).send(errorText);
    }

    const data = await apiResponse.json();
    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return response.status(200).json(data);

  } catch (error) {
    console.error(`Erreur interne du proxy pour le provider '${provider}':`, error);
    return response.status(500).json({ error: `Erreur interne du proxy: ${error.message}` });
  }
}