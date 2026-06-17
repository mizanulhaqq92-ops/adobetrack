const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { creator_id = '', sort = 'nb_downloads', page = 1, type = 'all' } = req.query;
  if (!creator_id) return res.status(400).json({ error: 'creator_id required' });

  const sortMap = {
    most_downloaded: 'nb_downloads',
    newest: 'creation_date',
    relevance: 'relevance',
    featured: 'featured',
    undiscovered: 'undiscovered',
  };
  const order = sortMap[sort] || 'nb_downloads';

  const typeMap = {
    all: 1,
    photos: 1,
    vectors: 3,
    illustrations: 2,
    videos: 4,
  };
  const contentType = typeMap[type] || 1;

  const url = `https://stock.adobe.com/Rest/Media/1/Files?locale=en_US&search_parameters[creator_id]=${creator_id}&search_parameters[order]=${order}&search_parameters[limit]=24&search_parameters[offset]=${(page - 1) * 24}&search_parameters[filters][content_type:${type === 'all' ? 'all' : type}]=1&result_columns[]=id&result_columns[]=title&result_columns[]=thumbnail_url&result_columns[]=nb_downloads&result_columns[]=creation_date&result_columns[]=creator_name&result_columns[]=keywords&result_columns[]=category&result_columns[]=content_type_label&result_columns[]=detail_url`;

  try {
    const r = await fetch(url, {
      headers: {
        'x-api-key': 'AdobeStockClient1',
        'x-product': 'AdobeStock_Web/1.0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://stock.adobe.com',
        'Referer': 'https://stock.adobe.com/',
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Adobe Stock error: ${r.status}`, detail: text });
    }

    const data = await r.json();
    const total = data.nb_results || 0;
    return res.json({
      total,
      pages: Math.ceil(total / 24),
      contributor_name: data.files?.[0]?.creator_name || '',
      items: (data.files || []).map(f => ({
        id: f.id,
        title: f.title,
        thumbnail_url: f.thumbnail_url,
        nb_downloads: f.nb_downloads,
        upload_date: f.creation_date,
        author: f.creator_name,
        category: f.category?.name || '',
        keywords: (f.keywords || []).map(k => k.name),
        content_type: f.content_type_label || '',
        detail_url: f.detail_url || `https://stock.adobe.com/images/-/${f.id}`,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
