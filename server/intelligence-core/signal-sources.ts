import { registerSignalSource, computeSignalVelocity, computeSignalAcceleration } from "./signal-ingestion";
import type { NormalizedSignalFeatures } from "./signal-ingestion";

const DEFAULT_FEATURES: NormalizedSignalFeatures = {
  velocity: 0,
  acceleration: 0,
  relativeDeviation: 0,
  anomalyZScore: 0,
  attentionDensityScore: 0,
};

function formatDate(date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

// ============================================================================
// 1. Wikipedia Pageviews (Layer 1 - Cultural Noise)
// ============================================================================

export function registerWikipediaSource(): void {
  registerSignalSource({
    name: "wikipedia_pageviews",
    layer: 1,
    updateFrequency: "daily",

    fetchFunction: async (keyword: string) => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(keyword)}/daily/${formatDate(start)}/${formatDate(end)}`;

        const response = await fetch(url, {
          headers: { "User-Agent": "VAS/1.0 (signal-sources)" },
        });

        if (!response.ok) {
          console.warn(`Wikipedia API returned ${response.status} for keyword: ${keyword}`);
          return null;
        }

        const data = await response.json();
        const items = data.items || [];
        return {
          dailyViews: items.map((item: any) => ({
            date: item.timestamp,
            views: item.views || 0,
          })),
        };
      } catch (error) {
        console.error("Wikipedia pageviews fetch error:", error);
        return null;
      }
    },

    normalizationFunction: (rawData: any): NormalizedSignalFeatures => {
      if (!rawData || !rawData.dailyViews || rawData.dailyViews.length < 2) {
        return { ...DEFAULT_FEATURES };
      }

      const views = rawData.dailyViews.map((d: any) => d.views);
      const timestamps = rawData.dailyViews.map((_: any, i: number) => {
        const date = new Date();
        date.setDate(date.getDate() - (rawData.dailyViews.length - 1 - i));
        return date;
      });

      const velocity = computeSignalVelocity(views, timestamps);
      const acceleration = computeSignalAcceleration(views, timestamps);

      const mean = views.reduce((s: number, v: number) => s + v, 0) / views.length;
      const stdDev = Math.sqrt(views.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / views.length);
      const latest = views[views.length - 1];
      const anomalyZScore = stdDev > 0 ? (latest - mean) / stdDev : 0;
      const relativeDeviation = mean > 0 ? (latest - mean) / mean : 0;

      const attentionDensityScore = Math.min(1, Math.abs(velocity) / (mean || 1));

      return { velocity, acceleration, relativeDeviation, anomalyZScore, attentionDensityScore };
    },

    featureExtractor: (rawData: any): Record<string, number> => {
      if (!rawData || !rawData.dailyViews || rawData.dailyViews.length < 2) {
        return { pageviewVelocity: 0, acceleration: 0, "7dayChange": 0, "30dayChange": 0 };
      }

      const views = rawData.dailyViews.map((d: any) => d.views);
      const timestamps = rawData.dailyViews.map((_: any, i: number) => {
        const date = new Date();
        date.setDate(date.getDate() - (rawData.dailyViews.length - 1 - i));
        return date;
      });

      const pageviewVelocity = computeSignalVelocity(views, timestamps);
      const acceleration = computeSignalAcceleration(views, timestamps);

      const last7 = views.slice(-7);
      const prev7 = views.slice(-14, -7);
      const avg7 = last7.reduce((s: number, v: number) => s + v, 0) / (last7.length || 1);
      const avgPrev7 = prev7.length > 0 ? prev7.reduce((s: number, v: number) => s + v, 0) / prev7.length : avg7;
      const sevenDayChange = avgPrev7 > 0 ? (avg7 - avgPrev7) / avgPrev7 : 0;

      const allAvg = views.reduce((s: number, v: number) => s + v, 0) / (views.length || 1);
      const thirtyDayChange = allAvg > 0 ? (views[views.length - 1] - allAvg) / allAvg : 0;

      return { pageviewVelocity, acceleration, "7dayChange": sevenDayChange, "30dayChange": thirtyDayChange };
    },
  });
}

// ============================================================================
// 2. Google Trends (Layer 2 - Search Intent)
// ============================================================================

export function registerGoogleTrendsSource(): void {
  registerSignalSource({
    name: "google_trends",
    layer: 2,
    updateFrequency: "daily",

    fetchFunction: async (_keyword: string) => {
      console.log("Google Trends requires unofficial API setup");
      return null;
    },

    normalizationFunction: (_rawData: any): NormalizedSignalFeatures => {
      return { ...DEFAULT_FEATURES };
    },

    featureExtractor: (_rawData: any): Record<string, number> => {
      return { trendScore: 0, interestOverTime: 0, relatedQueriesCount: 0 };
    },
  });
}

// ============================================================================
// 3. Reddit (Layer 1 - Cultural Noise)
// ============================================================================

export function registerRedditSource(): void {
  registerSignalSource({
    name: "reddit",
    layer: 1,
    updateFrequency: "hourly",

    fetchFunction: async (keyword: string) => {
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.warn("Reddit API keys not configured (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET). Returning mock data.");
        return { mock: true, posts: [], note: "Reddit API keys not configured" };
      }

      try {
        const authResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "VAS/1.0",
          },
          body: "grant_type=client_credentials",
        });

        if (!authResponse.ok) {
          console.warn(`Reddit auth failed with status ${authResponse.status}`);
          return { mock: true, posts: [], note: "Reddit auth failed" };
        }

        const authData = await authResponse.json();
        const accessToken = authData.access_token;

        const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&sort=new&limit=25`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": "VAS/1.0",
          },
        });

        if (!searchResponse.ok) {
          console.warn(`Reddit search failed with status ${searchResponse.status}`);
          return { mock: true, posts: [], note: "Reddit search failed" };
        }

        const searchData = await searchResponse.json();
        const posts = (searchData.data?.children || []).map((child: any) => ({
          title: child.data?.title,
          score: child.data?.score || 0,
          numComments: child.data?.num_comments || 0,
          createdUtc: child.data?.created_utc || 0,
          subreddit: child.data?.subreddit,
          upvoteRatio: child.data?.upvote_ratio || 0,
        }));

        return { mock: false, posts };
      } catch (error) {
        console.error("Reddit fetch error:", error);
        return { mock: true, posts: [], note: "Reddit fetch error" };
      }
    },

    normalizationFunction: (rawData: any): NormalizedSignalFeatures => {
      if (!rawData || rawData.mock || !rawData.posts || rawData.posts.length < 2) {
        return { ...DEFAULT_FEATURES };
      }

      const posts = rawData.posts;
      const scores = posts.map((p: any) => p.score);
      const comments = posts.map((p: any) => p.numComments);
      const timestamps = posts.map((p: any) => new Date(p.createdUtc * 1000));

      const velocity = computeSignalVelocity(scores, timestamps);
      const acceleration = computeSignalAcceleration(scores, timestamps);

      const meanScore = scores.reduce((s: number, v: number) => s + v, 0) / scores.length;
      const stdDev = Math.sqrt(scores.reduce((s: number, v: number) => s + Math.pow(v - meanScore, 2), 0) / scores.length);
      const latest = scores[scores.length - 1];
      const anomalyZScore = stdDev > 0 ? (latest - meanScore) / stdDev : 0;
      const relativeDeviation = meanScore > 0 ? (latest - meanScore) / meanScore : 0;

      const totalComments = comments.reduce((s: number, v: number) => s + v, 0);
      const attentionDensityScore = Math.min(1, (posts.length * totalComments) / 1000);

      return { velocity, acceleration, relativeDeviation, anomalyZScore, attentionDensityScore };
    },

    featureExtractor: (rawData: any): Record<string, number> => {
      if (!rawData || rawData.mock || !rawData.posts || rawData.posts.length < 2) {
        return { postVolumeVelocity: 0, upvoteVelocity: 0, commentVelocity: 0 };
      }

      const posts = rawData.posts;
      const scores = posts.map((p: any) => p.score);
      const comments = posts.map((p: any) => p.numComments);
      const timestamps = posts.map((p: any) => new Date(p.createdUtc * 1000));
      const volumes = posts.map((_: any, i: number) => i + 1);

      const postVolumeVelocity = computeSignalVelocity(volumes, timestamps);
      const upvoteVelocity = computeSignalVelocity(scores, timestamps);
      const commentVelocity = computeSignalVelocity(comments, timestamps);

      return { postVolumeVelocity, upvoteVelocity, commentVelocity };
    },
  });
}

