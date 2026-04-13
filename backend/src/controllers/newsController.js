import { config } from '../config.js';
import { cacheUtil } from '../utils/cache.js';

export async function newsController(_,res) {
    try {
        console.log("News Controller Running!");
        const cacheKey = `news_overview`;
        const cached = cacheUtil.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        
        let fetchUrl = `https://gnews.io/api/v4/top-headlines?category=business&lang=en&apikey=${config.gnewsApiKey}`;
        
        if (config.gnewsApiKey.includes("your-api-key-here")) {
             console.log("[GNews API] Detected dummy API key. Utilizing Finnhub backup route.");
             fetchUrl = `https://finnhub.io/api/v1/news?category=general&token=${config.finnhubApiKey}`;
        }
        
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        console.log("[GNews API] Fetched payload. Success:", response.ok, "Status:", response.status);
        
        if (data && data.articles) {
            cacheUtil.set(cacheKey, data.articles, 600);
            return res.status(200).json(data.articles);
        } else if (Array.isArray(data)) {
            cacheUtil.set(cacheKey, data, 600);
            return res.status(200).json(data);
        }
        
        console.log("[GNews API] Payload didn't match expected array/articles shape. Returning fallback.");
        return res.status(200).json([]);
    } catch (error) {
        console.error("[GNews API] Critical Fetch Error:", error.message);
        return res.status(200).json([]);
    }
}