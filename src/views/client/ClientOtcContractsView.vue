<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useOtcStore } from '../../stores/otc'
import type { OtcContractStatus } from '../../api/otc'

const otcStore = useOtcStore()
const statuses: Array<{ value: OtcContractStatus; label: string }> = [
  { value: '', label: 'Svi' },
  { value: 'valid', label: 'Vazeci' },
  { value: 'expired', label: 'Istekli' },
  { value: 'exercised', label: 'Iskorisceni' },
]

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const sortedContracts = computed(() =>
  [...otcStore.contracts].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() || right.id - left.id
  )
)

function fmtMoney(value: number) {
  return moneyFormatter.format(value)
}

function fmtQuantity(value: number) {
  return quantityFormatter.format(value)
}

function statusLabel(status: string) {
  switch (status) {
    case 'valid':
      return 'Vazeci'
    case 'expired':
      return 'Istekao'
    case 'exercised':
      return 'Iskoriscen'
    default:
      return status
  }
}

function profitClass(value: number) {
  if (value > 0) return 'profit-positive'
  if (value < 0) return 'profit-negative'
  return 'profit-neutral'
}

function changeStatus(status: OtcContractStatus) {
  otcStore.fetchContracts(status)
}

onMounted(() => {
  otcStore.fetchContracts()
})
</script>

<template>
  <div class="otc-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">OTC portal</p>
        <h1>Sklopljeni ugovori</h1>
        <p>Read-only pregled opcionih ugovora nastalih prihvatanjem OTC ponuda.</p>
      </div>
      <div class="header-actions">
        <RouterLink to="/client/otc" class="secondary-link">Javne akcije</RouterLink>
        <RouterLink to="/client/otc/offers" class="secondary-link">Aktivne ponude</RouterLink>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>Ugovori u prikazu</span>
        <strong>{{ otcStore.contracts.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Vazeci ugovori</span>
        <strong>{{ otcStore.validContracts.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Izvrsenje opcije</span>
        <strong>Deferred</strong>
      </article>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Opcioni ugovori</h2>
          <span class="panel-meta">Ova strana ne pokrece izvrsenje opcije; SAGA flow ostaje za naredni sprint.</span>
        </div>
        <div class="status-tabs">
          <button
            v-for="status in statuses"
            :key="status.value || 'all'"
            class="status-tab"
            :class="{ active: otcStore.selectedContractStatus === status.value }"
            @click="changeStatus(status.value)"
          >
            {{ status.label }}
          </button>
        </div>
      </div>

      <div v-if="otcStore.loadingContracts" class="empty-state">Ucitavam OTC ugovore...</div>
      <div v-else-if="otcStore.error" class="error-box">{{ otcStore.error }}</div>
      <div v-else-if="sortedContracts.length === 0" class="empty-state">
        Nema ugovora za izabrani filter.
      </div>
      <div v-else class="table-wrap">
        <table class="otc-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ticker</th>
              <th>Kolicina</th>
              <th>Strike cena</th>
              <th>Trzisna cena</th>
              <th>Premija</th>
              <th>Profit</th>
              <th>Settlement</th>
              <th>Status</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Kreiran</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in sortedContracts" :key="contract.id">
              <td class="contract-id">#{{ contract.id }}</td>
              <td>
                <div class="ticker">{{ contract.ticker }}</div>
                <div class="asset-meta">{{ contract.name }} / {{ contract.exchange.currency }}</div>
              </td>
              <td>{{ fmtQuantity(contract.amount) }}</td>
              <td>{{ fmtMoney(contract.strikePrice) }}</td>
              <td>{{ fmtMoney(contract.currentPrice) }}</td>
              <td>{{ fmtMoney(contract.premium) }}</td>
              <td :class="profitClass(contract.profit)">
                {{ fmtMoney(contract.profit) }} {{ contract.exchange.currency }}
              </td>
              <td>{{ new Date(contract.settlementDate).toLocaleDateString('sr-RS') }}</td>
              <td>
                <span class="status-pill" :class="contract.status">{{ statusLabel(contract.status) }}</span>
              </td>
              <td>#{{ contract.buyerId }} / {{ contract.buyerType }}</td>
              <td>#{{ contract.sellerId }} / {{ contract.sellerType }}</td>
              <td>{{ new Date(contract.createdAt).toLocaleString('sr-RS') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.otc-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
}

.page-header p:not(.eyebrow) {
  margin: 8px 0 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card,
.panel {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.summary-card {
  padding: 18px 20px;
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 24px;
}

.panel {
  padding: 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.panel-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.panel-meta {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-tab {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  padding: 8px 12px;
  font-weight: 700;
}

.status-tab.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.empty-state,
.error-box {
  border-radius: 12px;
  padding: 18px;
  color: #64748b;
  background: #f8fafc;
}

.error-box {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.table-wrap {
  overflow-x: auto;
}

.otc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.otc-table th,
.otc-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.otc-table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.contract-id,
.ticker {
  color: #1d4ed8;
  font-weight: 800;
}

.asset-meta {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.profit-positive {
  color: #047857;
  font-weight: 800;
}

.profit-negative {
  color: #b91c1c;
  font-weight: 800;
}

.profit-neutral {
  color: #475569;
  font-weight: 800;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 9px;
  background: #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.status-pill.valid {
  background: #dcfce7;
  color: #166534;
}

.status-pill.expired {
  background: #f1f5f9;
  color: #475569;
}

.status-pill.exercised {
  background: #dbeafe;
  color: #1d4ed8;
}

@media (max-width: 900px) {
  .page-header,
  .panel-head {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
