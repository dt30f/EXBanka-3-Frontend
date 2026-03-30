<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useEmployeeMarketStore } from '../stores/employeeMarket'

const marketStore = useEmployeeMarketStore()

const holdingsCount = computed(() => marketStore.portfolio?.items.length ?? 0)

onMounted(async () => {
  await marketStore.fetchPortfolio()
})
</script>

<template>
  <div class="portfolio-page">
    <div class="page-header">
      <div>
        <h1>Portfolio</h1>
        <p>Read-only pregled pozicija za zaposlene sa traderskim ovlascenjima.</p>
      </div>
      <RouterLink to="/securities" class="secondary-link">Nazad na hartije</RouterLink>
    </div>

    <div v-if="marketStore.portfolioLoading" class="empty-state">Ucitavam portfolio...</div>
    <div v-else-if="marketStore.error" class="error-box">{{ marketStore.error }}</div>
    <div v-else-if="!marketStore.portfolio" class="empty-state">Portfolio trenutno nije dostupan.</div>
    <template v-else>
      <div class="summary-grid">
        <article class="summary-card primary">
          <span>Ukupna procenjena vrednost</span>
          <strong>{{ marketStore.portfolio.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
        </article>
        <article class="summary-card">
          <span>Nerealizovani P/L</span>
          <strong :class="{ positive: marketStore.portfolio.unrealizedPnL >= 0, negative: marketStore.portfolio.unrealizedPnL < 0 }">
            {{ marketStore.portfolio.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </strong>
        </article>
        <article class="summary-card">
          <span>Broj pozicija</span>
          <strong>{{ holdingsCount }}</strong>
        </article>
        <article class="summary-card">
          <span>Generisano</span>
          <strong>{{ new Date(marketStore.portfolio.generatedAt).toLocaleString('sr-RS') }}</strong>
        </article>
      </div>

      <section class="panel">
        <div class="panel-head">
          <h2>Pozicije</h2>
          <span>{{ holdingsCount }} stavki</span>
        </div>

        <div class="table-wrap">
          <table class="portfolio-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Naziv</th>
                <th>Qty</th>
                <th>Avg price</th>
                <th>Current price</th>
                <th>Market value</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in marketStore.portfolio.items" :key="item.ticker">
                <td class="ticker">
                  <RouterLink :to="`/securities/${item.ticker}`">{{ item.ticker }}</RouterLink>
                </td>
                <td>
                  <div class="asset-name">{{ item.name }}</div>
                  <div class="asset-meta">{{ item.exchange }} | {{ item.currency }}</div>
                </td>
                <td>{{ item.quantity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</td>
                <td>{{ item.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>{{ item.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>{{ item.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>
                  <div :class="{ positive: item.pnl >= 0, negative: item.pnl < 0 }">
                    {{ item.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                  <div class="asset-meta">{{ item.pnlPercent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}%</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.portfolio-page {
  padding: 32px;
  max-width: 1220px;
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
  color: #0f172a;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  text-decoration: none;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.summary-card.primary {
  background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
  color: #fff;
  border: none;
}

.summary-card span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.summary-card.primary span {
  color: rgba(255, 255, 255, 0.72);
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  font-size: 24px;
  color: #0f172a;
}

.summary-card.primary strong {
  color: #fff;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
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
  color: #0f172a;
}

.table-wrap {
  overflow-x: auto;
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
}

.portfolio-table th,
.portfolio-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.portfolio-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
}

.ticker a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 700;
}

.asset-name {
  font-weight: 600;
  color: #0f172a;
}

.asset-meta {
  font-size: 12px;
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

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
