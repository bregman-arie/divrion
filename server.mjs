import http from 'node:http';
import { createServer as createViteServer } from 'vite';

const port = Number(process.env.PORT || 5173);
const model = process.env.OPENAI_MODEL || 'gpt-5.6';

const sendJson = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const enrichmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['updates'],
  properties: {
    updates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['portfolioId', 'symbol', 'annualDividendPerShare', 'trailingYieldPercent', 'sourceName', 'sourceUrl', 'confidence', 'note'],
        properties: {
          portfolioId: { type: 'string' },
          symbol: { type: 'string' },
          annualDividendPerShare: { type: ['number', 'null'] },
          trailingYieldPercent: { type: ['number', 'null'] },
          sourceName: { type: ['string', 'null'] },
          sourceUrl: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
          note: { type: 'string' },
        },
      },
    },
  },
};

const enrich = async holdings => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      input: `Research trailing cash dividends for these portfolio holdings: ${JSON.stringify(holdings)}. Use primary sources whenever possible: issuer investor-relations pages, fund sponsor pages, SEC filings, or exchange notices. Do not invent data. For each holding, return annualDividendPerShare as the sum of cash distributions over the latest trailing 12 months, and trailingYieldPercent when it can be verified from the current or cited price. If evidence is unavailable or the symbol is unsupported, return null values and explain why. Every non-null value must have a direct source URL and a concise note.`,
      text: { format: { type: 'json_schema', name: 'portfolio_dividend_enrichment', strict: true, schema: enrichmentSchema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI enrichment failed (${response.status}).`);
  const result = await response.json();
  return JSON.parse(result.output_text || '{"updates":[]}');
};

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
http.createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/ai-enrich') {
    let payload = '';
    request.on('data', chunk => { payload += chunk; });
    request.on('end', async () => {
      try {
        const { holdings } = JSON.parse(payload);
        if (!Array.isArray(holdings) || !holdings.length) return sendJson(response, 400, { error: 'At least one holding is required.' });
        if (holdings.length > 50) return sendJson(response, 400, { error: 'Enrich up to 50 holdings at a time.' });
        sendJson(response, 200, await enrich(holdings));
      } catch (error) { sendJson(response, 500, { error: error.message || 'Unable to enrich holdings.' }); }
    });
    return;
  }
  vite.middlewares(request, response, error => {
    if (error) { response.statusCode = 500; response.end(error.message); }
  });
}).listen(port, () => console.log(`Divrion running at http://localhost:${port}`));
