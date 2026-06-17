module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', sort = 'most_downloaded', page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const sortMap = { most_downloaded:'nb_downloads', newest:'creation_date', relevance:'relevance' };
  const order = sortMap[sort] || 'nb_downloads';
  const offset = (page - 1) * 24;

  const url = `https://stock.adobe.com/Rest/Media/1/Files?locale=en_US` +
    `&search_parameters[words]=${encodeURIComponent(q)}` +
    `&search_parameters[order]=${order}` +
    `&search_parameters[limit]=24` +
    `&search_parameters[offset]=${offset}` +
    `&search_parameters[filters][content_type:all]=1` +
    `&result_columns[]=id&result_columns[]=title&result_columns[]=thumbnail_url` +
    `&result_columns[]=nb_downloads&result_columns[]=creation_date` +
    `&result_columns[]=creator_name&result_columns[]=keywords` +
    `&result_columns[]=category&result_columns[]=detail_url`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://stock.adobe.com/',
        'Origin': 'https://stock.adobe.com',
        'x-api-key': 'AdobeStockClient1',
        'x-product': 'AdobeStock_Web/1.0',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      }
    });

    const text = await r.text();
    try {
      const data = JSON.parse(text);
      const total = data.nb_results || 0;
      return res.json({
        total,
        items: (data.files || []).map(f => ({
          id: f.id,
          title: f.title,
          thumbnail_url: f.thumbnail_url,
          nb_downloads: f.nb_downloads,
          upload_date: f.creation_date,
          author: f.creator_name,
          category: f.category?.name || '',
          keywords: (f.keywords || []).map(k => k.name),
          detail_url: f.detail_url || `https://stock.adobe.com/images/-/${f.id}`,
        }))
      });
    } catch(e) {
      return res.status(500).json({ error: 'Parse error', raw: text.slice(0, 200) });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
