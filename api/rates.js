/**
 * Vercel Serverless Function - Airtable Proxy
 * Securely fetches pricing and FAQ data from Airtable
 */

export default async function handler(request, response) {
    // Set CORS headers
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Content-Type', 'application/json');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = 'appd7mB2vELacH4Fh';
    const PRICING_TABLE_ID = 'tbliVrYxBgWFJ3AF1';
    const FAQ_TABLE_ID = 'tblkfsPmorGvt1o2q';

    if (!AIRTABLE_API_KEY) {
        return response.status(500).json({
            error: 'Server configuration error',
            message: 'Airtable API key not configured'
        });
    }

    try {
        // Fetch both tables in parallel
        const [pricingResponse, faqResponse] = await Promise.all([
            fetch(`https://api.airtable.com/v0/${BASE_ID}/${PRICING_TABLE_ID}`, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`
                }
            }),
            fetch(`https://api.airtable.com/v0/${BASE_ID}/${FAQ_TABLE_ID}`, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`
                }
            })
        ]);

        // Check if both requests were successful
        if (!pricingResponse.ok || !faqResponse.ok) {
            throw new Error('Failed to fetch data from Airtable');
        }

        const pricingData = await pricingResponse.json();
        const faqData = await faqResponse.json();

        // Return combined data
        return response.status(200).json({
            pricing: pricingData.records || [],
            faq: faqData.records || []
        });

    } catch (error) {
        console.error('Airtable API Error:', error);
        return response.status(500).json({
            error: 'Failed to fetch data',
            message: error.message
        });
    }
}
