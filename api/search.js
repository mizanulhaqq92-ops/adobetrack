module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', sort = 'most_downloaded', page = 1, type = 'all' } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const sortMap = { most_downloaded:'nb_downloads', newest:'creation_date', relevance:'relevance', featured:'featured', undiscovered:'undiscovered' };
  const order = sortMap[sort] || 'nb_downloads';
  const offset = (parseInt(page)-1)*24;
  const typeMap = { all:'all', photos:'photo', vectors:'vector', illustrations:'illustration', videos:'video' };
  const contentType = typeMap[type] || 'all';

  const url = `https://stock.adobe.com/Rest/Media/1/Files?locale=en_US&search_parameters[words]=${encodeURIComponent(q)}&search_parameters[order]=${order}&search_parameters[limit]=24&search_parameters[offset]=${offset}&search_parameters[filters][content_type:${contentType}]=1&result_columns[]=id&result_columns[]=title&result_columns[]=thumbnail_url&result_columns[]=nb_downloads&result_columns[]=creation_date&result_columns[]=creator_name&result_columns[]=keywords&result_columns[]=category&result_columns[]=content_type_label&result_columns[]=detail_url`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://stock.adobe.com',
        'Referer': 'https://stock.adobe.com/search?k=' + encodeURIComponent(q),
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-api-key': 'AdobeStockClient1',
        'x-product': 'AdobeStock_Web/1.0',
        'x-requested-with': 'XMLHttpRequest',
      }
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e) { return res.status(500).json({ error: 'Blocked', detail: text.slice(0,300) }); }
    const total = data.nb_results || 0;
    return res.json({ total, pages: Math.ceil(total/24), items: (data.files||[]).map(f=>({ id:f.id, title:f.title, thumbnail_url:f.thumbnail_url, nb_downloads:f.nb_downloads, upload_date:f.creation_date, author:f.creator_name, category:f.category?.name||'', keywords:(f.keywords||[]).map(k=>k.name), content_type:f.content_type_label||'', detail_url:f.detail_url||`https://stock.adobe.com/images/-/${f.id}` })) });
  } catch(e) { return res.status(500).json({ error: e.message }); }
};
