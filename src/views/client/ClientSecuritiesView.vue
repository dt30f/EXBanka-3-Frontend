<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMarketStore } from '../../stores/market'
import type { ListingItem } from '../../api/market'

type SortOption = 'tickerAsc' | 'nameAsc' | 'priceDesc' | 'priceAsc' | 'volumeDesc'
type TypeTab = 'all' | 'stock' | 'forex' | 'futures'

const marketStore = useMarketStore()
const query = ref('')
const activeTab = ref<TypeTab>('all')
const sortBy = ref<SortOption>('tickerAsc')

// Range filters
const priceMin = ref('')
const priceMax = ref('')
const askMin = ref('')
const askMax = ref('')
const bidMin = ref('')
const bidMax = ref('')
const volumeMin = ref('')
const volumeMax = ref('')

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const volumeFormatter = new Intl.NumberFormat('en-US')

function getInitialMarginCost(listing: ListingItem): number {
  switch (listing.type) {
    case 'futures': return listing.price * 0.10
    case 'forex':   return listing.price * 0.01
    case 'stock':   return listing.price * 0.50
    default:        return listing.price * 0.50
  }
}

function inRange(value: number, min: string, max: string): boolean {
  if (min !== '' && value < parseFloat(min)) return false
  if (max !== '' && value > parseFloat(max)) return false
  return true
}

const filteredListings = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const filtered = marketStore.listings.filter((listing) => {
    const matchesQuery =
      !needle ||
      listing.ticker.toLowerCase().includes(needle) ||
      listing.name.toLowerCase().includes(needle)
    const matchesType = activeTab.value === 'all' || listing.type === activeTab.value
    const matchesPrice = inRange(listing.price, priceMin.value, priceMax.value)
    const matchesAsk = inRange(listing.ask, askMin.value, askMax.value)
    const matchesBid = inRange(listing.bid, bidMin.value, bidMax.value)
    const matchesVolume = inRange(listing.volume, volumeMin.value, volumeMax.value)
    return matchesQuery && matchesType && matchesPrice && matchesAsk && matchesBid && matchesVolume
  })

  return [...filtered].sort((left, right) => {
    switch (sortBy.value) {
      case 'nameAsc':
        return left.name.localeCompare(right.name) || left.ticker.localeCompare(right.ticker)
      case 'priceDesc':
        return right.price - left.price || left.ticker.localeCompare(right.ticker)
      case 'priceAsc':
        return left.price - right.price || left.ticker.localeCompare(right.ticker)
      case 'volumeDesc':
        return right.volume - left.volume || left.ticker.localeCompare(right.ticker)
      case 'tickerAsc':
      default:
        return left.ticker.localeCompare(right.ticker)
    }
  })
})

const enabledExchanges = computed(() =>
  marketStore.exchanges.filter((exchange) => exchange.enabled).length
)

function formatPrice(value: number) {
  return formatter.format(value)
}

function clearFilters() {
  priceMin.value = ''
  priceMax.value = ''
  askMin.value = ''
  askMax.value = ''
  bidMin.value = ''
  bidMax.value = ''
  volumeMin.value = ''
  volumeMax.value = ''
}

const hasActiveFilters = computed(() =>
  priceMin.value !== '' || priceMax.value !== '' ||
  askMin.value !== '' || askMax.value !== '' ||
  bidMin.value !== '' || bidMax.value !== '' ||
  volumeMin.value !== '' || volumeMax.value !== ''
)

onMounted(async () => {
  await Promise.all([
    marketStore.fetchExchanges(),
    marketStore.fetchListings(),
  ])
})
</script>

