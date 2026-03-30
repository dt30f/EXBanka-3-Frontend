import api from './client'
import type {
  ExchangeItem,
  ListingHistoryItem,
  ListingItem,
  PortfolioOverview,
} from './market'

export const employeeMarketApi = {
  listExchanges: () => api.get<{ exchanges: ExchangeItem[]; count: number }>('/exchanges'),
  listListings: (q = '') =>
    api.get<{ listings: ListingItem[]; count: number; query: string }>('/listings', {
      params: { q: q || undefined },
    }),
  getListing: (ticker: string) => api.get<{ listing: ListingItem }>(`/listings/${ticker}`),
  getListingHistory: (ticker: string) =>
    api.get<{ ticker: string; history: ListingHistoryItem[] }>(`/listings/${ticker}/history`),
  getPortfolio: () => api.get<{ portfolio: PortfolioOverview }>('/portfolio'),
}
