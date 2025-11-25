/**
 * Topiary Park Living - Data Integration
 * Connects to Airtable API to populate dynamic content.
 */

// Use process.env if available (for build steps), otherwise fall back to the provided key for the prototype.
const AIRTABLE_ACCESS_TOKEN = (typeof process !== 'undefined' && process.env && process.env.AIRTABLE_API_KEY) || 'YOpat10ThdOCSzePeTp.d07f7ca0ea5ab5556b1b1890aaa0fd2658a27b8bb911b4d3a8305045e9830d12';
const BASE_ID = 'appd7mB2vELacH4Fh';
const PRICING_TABLE_ID = 'tbliVrYxBgWFJ3AF1';
const FAQ_TABLE_ID = 'tblkfsPmorGvt1o2q';

const pricingContainer = document.getElementById('pricing-table-container');
const faqContainer = document.getElementById('faq-accordion-container');
const mapContainer = document.getElementById('map-container');

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Loading State
const showLoading = (element) => {
    element.innerHTML = `
        <div class="flex justify-center items-center h-full w-full py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-3 text-secondary font-medium">Loading details...</span>
        </div>
    `;
};

// Error State
const showError = (element) => {
    element.innerHTML = `
        <div class="text-center py-8">
            <p class="text-red-600 font-medium">Unable to load current rates.</p>
            <p class="text-secondary text-sm mt-1">Please contact us for current rates.</p>
        </div>
    `;
};

/**
 * Fetch and Render Pricing
 */
async function fetchPricing() {
    if (!pricingContainer) return;
    showLoading(pricingContainer);

    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PRICING_TABLE_ID}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch pricing');

        const data = await response.json();
        const records = data.records;

        if (records.length === 0) {
            pricingContainer.innerHTML = '<p class="text-center text-secondary py-4">No availability at this time.</p>';
            return;
        }

        // Build Table HTML
        let tableHTML = `
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="py-3 px-4 font-serif font-bold text-primary">Unit Type</th>
                            <th class="py-3 px-4 font-serif font-bold text-primary">Price</th>
                            <th class="py-3 px-4 font-serif font-bold text-primary">Availability</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        records.forEach(record => {
            const fields = record.fields;
            // Fallback for missing fields
            const unitName = fields['Unit Name'] || fields['Name'] || 'Apartment';
            const price = fields['Current Price'] ? formatCurrency(fields['Current Price']) : 'Call for pricing';
            const promotion = fields['Promotions'];

            tableHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 text-secondary font-medium">${unitName}</td>
                    <td class="py-3 px-4 text-secondary">
                        <span class="font-bold text-primary">${price}</span>
                        ${promotion ? `<span class="ml-2 inline-block bg-accent text-white text-xs px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">${promotion}</span>` : ''}
                    </td>
                    <td class="py-3 px-4 text-secondary text-sm">Available Now</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        pricingContainer.innerHTML = tableHTML;
        pricingContainer.classList.remove('h-64', 'flex', 'items-center', 'justify-center'); // Remove placeholder styling classes

        // Collect Pricing Data for Schema
        const pricingData = records.map(record => {
            let rawPrice = record.fields['Current Price'];
            // Ensure we have a clean number (strip '$' and ',')
            if (typeof rawPrice === 'string') {
                rawPrice = parseFloat(rawPrice.replace(/[$,]/g, ''));
            }
            return { price: rawPrice };
        }).filter(item => !isNaN(item.price) && item.price !== null);

        updateSchema(pricingData, null);

    } catch (error) {
        console.error('Pricing Fetch Error:', error);
        showError(pricingContainer);
    }
}

/**
 * Fetch and Render FAQ
 */
async function fetchFAQ() {
    if (!faqContainer) return;
    showLoading(faqContainer);

    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${FAQ_TABLE_ID}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch FAQ');

        const data = await response.json();
        const records = data.records;

        if (records.length === 0) {
            faqContainer.innerHTML = '<p class="text-center text-secondary py-4">No FAQs available.</p>';
            return;
        }

        let accordionHTML = '<div class="space-y-4 w-full">';

        records.forEach((record, index) => {
            const fields = record.fields;
            const question = fields['Question'] || 'Question';
            const answer = fields['Answer'] || 'Answer';
            const id = `faq-${index}`;

            accordionHTML += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <button class="w-full flex justify-between items-center p-4 bg-white hover:bg-gray-50 transition-colors text-left focus:outline-none" onclick="toggleAccordion('${id}')">
                        <span class="font-serif font-bold text-primary text-lg">${question}</span>
                        <svg id="icon-${id}" class="w-5 h-5 text-primary transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div id="${id}" class="hidden bg-gray-50 p-4 border-t border-gray-100 text-secondary leading-relaxed prose max-w-none">
                        ${answer}
                    </div>
                </div>
            `;
        });

        accordionHTML += '</div>';

        faqContainer.innerHTML = accordionHTML;
        faqContainer.classList.remove('min-h-[200px]', 'flex', 'items-center', 'justify-center'); // Remove placeholder styling

        // Collect FAQ data for Schema
        const faqData = records.map(record => ({
            question: record.fields['Question'] || 'Question',
            answer: record.fields['Answer'] || 'Answer'
        }));

        // Trigger Schema Update (pass null for pricing since we don't have it here, or handle global state)
        // Better approach: Store in global variables and call updateSchema when both might be ready or independently.
        // For simplicity, we'll update what we have.
        updateSchema(null, faqData);

    } catch (error) {
        console.error('FAQ Fetch Error:', error);
        showError(faqContainer);
    }
}

