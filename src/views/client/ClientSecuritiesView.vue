<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMarketStore } from '../../stores/market'

type SortOption = 'tickerAsc' | 'nameAsc' | 'priceDesc' | 'priceAsc' | 'volumeDesc'

const marketStore = useMarketStore()
const query = ref('')
const typeFilter = ref('all')
const sortBy = ref<SortOption>('tickerAsc')

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const volumeFormatter = new Intl.NumberFormat('en-US')

const typeOptions = computed(() => {
  const options = new Set<string>()
  marketStore.listings.forEach((listing) => options.add(listing.type))
  return ['all', ...Array.from(options).sort()]
})

const filteredListings = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const filtered = marketStore.listings.filter((listing) => {
    const matchesQuery =
      !needle ||
      listing.ticker.toLowerCase().includes(needle) ||
      listing.name.toLowerCase().includes(needle)
    const matchesType = typeFilter.value === 'all' || listing.type === typeFilter.value
    return matchesQuery && matchesType
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
        <strong>{{ typeOptions.length - 1 }}</strong>
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
          <h2>Akcije</h2>
          <span class="panel-meta">Pretraga po ticker-u i nazivu uz stabilno sortiranje.</span>
        </div>
        <div class="controls-grid">
          <input v-model="query" type="text" placeholder="Pretraga po ticker-u ili nazivu" />
          <select v-model="typeFilter">
            <option v-for="option in typeOptions" :key="option" :value="option">
              {{ option === 'all' ? 'Svi tipovi' : option }}
            </option>
          </select>
          <select v-model="sortBy">
            <option value="tickerAsc">Ticker A-Z</option>
            <option value="nameAsc">Naziv A-Z</option>
            <option value="priceDesc">Cena opadajuce</option>
            <option value="priceAsc">Cena rastuce</option>
            <option value="volumeDesc">Volume opadajuce</option>
          </select>
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

.controls-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) 180px 180px;
  gap: 12px;
  width: min(100%, 760px);
}

.controls-grid input,
.controls-grid select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
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
