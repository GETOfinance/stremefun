import { Token } from "@/app/types/token";
import { fetchTokensData, fetchPoolData } from "@/app/lib/geckoterminal";
import { enrichTokenWithMarketData } from "@/app/lib/mockTokens";

export type CreatorProfile = NonNullable<Token["creator"]>;

export async function fetchTokensFromStreme(): Promise<Token[]> {
  try {
    const response = await fetch("https://api.stremefun.ai/api/tokens", {
      cache: "no-store",
    });
    const tokens = await response.json();
    // Return the tokens array directly if it's not wrapped in data
    return Array.isArray(tokens) ? tokens : tokens.data || [];
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }
}

export async function fetchCreatorProfiles(
  creatorIds: string[]
): Promise<Record<string, CreatorProfile>> {
  if (creatorIds.length === 0) return {};

  const batchSize = 50;
  const profiles: Record<string, CreatorProfile> = {};

  // Process creatorIds in batches of 50
  for (let i = 0; i < creatorIds.length; i += batchSize) {
    const batchIds = creatorIds.slice(i, i + batchSize);

    try {
      const profileResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/api/fetchFarcasterProfile?userIds=${batchIds.join(",")}`,
        { method: "GET" }
      );
      const profileData = await profileResponse.json();

      // Merge the batch results into the profiles object
      const batchProfiles =
        profileData.data?.Socials?.Social?.reduce(
          (
            acc: Record<string, CreatorProfile>,
            social: {
              userId: string;
              profileImage: string;
              profileName: string;
            }
          ) => {
            acc[social.userId] = {
              profileImage: social.profileImage,
              name: social.profileName,
              score: 0,
              recasts: 0,
              likes: 0,
            };
            return acc;
          },
          {}
        ) ?? {};

      Object.assign(profiles, batchProfiles);
    } catch (error) {
      console.error(
        `Error fetching profiles batch ${i}-${i + batchSize}:`,
        error
      );
    }
  }

  return profiles;
}

type EnrichedToken = Omit<Token, "creator"> & {
  creator?: {
    name: string;
    score: number;
    recasts: number;
    likes: number;
    profileImage: string;
  };
};

export async function enrichTokensWithData(
  tokens: Token[],
  creatorProfiles: Record<string, CreatorProfile>,
  includeMarketData: boolean = false
): Promise<EnrichedToken[]> {
  if (!Array.isArray(tokens)) {
    console.error("Expected tokens array, got:", tokens);
    return [];
  }

  let enrichedTokens = tokens.map((token) => ({
    ...token,
    creator:
      token.requestor_fid && creatorProfiles[token.requestor_fid]
        ? {
            name: creatorProfiles[token.requestor_fid].name || "Unknown",
            score: 0,
            recasts: 0,
            likes: 0,
            profileImage: creatorProfiles[token.requestor_fid].profileImage,
          }
        : undefined,
  })) as EnrichedToken[];

  // Only fetch market data if explicitly requested
  if (includeMarketData) {
    const addresses = tokens.map((t) => t.contract_address);
    const geckoData = await fetchTokensData(addresses);
    const poolDataPromises = tokens.map((token) =>
      token.pool_address ? fetchPoolData(token.pool_address) : null
    );
    const poolData = await Promise.all(poolDataPromises);

    enrichedTokens = await Promise.all(
      enrichedTokens.map(async (token, index) => {
        const enrichedToken = await enrichTokenWithMarketData(token, geckoData);
        if (poolData[index]) {
          const pool = poolData[index];
          enrichedToken.price = enrichedToken.price ?? pool?.price;
          enrichedToken.change1h = enrichedToken.change1h ?? pool?.change1h;
          enrichedToken.change24h = enrichedToken.change24h ?? pool?.change24h;
          enrichedToken.volume24h = enrichedToken.volume24h ?? pool?.volume24h;
          enrichedToken.marketCap = enrichedToken.marketCap ?? pool?.marketCap;
        }
        return enrichedToken;
      })
    );
  }

  return enrichedTokens;
}

export async function fetchTokenFromStreme(
  address: string
): Promise<Token | null> {
  if (!address) {
    console.error("No address provided to fetchTokenFromStreme");
    return null;
  }

  try {
    const normalizedAddress = address.toLowerCase();
    console.log("Fetching token data for:", normalizedAddress);
    const response = await fetch(
      `https://api.stremefun.ai/token/${normalizedAddress}`,
      {
        cache: "no-store",
      }
    );

    const tokenJson = await response.json();
    console.log("Raw token response:", tokenJson);

    if (
      !response.ok ||
      tokenJson.message === "No such document!" ||
      tokenJson.errors
    ) {
      console.error("Token fetch failed:", {
        status: response.status,
        data: tokenJson,
      });
      return null;
    }

    // Check if we have actual token data
    const token = tokenJson.data ? tokenJson.data : tokenJson;
    if (!token.contract_address) {
      console.error("Invalid token data received:", token);
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
}