// Accordion Toggle Function (Global)
window.toggleAccordion = (id) => {
    const content = document.getElementById(id);
    const icon = document.getElementById(`icon-${id}`);

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
};

/**
 * Initialize Map
 */
function initMap() {
    if (!mapContainer) return;

    // Google Maps Embed Iframe
    // Centered on Topiary Park, Columbus
    const mapSrc = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3058.6266395568847!2d-82.99083368461834!3d39.9611669794205!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x883888c8c8c8c8c9%3A0x8c8c8c8c8c8c8c8c!2sTopiary%20Park!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus";

    // Custom Filter for Brand Alignment
    // grayscale(100%) invert(92%) sepia(6%) saturate(1000%) hue-rotate(70deg)
    const mapHTML = `
        <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3058.630467768475!2d-82.9910629235288!3d39.96108698396264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x883888cb9664673b%3A0x8a9a8a8a8a8a8a8a!2sTopiary%20Park!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
            width="100%" 
            height="100%" 
            style="border:0; filter: grayscale(100%) invert(92%) sepia(6%) saturate(1000%) hue-rotate(70deg);" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade">
        </iframe>
    `;

    mapContainer.innerHTML = mapHTML;
    // Remove the placeholder styling and overlay
    mapContainer.classList.remove('bg-gray-200', 'flex', 'items-center', 'justify-center');
    // We keep the relative positioning for the overlay if we want to keep it, but the new map should probably take over.
    // The HTML has a mix-blend-multiply overlay div inside the container. 
    // We are replacing the innerHTML, so that overlay will be gone unless we put it back.
    // The user asked for the filter on the map itself, so we might not need the overlay div anymore.
}

/**
 * Dynamic Schema Injection (Entity Graph Strategy)
 */
let globalPricingData = [];
let globalFaqData = [];

function updateSchema(newPricingData, newFaqData) {
    if (newPricingData) globalPricingData = newPricingData;
    if (newFaqData) globalFaqData = newFaqData;

    // 1. Offer Schema (Aggregate Offer)
    if (globalPricingData.length > 0) {
        const prices = globalPricingData.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const offerSchema = {
            "@context": "https://schema.org",
            "@type": "Offer",
            "priceCurrency": "USD",
            "lowPrice": minPrice,
            "highPrice": maxPrice,
            "offerCount": globalPricingData.length,
            "availability": "https://schema.org/InStock"
        };

        injectJsonLd(offerSchema, 'dynamic-offer-schema');
    }

    // 2. FAQPage Schema
    if (globalFaqData.length > 0) {
        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": globalFaqData.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer // Note: HTML in answer is allowed by Google but should be clean
                }
            }))
        };

        injectJsonLd(faqSchema, 'dynamic-faq-schema');
    }
}

function injectJsonLd(schemaData, scriptId) {
    let script = document.getElementById(scriptId);
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Only fetch if API key is set
    if (AIRTABLE_ACCESS_TOKEN && AIRTABLE_ACCESS_TOKEN !== 'YOUR_KEY_HERE') {
        fetchPricing();
        fetchFAQ();
    } else {
        console.warn('Airtable Access Token is missing. Please set AIRTABLE_ACCESS_TOKEN in src/js/app.js or use a .env file.');
        showError(pricingContainer);
        showError(faqContainer);
    }

    // Initialize Map
    initMap();
});