// ============================================================================
// 4. GNews (Layer 1 - Cultural Noise)
// ============================================================================

export function registerGNewsSource(): void {
  registerSignalSource({
    name: "gnews",
    layer: 1,
    updateFrequency: "daily",

    fetchFunction: async (keyword: string) => {
      const apiKey = process.env.GNEWS_API_KEY;

      if (!apiKey) {
        console.warn("GNews API key not configured (GNEWS_API_KEY). Returning mock data.");
        return { mock: true, articles: [], note: "GNews API key not configured" };
      }

      try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(keyword)}&token=${apiKey}&lang=en&max=10`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`GNews API returned ${response.status}`);
          return { mock: true, articles: [], note: `GNews API error: ${response.status}` };
        }

        const data = await response.json();
        const articles = (data.articles || []).map((article: any) => ({
          title: article.title,
          description: article.description,
          publishedAt: article.publishedAt,
          source: article.source?.name,
          url: article.url,
        }));

        return { mock: false, articles };
      } catch (error) {
        console.error("GNews fetch error:", error);
        return { mock: true, articles: [], note: "GNews fetch error" };
      }
    },

    normalizationFunction: (rawData: any): NormalizedSignalFeatures => {
      if (!rawData || rawData.mock || !rawData.articles || rawData.articles.length < 2) {
        return { ...DEFAULT_FEATURES };
      }

      const articles = rawData.articles;
      const timestamps = articles
        .map((a: any) => new Date(a.publishedAt))
        .filter((d: Date) => !isNaN(d.getTime()));

      if (timestamps.length < 2) return { ...DEFAULT_FEATURES };

      const volumes = timestamps.map((_: any, i: number) => i + 1);
      const velocity = computeSignalVelocity(volumes, timestamps);
      const acceleration = computeSignalAcceleration(volumes, timestamps);

      const sentimentEstimate = articles.length / 10;
      const attentionDensityScore = Math.min(1, sentimentEstimate);

      return {
        velocity,
        acceleration,
        relativeDeviation: 0,
        anomalyZScore: 0,
        attentionDensityScore,
      };
    },

    featureExtractor: (rawData: any): Record<string, number> => {
      if (!rawData || rawData.mock || !rawData.articles) {
        return { articleFrequency: 0, sentimentPolarity: 0 };
      }

      const articles = rawData.articles;
      const articleFrequency = articles.length;

      let positiveWords = 0;
      let negativeWords = 0;
      const positiveTerms = ["good", "great", "best", "top", "rise", "gain", "surge", "growth", "positive", "success"];
      const negativeTerms = ["bad", "worst", "fall", "drop", "decline", "crisis", "fail", "loss", "negative", "crash"];

      for (const article of articles) {
        const text = ((article.title || "") + " " + (article.description || "")).toLowerCase();
        for (const term of positiveTerms) {
          if (text.includes(term)) positiveWords++;
        }
        for (const term of negativeTerms) {
          if (text.includes(term)) negativeWords++;
        }
      }

      const total = positiveWords + negativeWords;
      const sentimentPolarity = total > 0 ? (positiveWords - negativeWords) / total : 0;

      return { articleFrequency, sentimentPolarity };
    },
  });
}

// ============================================================================
// 5. YouTube (Layer 4 - Media Amplification)
// ============================================================================

export function registerYouTubeSource(): void {
  registerSignalSource({
    name: "youtube",
    layer: 4,
    updateFrequency: "daily",

    fetchFunction: async (keyword: string) => {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.warn("YouTube API key not configured (YOUTUBE_API_KEY). Returning mock data.");
        return { mock: true, videos: [], note: "YouTube API key not configured" };
      }

      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=date&maxResults=10&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`YouTube API returned ${response.status}`);
          return { mock: true, videos: [], note: `YouTube API error: ${response.status}` };
        }

        const data = await response.json();
        const videoIds = (data.items || []).map((item: any) => item.id?.videoId).filter(Boolean);

        if (videoIds.length === 0) {
          return { mock: false, videos: [] };
        }

        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=${apiKey}`;
        const statsResponse = await fetch(statsUrl);

        if (!statsResponse.ok) {
          return {
            mock: false,
            videos: (data.items || []).map((item: any) => ({
              videoId: item.id?.videoId,
              title: item.snippet?.title,
              publishedAt: item.snippet?.publishedAt,
              viewCount: 0,
              likeCount: 0,
              commentCount: 0,
            })),
          };
        }

        const statsData = await statsResponse.json();
        const videos = (statsData.items || []).map((item: any) => ({
          videoId: item.id,
          title: item.snippet?.title,
          publishedAt: item.snippet?.publishedAt,
          channelTitle: item.snippet?.channelTitle,
          viewCount: parseInt(item.statistics?.viewCount || "0", 10),
          likeCount: parseInt(item.statistics?.likeCount || "0", 10),
          commentCount: parseInt(item.statistics?.commentCount || "0", 10),
        }));

        return { mock: false, videos };
      } catch (error) {
        console.error("YouTube fetch error:", error);
        return { mock: true, videos: [], note: "YouTube fetch error" };
      }
    },

    normalizationFunction: (rawData: any): NormalizedSignalFeatures => {
      if (!rawData || rawData.mock || !rawData.videos || rawData.videos.length < 2) {
        return { ...DEFAULT_FEATURES };
      }

      const videos = rawData.videos;
      const views = videos.map((v: any) => v.viewCount);
      const timestamps = videos
        .map((v: any) => new Date(v.publishedAt))
        .filter((d: Date) => !isNaN(d.getTime()));

      if (timestamps.length < 2) return { ...DEFAULT_FEATURES };

      const velocity = computeSignalVelocity(views, timestamps);
      const acceleration = computeSignalAcceleration(views, timestamps);

      const meanViews = views.reduce((s: number, v: number) => s + v, 0) / views.length;
      const stdDev = Math.sqrt(views.reduce((s: number, v: number) => s + Math.pow(v - meanViews, 2), 0) / views.length);
      const latest = views[views.length - 1];
      const anomalyZScore = stdDev > 0 ? (latest - meanViews) / stdDev : 0;
      const relativeDeviation = meanViews > 0 ? (latest - meanViews) / meanViews : 0;

      const totalEngagement = videos.reduce((s: number, v: any) => s + v.likeCount + v.commentCount, 0);
      const attentionDensityScore = Math.min(1, totalEngagement / 10000);

      return { velocity, acceleration, relativeDeviation, anomalyZScore, attentionDensityScore };
    },

    featureExtractor: (rawData: any): Record<string, number> => {
      if (!rawData || rawData.mock || !rawData.videos || rawData.videos.length < 2) {
        return { viewVelocity: 0, engagementVelocity: 0, topicClustering: 0 };
      }

      const videos = rawData.videos;
      const views = videos.map((v: any) => v.viewCount);
      const engagements = videos.map((v: any) => v.likeCount + v.commentCount);
      const timestamps = videos
        .map((v: any) => new Date(v.publishedAt))
        .filter((d: Date) => !isNaN(d.getTime()));

      if (timestamps.length < 2) {
        return { viewVelocity: 0, engagementVelocity: 0, topicClustering: 0 };
      }

      const viewVelocity = computeSignalVelocity(views, timestamps);
      const engagementVelocity = computeSignalVelocity(engagements, timestamps);

      const channels = new Set(videos.map((v: any) => v.channelTitle).filter(Boolean));
      const topicClustering = channels.size > 0 ? videos.length / channels.size : 0;

      return { viewVelocity, engagementVelocity, topicClustering };
    },
  });
}

