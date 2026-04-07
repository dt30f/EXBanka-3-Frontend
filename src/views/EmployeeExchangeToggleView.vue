<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { employeeMarketApi } from '../api/employeeMarket'
import type { ExchangeItem } from '../api/market'

const exchanges = ref<ExchangeItem[]>([])
const loading = ref(false)
const error = ref('')
const toggling = ref<Record<string, boolean>>({})
const toggleError = ref<Record<string, string>>({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await employeeMarketApi.listExchanges()
    exchanges.value = res.data.exchanges ?? []
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Greška pri učitavanju berzi.'
  } finally {
    loading.value = false
  }
}

async function setOpen(exchange: ExchangeItem, open: boolean) {
  toggling.value[exchange.acronym] = true
  delete toggleError.value[exchange.acronym]
  try {
    await employeeMarketApi.toggleExchange(exchange.acronym, true, open)
    exchange.useManualTime = true
    exchange.manualTimeOpen = open
  } catch (e: any) {
    toggleError.value[exchange.acronym] = e?.response?.data?.message ?? 'Greška.'
  } finally {
    toggling.value[exchange.acronym] = false
  }
}

async function resetToReal(exchange: ExchangeItem) {
  toggling.value[exchange.acronym] = true
  delete toggleError.value[exchange.acronym]
  try {
    await employeeMarketApi.toggleExchange(exchange.acronym, false, false)
    exchange.useManualTime = false
    exchange.manualTimeOpen = false
  } catch (e: any) {
    toggleError.value[exchange.acronym] = e?.response?.data?.message ?? 'Greška.'
  } finally {
    toggling.value[exchange.acronym] = false
  }
}

onMounted(load)
</script>

<template>
  <div class="toggle-page">
    <div class="page-header">
      <div>
        <h1>Testiranje berzi — ručno upravljanje radnim vremenom</h1>
        <p>Supervisor-only. Postavite berzu u otvoreno ili zatvoreno stanje radi testiranja after-hours logike.</p>
      </div>
      <RouterLink to="/securities" class="back-link">Nazad na hartije</RouterLink>
    </div>

    <div v-if="loading" class="empty-state">Učitavam berze...</div>
    <div v-else-if="error" class="error-box">{{ error }}</div>
    <div v-else class="exchange-list">
      <article
        v-for="ex in exchanges"
        :key="ex.acronym"
        class="exchange-card"
        :class="{ 'manual-open': ex.useManualTime && ex.manualTimeOpen, 'manual-closed': ex.useManualTime && !ex.manualTimeOpen }"
      >
        <div class="card-top">
          <div>
            <div class="acronym">{{ ex.acronym }}</div>
            <div class="ex-name">{{ ex.name }}</div>
            <div class="ex-meta">{{ ex.polity }} | {{ ex.currency }} | {{ ex.timezone }}</div>
            <div class="ex-hours">Radno vreme: {{ ex.workingHours }}</div>
          </div>
          <div class="status-col">
            <span v-if="ex.useManualTime" class="badge manual">
              RUČNO — {{ ex.manualTimeOpen ? 'OTVORENO' : 'ZATVORENO' }}
            </span>
            <span v-else class="badge real">REALNO VREME</span>
          </div>
        </div>

        <div v-if="toggleError[ex.acronym]" class="inline-error">{{ toggleError[ex.acronym] }}</div>

        <div class="card-actions">
          <button
            class="btn open"
            :disabled="toggling[ex.acronym] || (ex.useManualTime && ex.manualTimeOpen)"
            @click="setOpen(ex, true)"
          >Postavi OTVORENO</button>
          <button
            class="btn closed"
            :disabled="toggling[ex.acronym] || (ex.useManualTime && !ex.manualTimeOpen)"
            @click="setOpen(ex, false)"
          >Postavi ZATVORENO</button>
          <button
            class="btn reset"
            :disabled="toggling[ex.acronym] || !ex.useManualTime"
            @click="resetToReal(ex)"
          >Vrati na realno vreme</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.toggle-page {
  padding: 32px;
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exchange-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s;
}

.exchange-card.manual-open {
  border-color: #86efac;
  background: #f0fdf4;
}

.exchange-card.manual-closed {
  border-color: #fca5a5;
  background: #fef2f2;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.acronym {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2563eb;
}

.ex-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
}

.ex-meta,
.ex-hours {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.status-col {
  flex-shrink: 0;
}

.badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.badge.manual {
  background: #fef9c3;
  color: #854d0e;
}

.badge.real {
  background: #f1f5f9;
  color: #475569;
}

.inline-error {
  font-size: 13px;
  color: #b91c1c;
  margin-bottom: 10px;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.open {
  background: #16a34a;
  color: #fff;
}
.btn.open:hover:not(:disabled) { background: #15803d; }

.btn.closed {
  background: #dc2626;
  color: #fff;
}
.btn.closed:hover:not(:disabled) { background: #b91c1c; }

.btn.reset {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}
.btn.reset:hover:not(:disabled) { background: #e2e8f0; }

.empty-state {
  padding: 48px;
  text-align: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  color: #64748b;
}

.error-box {
  padding: 16px 20px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 12px;
  color: #b91c1c;
}
</style>
