<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useOtcStore } from '../../stores/otc'
import { useClientAccountStore } from '../../stores/clientAccount'
import { useClientAuthStore } from '../../stores/clientAuth'
import type { ClientAccountItem } from '../../api/clientAccount'
import type { PublicOtcStock } from '../../api/otc'

const otcStore = useOtcStore()
const accountStore = useClientAccountStore()
const authStore = useClientAuthStore()
const query = ref('')
const selectedStock = ref<PublicOtcStock | null>(null)
const selectedAccountId = ref('')
const amount = ref('')
const pricePerStock = ref('')
const premium = ref('')
const settlementDate = ref('')
const formError = ref('')
const successMessage = ref('')

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const filteredStocks = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const stocks = otcStore.publicStocks.filter((stock) => {
    if (!needle) return true
    return (
      stock.ticker.toLowerCase().includes(needle) ||
      stock.name.toLowerCase().includes(needle) ||
      stock.exchange.toLowerCase().includes(needle)
    )
  })

  return [...stocks].sort((left, right) =>
    left.ticker.localeCompare(right.ticker) || right.availableQuantity - left.availableQuantity
  )
})

const eligibleAccounts = computed<ClientAccountItem[]>(() => {
  if (!selectedStock.value) return []
  return accountStore.accounts.filter((account) =>
    account.status === 'aktivan' &&
    account.currencyKod === selectedStock.value?.currency
  )
})

const selectedAccount = computed(() =>
  eligibleAccounts.value.find((account) => String(account.id) === selectedAccountId.value)
)

const minSettlementDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
})

function fmtMoney(value: number) {
  return moneyFormatter.format(value)
}

function fmtQuantity(value: number) {
  return quantityFormatter.format(value)
}

function accountLabel(account: ClientAccountItem) {
  const name = account.naziv || account.brojRacuna
  return `${name} - ${account.brojRacuna} (${fmtMoney(account.raspolozivoStanje)} ${account.currencyKod})`
}

function openOfferForm(stock: PublicOtcStock) {
  selectedStock.value = stock
  selectedAccountId.value = ''
  amount.value = ''
  pricePerStock.value = String(stock.price || stock.ask || stock.bid || '')
  premium.value = ''
  const defaultSettlement = new Date()
  defaultSettlement.setDate(defaultSettlement.getDate() + 30)
  settlementDate.value = defaultSettlement.toISOString().slice(0, 10)
  formError.value = ''
  successMessage.value = ''
}

function closeOfferForm() {
  selectedStock.value = null
  selectedAccountId.value = ''
  formError.value = ''
}

function validateOfferForm() {
  if (!selectedStock.value) return 'Nije izabrana javna akcija.'
  if (!selectedAccountId.value) return 'Izaberi racun za placanje premije.'
  const numericAmount = Number(amount.value)
  const numericPrice = Number(pricePerStock.value)
  const numericPremium = Number(premium.value)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Kolicina mora biti veca od nule.'
  if (numericAmount > selectedStock.value.availableQuantity) return 'Kolicina prelazi dostupnu OTC kolicinu.'
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Cena po akciji mora biti veca od nule.'
  if (!Number.isFinite(numericPremium) || numericPremium < 0) return 'Premija ne moze biti negativna.'
  if (!settlementDate.value) return 'Settlement date je obavezan.'
  if (settlementDate.value < minSettlementDate.value) return 'Settlement date mora biti u buducnosti.'
  if (selectedAccount.value && numericPremium > selectedAccount.value.raspolozivoStanje) {
    return 'Premija je veca od raspolozivog stanja izabranog racuna.'
  }
  return ''
}