// ============================================================================
// 6. eBay (Layer 3 - Consideration Signals)
// ============================================================================

export function registerEBaySource(): void {
  registerSignalSource({
    name: "ebay",
    layer: 3,
    updateFrequency: "daily",

    fetchFunction: async (keyword: string) => {
      const apiKey = process.env.EBAY_API_KEY;

      if (!apiKey) {
        console.warn("eBay API key not configured (EBAY_API_KEY). Returning mock data.");
        return { mock: true, listings: [], note: "eBay API key not configured" };
      }

      try {
        const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${encodeURIComponent(apiKey)}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${encodeURIComponent(keyword)}&paginationInput.entriesPerPage=10&sortOrder=StartTimeNewest`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`eBay API returned ${response.status}`);
          return { mock: true, listings: [], note: `eBay API error: ${response.status}` };
        }

        const data = await response.json();
        const searchResult = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0];
        const items = searchResult?.item || [];

        const listings = items.map((item: any) => ({
          title: item.title?.[0],
          price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || "0"),
          bidCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || "0", 10),
          listingType: item.listingInfo?.[0]?.listingType?.[0],
          startTime: item.listingInfo?.[0]?.startTime?.[0],
          endTime: item.listingInfo?.[0]?.endTime?.[0],
        }));

        return { mock: false, listings };
      } catch (error) {
        console.error("eBay fetch error:", error);
        return { mock: true, listings: [], note: "eBay fetch error" };
      }
    },

    normalizationFunction: (rawData: any): NormalizedSignalFeatures => {
      if (!rawData || rawData.mock || !rawData.listings || rawData.listings.length < 2) {
        return { ...DEFAULT_FEATURES };
      }

      const listings = rawData.listings;
      const prices = listings.map((l: any) => l.price);
      const timestamps = listings
        .map((l: any) => new Date(l.startTime))
        .filter((d: Date) => !isNaN(d.getTime()));

      if (timestamps.length < 2) return { ...DEFAULT_FEATURES };

      const velocity = computeSignalVelocity(prices, timestamps);
      const acceleration = computeSignalAcceleration(prices, timestamps);

      const meanPrice = prices.reduce((s: number, v: number) => s + v, 0) / prices.length;
      const latest = prices[prices.length - 1];
      const relativeDeviation = meanPrice > 0 ? (latest - meanPrice) / meanPrice : 0;

      const totalBids = listings.reduce((s: number, l: any) => s + l.bidCount, 0);
      const attentionDensityScore = Math.min(1, totalBids / 100);

      return { velocity, acceleration, relativeDeviation, anomalyZScore: 0, attentionDensityScore };
    },

    featureExtractor: (rawData: any): Record<string, number> => {
      if (!rawData || rawData.mock || !rawData.listings || rawData.listings.length < 2) {
        return { listingFrequency: 0, bidDensity: 0, priceMovement: 0 };
      }

      const listings = rawData.listings;
      const listingFrequency = listings.length;

      const totalBids = listings.reduce((s: number, l: any) => s + l.bidCount, 0);
      const bidDensity = listings.length > 0 ? totalBids / listings.length : 0;

      const prices = listings.map((l: any) => l.price).filter((p: number) => p > 0);
      let priceMovement = 0;
      if (prices.length >= 2) {
        const first = prices[0];
        const last = prices[prices.length - 1];
        priceMovement = first > 0 ? (last - first) / first : 0;
      }

      return { listingFrequency, bidDensity, priceMovement };
    },
  });
}

// ============================================================================
// Register All Signal Sources
// ============================================================================

export function registerAllSignalSources(): void {
  registerWikipediaSource();
  registerGoogleTrendsSource();
  registerRedditSource();
  registerGNewsSource();
  registerYouTubeSource();
  registerEBaySource();
  console.log("All signal sources registered successfully.");
}
