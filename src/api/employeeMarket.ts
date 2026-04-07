import api from './client'
import type {
  ExchangeItem,
  ListingHistoryItem,
  ListingItem,
  OptionsChain,
} from './market'

export const employeeMarketApi = {
  listExchanges: () => api.get<{ exchanges: ExchangeItem[]; count: number }>('/exchanges'),
  toggleExchange: (acronym: string, useManualTime: boolean, manualTimeOpen: boolean) =>
    api.post<{ exchange: string; useManualTime: boolean; manualTimeOpen: boolean; message: string }>(
      `/exchanges/${acronym}/toggle`,
      { useManualTime, manualTimeOpen },
    ),
  listListings: (q = '', type = '') =>
    api.get<{ listings: ListingItem[]; count: number; query: string }>('/listings', {
      params: { q: q || undefined, type: type || undefined },
    }),
  getListing: (ticker: string) => api.get<{ listing: ListingItem }>(`/listings/${ticker}`),
  getListingHistory: (ticker: string) =>
    api.get<{ ticker: string; history: ListingHistoryItem[] }>(`/listings/${ticker}/history`),
  getOptionsChain: (ticker: string) => api.get<OptionsChain>(`/listings/${ticker}/options`),
}
