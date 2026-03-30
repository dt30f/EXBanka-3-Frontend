<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useEmployeeMarketStore } from '../stores/employeeMarket'

const route = useRoute()
const marketStore = useEmployeeMarketStore()

const ticker = computed(() => String(route.params.ticker || ''))

async function loadDetails() {
  if (!ticker.value) return
  await marketStore.fetchListingDetails(ticker.value)
}

onMounted(loadDetails)
watch(ticker, loadDetails)
</script>

<template>
  <div class="details-page">
    <RouterLink to="/securities" class="back-link">Nazad na hartije</RouterLink>

    <div v-if="marketStore.detailsLoading" class="empty-state">Ucitavam detalje hartije...</div>
    <div v-else-if="marketStore.error" class="error-box">{{ marketStore.error }}</div>
    <div v-else-if="!marketStore.currentListing" class="empty-state">Trazena hartija nije pronadjena.</div>
    <template v-else>
      <div class="hero">
        <div>
          <div class="ticker-pill">{{ marketStore.currentListing.ticker }}</div>
          <h1>{{ marketStore.currentListing.name }}</h1>
          <p>{{ marketStore.currentListing.exchange.name }} | {{ marketStore.currentListing.exchange.currency }}</p>
        </div>
        <div class="hero-price">
          {{ marketStore.currentListing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span>{{ marketStore.currentListing.exchange.currency }}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span>Ask</span>
          <strong>{{ marketStore.currentListing.ask.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
        </div>
        <div class="stat-card">
          <span>Bid</span>
          <strong>{{ marketStore.currentListing.bid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
        </div>
        <div class="stat-card">
          <span>Volume</span>
          <strong>{{ marketStore.currentListing.volume.toLocaleString('en-US') }}</strong>
        </div>
        <div class="stat-card">
          <span>Last refresh</span>
          <strong>{{ new Date(marketStore.currentListing.lastRefresh).toLocaleString('sr-RS') }}</strong>
        </div>
      </div>

      <section class="panel info-panel">
        <div>
          <h2>Osnovni podaci</h2>
          <ul class="meta-list">
            <li><span>Berza</span><strong>{{ marketStore.currentListing.exchange.acronym }}</strong></li>
            <li><span>MIC</span><strong>{{ marketStore.currentListing.exchange.micCode }}</strong></li>
            <li><span>Tip</span><strong>{{ marketStore.currentListing.type }}</strong></li>
            <li><span>Valuta</span><strong>{{ marketStore.currentListing.exchange.currency }}</strong></li>
          </ul>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Istorija kretanja cene</h2>
          <span>{{ marketStore.currentHistory.length }} dana</span>
        </div>

        <div class="table-wrap">
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
              <tr v-for="point in marketStore.currentHistory" :key="point.date">
                <td>{{ point.date }}</td>
                <td>{{ point.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>{{ point.high.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>{{ point.low.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td :class="{ positive: point.change >= 0, negative: point.change < 0 }">
                  {{ point.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </td>
                <td>{{ point.volume.toLocaleString('en-US') }}</td>
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.stat-card {
  padding: 18px;
}

.stat-card span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.stat-card strong {
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
  margin: 18px 0 0;
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

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid,
  .meta-list {
    grid-template-columns: 1fr;
  }
}
</style>