<template>
  <div class="market-page">
    <div class="page-header">
      <div>
        <h1>Hartije od vrednosti</h1>
        <p>Read-only pregled akcija i berzi dostupan klijentima sa trading dozvolom.</p>
      </div>
      <RouterLink to="/client/portfolio" class="portfolio-link">Otvori portfolio</RouterLink>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>Hartije</span>
        <strong>{{ marketStore.listings.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Aktivne berze</span>
        <strong>{{ enabledExchanges }}</strong>
      </article>
      <article class="summary-card">
        <span>Tipovi</span>
        <strong>{{ new Set(marketStore.listings.map((l) => l.type)).size }}</strong>
      </article>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Berze</h2>
        <span class="panel-meta">{{ marketStore.exchanges.length }} izvora podataka</span>
      </div>
      <div class="exchange-grid">
        <article v-for="exchange in marketStore.exchanges" :key="exchange.acronym" class="exchange-card">
          <div class="exchange-top">
            <div>
              <div class="exchange-acronym">{{ exchange.acronym }}</div>
              <div class="exchange-name">{{ exchange.name }}</div>
            </div>
            <span class="exchange-status" :class="{ enabled: exchange.enabled }">
              {{ exchange.enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <div class="exchange-meta">{{ exchange.polity }} | {{ exchange.currency }} | {{ exchange.micCode }}</div>
          <div class="exchange-hours">{{ exchange.timezone }} | {{ exchange.workingHours }}</div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head panel-head-stack">
        <div>
          <h2>Hartije</h2>
          <span class="panel-meta">Pretraga i filtriranje po tipu, ceni, ask/bid i volumenu.</span>
        </div>
        <div class="controls-top">
          <div class="tab-bar">
            <button :class="['tab-btn', { active: activeTab === 'all' }]" @click="activeTab = 'all'">Sve</button>
            <button :class="['tab-btn', { active: activeTab === 'stock' }]" @click="activeTab = 'stock'">Akcije</button>
            <button :class="['tab-btn', { active: activeTab === 'forex' }]" @click="activeTab = 'forex'">Forex</button>
            <button :class="['tab-btn', { active: activeTab === 'futures' }]" @click="activeTab = 'futures'">Futures</button>
          </div>
          <div class="search-sort-row">
            <input v-model="query" type="text" placeholder="Pretraga po ticker-u ili nazivu" class="search-input" />
            <select v-model="sortBy" class="sort-select">
              <option value="tickerAsc">Ticker A-Z</option>
              <option value="nameAsc">Naziv A-Z</option>
              <option value="priceDesc">Cena opadajuce</option>
              <option value="priceAsc">Cena rastuce</option>
              <option value="volumeDesc">Volume opadajuce</option>
            </select>
          </div>
          <div class="range-filters">
            <div class="range-group">
              <span class="range-label">Cena</span>
              <input v-model="priceMin" type="number" placeholder="Min" class="range-input" />
              <span class="range-sep">–</span>
              <input v-model="priceMax" type="number" placeholder="Max" class="range-input" />
            </div>
            <div class="range-group">
              <span class="range-label">Ask</span>
              <input v-model="askMin" type="number" placeholder="Min" class="range-input" />
              <span class="range-sep">–</span>
              <input v-model="askMax" type="number" placeholder="Max" class="range-input" />
            </div>
            <div class="range-group">
              <span class="range-label">Bid</span>
              <input v-model="bidMin" type="number" placeholder="Min" class="range-input" />
              <span class="range-sep">–</span>
              <input v-model="bidMax" type="number" placeholder="Max" class="range-input" />
            </div>
            <div class="range-group">
              <span class="range-label">Volume</span>
              <input v-model="volumeMin" type="number" placeholder="Min" class="range-input" />
              <span class="range-sep">–</span>
              <input v-model="volumeMax" type="number" placeholder="Max" class="range-input" />
            </div>
            <button v-if="hasActiveFilters" class="clear-filters-btn" @click="clearFilters">Ocisti filtere</button>
          </div>
        </div>
      </div>

      <div v-if="marketStore.loading" class="empty-state">Ucitavam listings...</div>
      <div v-else-if="marketStore.error" class="error-box">{{ marketStore.error }}</div>
      <div v-else-if="marketStore.listings.length === 0" class="empty-state">Market podaci trenutno nisu dostupni.</div>
      <div v-else-if="filteredListings.length === 0" class="empty-state">Nema rezultata za zadate filtere.</div>
      <div v-else class="table-wrap">
        <table class="market-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Naziv</th>
              <th>Berza</th>
              <th>Cena</th>
              <th>Ask</th>
              <th>Bid</th>
              <th>Tip</th>
              <th>Volume</th>
              <th>Poc. margin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="listing in filteredListings" :key="listing.ticker">
              <td class="ticker">{{ listing.ticker }}</td>
              <td>
                <div class="name-cell">{{ listing.name }}</div>
                <div class="cell-meta">Osvezeno {{ new Date(listing.lastRefresh).toLocaleString('sr-RS') }}</div>
              </td>
              <td>{{ listing.exchange.acronym }}</td>
              <td>{{ formatPrice(listing.price) }} {{ listing.exchange.currency }}</td>
              <td>{{ formatPrice(listing.ask) }}</td>
              <td>{{ formatPrice(listing.bid) }}</td>
              <td><span class="type-pill">{{ listing.type }}</span></td>
              <td>{{ volumeFormatter.format(listing.volume) }}</td>
              <td class="margin-cost">{{ formatPrice(getInitialMarginCost(listing)) }}</td>
              <td>
                <RouterLink :to="`/client/securities/${listing.ticker}`" class="details-link">Detalji</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.market-page {
  padding: 32px;
  max-width: 1280px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #0f172a;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.portfolio-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.summary-card {
  padding: 18px 20px;
}

.summary-card span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  font-size: 26px;
  color: #0f172a;
}

.panel {
  padding: 24px;
  margin-bottom: 24px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-head-stack {
  align-items: flex-start;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.panel-meta {
  color: #64748b;
  font-size: 13px;
}

.controls-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.tab-bar {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 8px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  background: #e2e8f0;
}

.tab-btn.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.search-sort-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1 1 260px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
}

.sort-select {
  width: 200px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
}

.range-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.range-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 44px;
}

.range-sep {
  color: #94a3b8;
  font-size: 13px;
}

.range-input {
  width: 84px;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
}

.range-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.clear-filters-btn {
  padding: 7px 14px;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.clear-filters-btn:hover {
  background: #fee2e2;
}

.margin-cost {
  color: #0369a1;
  font-weight: 600;
}

.exchange-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.exchange-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.exchange-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.exchange-acronym {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2563eb;
}

.exchange-name {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.exchange-status {
  height: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.exchange-status.enabled {
  background: #dcfce7;
  color: #166534;
}

.exchange-meta,
.exchange-hours {
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
}

.market-table {
  width: 100%;
  border-collapse: collapse;
}

.market-table th,
.market-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 14px;
  vertical-align: top;
}

.market-table th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.ticker {
  font-weight: 700;
  color: #0f172a;
}

.name-cell {
  font-weight: 600;
  color: #0f172a;
}

.cell-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.details-link {
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
}

.empty-state,
.error-box {
  padding: 32px;
  text-align: center;
  border-radius: 12px;
}

.empty-state {
  background: #f8fafc;
  color: #64748b;
}

.error-box {
  background: #fef2f2;
  color: #b91c1c;
}

@media (max-width: 900px) {
  .page-header,
  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid,
  .controls-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>
