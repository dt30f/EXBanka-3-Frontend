<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useEmployeeMarketStore } from '../stores/employeeMarket'

const marketStore = useEmployeeMarketStore()
const query = ref('')

const filteredListings = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return marketStore.listings

  return marketStore.listings.filter((listing) =>
    listing.ticker.toLowerCase().includes(needle) ||
    listing.name.toLowerCase().includes(needle)
  )
})

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
        <p>Read-only pregled berzi i akcija za zaposlene sa traderskim ovlascenjima.</p>
      </div>
      <RouterLink to="/portfolio" class="portfolio-link">Otvori portfolio</RouterLink>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Berze</h2>
        <span class="panel-meta">{{ marketStore.exchanges.length }} aktivnih izvora</span>
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
      <div class="panel-head">
        <h2>Akcije</h2>
        <div class="search-box">
          <input v-model="query" type="text" placeholder="Pretraga po ticker-u ili nazivu" />
        </div>
      </div>

      <div v-if="marketStore.loading" class="empty-state">Ucitavam listings...</div>
      <div v-else-if="marketStore.error" class="error-box">{{ marketStore.error }}</div>
      <div v-else-if="filteredListings.length === 0" class="empty-state">Nema rezultata za zadatu pretragu.</div>
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
              <th>Volume</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="listing in filteredListings" :key="listing.ticker">
              <td class="ticker">{{ listing.ticker }}</td>
              <td>{{ listing.name }}</td>
              <td>{{ listing.exchange.acronym }}</td>
              <td>{{ listing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ listing.exchange.currency }}</td>
              <td>{{ listing.ask.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td>{{ listing.bid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td>{{ listing.volume.toLocaleString('en-US') }}</td>
              <td>
                <RouterLink :to="`/securities/${listing.ticker}`" class="details-link">Detalji</RouterLink>
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

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
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

.search-box input {
  width: 320px;
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
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
}
</style>