async function submitOffer() {
  const validationError = validateOfferForm()
  if (validationError) {
    formError.value = validationError
    return
  }

  const stock = selectedStock.value!
  try {
    const offer = await otcStore.createOffer({
      sellerHoldingId: stock.holdingId,
      buyerAccountId: Number(selectedAccountId.value),
      amount: Number(amount.value),
      pricePerStock: Number(pricePerStock.value),
      settlementDate: settlementDate.value,
      premium: Number(premium.value),
    })
    successMessage.value = `Ponuda #${offer.id} je kreirana za ${stock.ticker}.`
    closeOfferForm()
    await otcStore.fetchPublicStocks()
  } catch {
    formError.value = otcStore.error || 'Nije moguce kreirati OTC ponudu.'
  }
}

onMounted(() => {
  if (authStore.client?.id) {
    accountStore.fetchAccounts(authStore.client.id)
  }
  otcStore.fetchPublicStocks()
})
</script>

<template>
  <div class="otc-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">OTC portal</p>
        <h1>Javne akcije</h1>
        <p>Pregled javno izlozenih akcija i kreiranje pocetne ponude za OTC pregovaranje.</p>
      </div>
      <div class="header-actions">
        <RouterLink to="/client/otc/offers" class="secondary-link">Aktivne ponude</RouterLink>
        <RouterLink to="/client/otc/contracts" class="primary-link">Sklopljeni ugovori</RouterLink>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>Javne pozicije</span>
        <strong>{{ otcStore.publicStocks.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Dostupna kolicina</span>
        <strong>{{ fmtQuantity(otcStore.availablePublicQuantity) }}</strong>
      </article>
      <article class="summary-card">
        <span>Rezim</span>
        <strong>Ponude</strong>
      </article>
    </div>

    <div v-if="successMessage" class="success-box">{{ successMessage }}</div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Akcije dostupne u OTC portalu</h2>
          <span class="panel-meta">Izaberi akciju i unesi osnovne uslove ponude: kolicinu, cenu, premiju i settlement date.</span>
        </div>
        <input v-model="query" class="search-input" type="text" placeholder="Pretraga ticker, naziv, berza" />
      </div>

      <div v-if="otcStore.loadingStocks" class="empty-state">Ucitavam OTC akcije...</div>
      <div v-else-if="otcStore.error" class="error-box">{{ otcStore.error }}</div>
      <div v-else-if="otcStore.publicStocks.length === 0" class="empty-state">
        Trenutno nema javno izlozenih akcija.
      </div>
      <div v-else-if="filteredStocks.length === 0" class="empty-state">
        Nema rezultata za zadatu pretragu.
      </div>
      <div v-else class="table-wrap">
        <table class="otc-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Naziv</th>
              <th>Berza</th>
              <th>Cena</th>
              <th>Ask</th>
              <th>Bid</th>
              <th>Javno</th>
              <th>Rezervisano</th>
              <th>Dostupno</th>
              <th>Osvezeno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in filteredStocks" :key="stock.holdingId">
              <td class="ticker">{{ stock.ticker }}</td>
              <td>
                <div class="asset-name">{{ stock.name }}</div>
                <div class="asset-meta">Seller #{{ stock.sellerId }} / {{ stock.sellerType }}</div>
              </td>
              <td>{{ stock.exchange }} / {{ stock.currency }}</td>
              <td>{{ fmtMoney(stock.price) }}</td>
              <td>{{ fmtMoney(stock.ask) }}</td>
              <td>{{ fmtMoney(stock.bid) }}</td>
              <td>{{ fmtQuantity(stock.publicQuantity) }}</td>
              <td>{{ fmtQuantity(stock.reservedQuantity) }}</td>
              <td class="available">{{ fmtQuantity(stock.availableQuantity) }}</td>
              <td>{{ new Date(stock.lastRefresh).toLocaleString('sr-RS') }}</td>
              <td>
                <button class="offer-btn" @click="openOfferForm(stock)">Kreiraj ponudu</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="selectedStock" class="modal-backdrop" @click.self="closeOfferForm">
      <section class="offer-modal">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Nova OTC ponuda</p>
            <h2>{{ selectedStock.ticker }} / {{ selectedStock.name }}</h2>
            <span>Dostupno: {{ fmtQuantity(selectedStock.availableQuantity) }} akcija</span>
          </div>
          <button class="close-btn" @click="closeOfferForm">x</button>
        </div>

        <div v-if="accountStore.loading" class="empty-state">Ucitavam racune...</div>
        <form v-else class="offer-form" @submit.prevent="submitOffer">
          <label>
            Racun za premiju
            <select v-model="selectedAccountId" required>
              <option value="" disabled>Izaberi {{ selectedStock.currency }} racun</option>
              <option v-for="account in eligibleAccounts" :key="account.id" :value="String(account.id)">
                {{ accountLabel(account) }}
              </option>
            </select>
          </label>

          <div v-if="eligibleAccounts.length === 0" class="warning-box">
            Nemate aktivan racun u valuti {{ selectedStock.currency }}. Ponuda zahteva racun u istoj valuti kao akcija.
          </div>

          <div class="form-grid">
            <label>
              Kolicina akcija
              <input
                v-model="amount"
                type="number"
                min="0.0001"
                :max="selectedStock.availableQuantity"
                step="0.0001"
                required
              />
            </label>
            <label>
              Cena po akciji
              <input v-model="pricePerStock" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Premija
              <input v-model="premium" type="number" min="0" step="0.01" required />
            </label>
            <label>
              Settlement date
              <input v-model="settlementDate" type="date" :min="minSettlementDate" required />
            </label>
          </div>

          <div class="offer-preview">
            <div><span>Valuta</span><strong>{{ selectedStock.currency }}</strong></div>
            <div><span>Seller</span><strong>#{{ selectedStock.sellerId }}</strong></div>
            <div><span>Ukupna strike vrednost</span><strong>{{ fmtMoney(Number(amount || 0) * Number(pricePerStock || 0)) }}</strong></div>
          </div>

          <div v-if="formError || otcStore.error" class="error-box">
            {{ formError || otcStore.error }}
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="closeOfferForm">Odustani</button>
            <button type="submit" class="submit-btn" :disabled="otcStore.creatingOffer || eligibleAccounts.length === 0">
              {{ otcStore.creatingOffer ? 'Kreiram...' : 'Kreiraj ponudu' }}
            </button>
          </div>
        </form>
      </section>
    </div>
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

.primary-link,
.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
}

.primary-link {
  background: #0f172a;
  color: #fff;
}

.secondary-link {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
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

.search-input {
  min-width: 280px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  color: #0f172a;
}

.empty-state,
.error-box,
.success-box,
.warning-box {
  border-radius: 12px;
  padding: 18px;
  color: #64748b;
  background: #f8fafc;
}

.success-box {
  margin-bottom: 18px;
  color: #166534;
  background: #dcfce7;
  border: 1px solid #bbf7d0;
}

.error-box {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.warning-box {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
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

.ticker {
  color: #1d4ed8;
  font-weight: 800;
}

.asset-name {
  color: #0f172a;
  font-weight: 700;
}

.asset-meta {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.available {
  color: #047857;
  font-weight: 800;
}

.offer-btn,
.submit-btn,
.secondary-btn,
.close-btn {
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
}

.offer-btn {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 8px 11px;
}

.offer-btn:hover {
  background: #dbeafe;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.offer-modal {
  width: min(720px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.modal-head h2 {
  margin: 0;
  color: #0f172a;
}

.modal-head span {
  display: block;
  margin-top: 6px;
  color: #64748b;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  color: #475569;
}

.offer-form {
  display: grid;
  gap: 16px;
}

.offer-form label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.offer-form input,
.offer-form select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.offer-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px;
}

.offer-preview span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.offer-preview strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.secondary-btn {
  background: #f1f5f9;
  color: #475569;
  padding: 10px 14px;
}

.submit-btn {
  background: #0f172a;
  color: #fff;
  padding: 10px 16px;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 900px) {
  .page-header,
  .panel-head {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .search-input {
    min-width: 0;
    width: 100%;
  }

  .form-grid,
  .offer-preview {
    grid-template-columns: 1fr;
  }
}
</style>
