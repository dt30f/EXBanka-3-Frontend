<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useMarketStore } from '../../stores/market'

const route = useRoute()
const marketStore = useMarketStore()

const priceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const volumeFormatter = new Intl.NumberFormat('en-US')

const ticker = computed(() => String(route.params.ticker || '').trim().toUpperCase())

const historyRows = computed(() =>
  [...marketStore.currentHistory].sort((left, right) => right.date.localeCompare(left.date))
)

const latestHistoryPoint = computed(() => historyRows.value[0] ?? null)

const historyHigh = computed(() => {
  if (historyRows.value.length === 0) return null
  return Math.max(...historyRows.value.map((point) => point.high))
})

const historyLow = computed(() => {
  if (historyRows.value.length === 0) return null
  return Math.min(...historyRows.value.map((point) => point.low))
})

const historyAverage = computed(() => {
  if (historyRows.value.length === 0) return null
  const total = historyRows.value.reduce((sum, point) => sum + point.price, 0)
  return total / historyRows.value.length
})

function formatPrice(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return priceFormatter.format(value)
}

async function loadDetails() {
  if (!ticker.value) return
  await marketStore.fetchListingDetails(ticker.value)
}

onMounted(loadDetails)
watch(ticker, loadDetails)
</script>

<template>
  <div class="details-page">
    <RouterLink to="/client/securities" class="back-link">Nazad na hartije</RouterLink>

    <div v-if="!ticker" class="empty-state">
      <h2>Nedostaje ticker</h2>
      <p>Izaberite hartiju sa liste kako biste videli detalje.</p>
      <RouterLink to="/client/securities" class="action-link">Nazad na listu</RouterLink>
    </div>
    <div v-else-if="marketStore.detailsLoading" class="empty-state">Ucitavam detalje hartije...</div>
    <div v-else-if="marketStore.error" class="error-box">
      <h2>Detalji nisu dostupni</h2>
      <p>{{ marketStore.error }}</p>
      <RouterLink to="/client/securities" class="action-link action-link-light">Povratak na listu</RouterLink>
    </div>
    <div v-else-if="!marketStore.currentListing" class="empty-state">
      <h2>Hartija nije pronadjena</h2>
      <p>Ticker {{ ticker }} trenutno nema dostupne podatke.</p>
      <RouterLink to="/client/securities" class="action-link">Nazad na listu</RouterLink>
    </div>
    <template v-else>
      <div class="hero">
        <div>
          <div class="ticker-pill">{{ marketStore.currentListing.ticker }}</div>
          <h1>{{ marketStore.currentListing.name }}</h1>
          <p>{{ marketStore.currentListing.exchange.name }} | {{ marketStore.currentListing.exchange.currency }}</p>
        </div>
        <div class="hero-price">
          {{ formatPrice(marketStore.currentListing.price) }}
          <span>{{ marketStore.currentListing.exchange.currency }}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span>Ask</span>
          <strong>{{ formatPrice(marketStore.currentListing.ask) }}</strong>
        </div>
        <div class="stat-card">
          <span>Bid</span>
          <strong>{{ formatPrice(marketStore.currentListing.bid) }}</strong>
        </div>
        <div class="stat-card">
          <span>Volume</span>
          <strong>{{ volumeFormatter.format(marketStore.currentListing.volume) }}</strong>
        </div>
        <div class="stat-card">
          <span>Last refresh</span>
          <strong>{{ new Date(marketStore.currentListing.lastRefresh).toLocaleString('sr-RS') }}</strong>
        </div>
      </div>

      <div class="summary-grid">
        <article class="summary-card">
          <span>30d high</span>
          <strong>{{ formatPrice(historyHigh) }}</strong>
        </article>
        <article class="summary-card">
          <span>30d low</span>
          <strong>{{ formatPrice(historyLow) }}</strong>
        </article>
        <article class="summary-card">
          <span>30d avg</span>
          <strong>{{ formatPrice(historyAverage) }}</strong>
        </article>
        <article class="summary-card">
          <span>Poslednja promena</span>
          <strong :class="{ positive: (latestHistoryPoint?.change ?? 0) >= 0, negative: (latestHistoryPoint?.change ?? 0) < 0 }">
            {{ latestHistoryPoint ? formatPrice(latestHistoryPoint.change) : 'N/A' }}
          </strong>
        </article>
      </div>

      <section class="panel info-panel">
        <div class="panel-head">
          <h2>Osnovni podaci</h2>
        </div>
        <ul class="meta-list">
          <li><span>Naziv</span><strong>{{ marketStore.currentListing.name }}</strong></li>
          <li><span>Berza</span><strong>{{ marketStore.currentListing.exchange.acronym }}</strong></li>
          <li><span>MIC</span><strong>{{ marketStore.currentListing.exchange.micCode }}</strong></li>
          <li><span>Tip</span><strong>{{ marketStore.currentListing.type }}</strong></li>
          <li><span>Valuta</span><strong>{{ marketStore.currentListing.exchange.currency }}</strong></li>
          <li><span>Trziste</span><strong>{{ marketStore.currentListing.exchange.name }}</strong></li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Istorija kretanja cene</h2>
          <span>{{ historyRows.length }} dana, najnovije prvo</span>
        </div>

        <div v-if="historyRows.length === 0" class="empty-inline">Istorija trenutno nije dostupna.</div>
        <div v-else class="table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Cena</th>
                <th>High</th>
                <th>Low</th>
                <th>Promena</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in historyRows" :key="point.date">
                <td>{{ point.date }}</td>
                <td>{{ formatPrice(point.price) }}</td>
                <td>{{ formatPrice(point.high) }}</td>
                <td>{{ formatPrice(point.low) }}</td>
                <td :class="{ positive: point.change >= 0, negative: point.change < 0 }">
                  {{ formatPrice(point.change) }}
                </td>
                <td>{{ volumeFormatter.format(point.volume) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.details-page {
  padding: 32px;
  max-width: 1180px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  margin-bottom: 18px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 22px;
}

.ticker-pill {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 10px 0 6px;
  font-size: 32px;
  color: #0f172a;
}

.hero p {
  margin: 0;
  color: #64748b;
}

.hero-price {
  font-size: 42px;
  font-weight: 800;
  color: #0f172a;
}

.hero-price span {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.stats-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card,
.summary-card,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.stat-card,
.summary-card {
  padding: 18px;
}

.stat-card span,
.summary-card span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.stat-card strong,
.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
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
  gap: 12px;
  margin-bottom: 18px;
}

.panel-head h2 {
  margin: 0;
  color: #0f172a;
}

.meta-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.meta-list li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
}

.meta-list span {
  color: #64748b;
}

.meta-list strong {
  color: #0f172a;
  text-align: right;
}

.table-wrap {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.history-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
}

.positive {
  color: #15803d;
  font-weight: 700;
}

.negative {
  color: #b91c1c;
  font-weight: 700;
}

.empty-state,
.error-box {
  padding: 32px;
  border-radius: 16px;
  text-align: center;
}

.empty-state {
  background: #fff;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.error-box {
  background: #fef2f2;
  color: #b91c1c;
}

.empty-state h2,
.error-box h2 {
  margin: 0 0 10px;
  color: #0f172a;
}

.empty-state p,
.error-box p {
  margin: 0 0 18px;
}

.action-link {
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

.action-link-light {
  background: #b91c1c;
}

.empty-inline {
  padding: 22px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid,
  .summary-grid,
  .meta-list {
    grid-template-columns: 1fr;
  }
}
</style>
