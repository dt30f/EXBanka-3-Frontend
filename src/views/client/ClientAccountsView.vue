<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useClientAuthStore } from '../../stores/clientAuth'
import { useClientAccountStore } from '../../stores/clientAccount'
import { transferApi, type TransferItem } from '../../api/transfer'
import type { ClientAccountItem } from '../../api/clientAccount'

const authStore = useClientAuthStore()
const store = useClientAccountStore()

// Active accounts sorted by raspolozivoStanje descending
const activeAccounts = computed(() =>
  [...store.accounts]
    .filter(a => a.status === 'aktivan')
    .sort((a, b) => b.raspolozivoStanje - a.raspolozivoStanje)
)

// Selected account
const selectedAccount = ref<ClientAccountItem | null>(null)

// Transactions
const transfers = ref<TransferItem[]>([])
const transfersLoading = ref(false)
const transfersError = ref('')
const sortBy = ref<'date' | 'status'>('date')
const sortDir = ref<'desc' | 'asc'>('desc')

const sortedTransfers = computed(() => {
  return [...transfers.value].sort((a, b) => {
    if (sortBy.value === 'date') {
      const diff = new Date(a.vremeTransakcije).getTime() - new Date(b.vremeTransakcije).getTime()
      return sortDir.value === 'desc' ? -diff : diff
    } else {
      const cmp = a.status.localeCompare(b.status)
      return sortDir.value === 'desc' ? -cmp : cmp
    }
  })
})

// Details modal
const detailsAccount = ref<ClientAccountItem | null>(null)

function formatAmount(amount: number, currency: string) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} ${currency}`
}

function tipLabel(tip: string) {
  return tip === 'tekuci' ? 'Tekući' : 'Devizni'
}

function vrstaLabel(vrsta: string) {
  return vrsta === 'licni' ? 'Lični' : 'Poslovni'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('sr-RS')
}

function selectAccount(account: ClientAccountItem) {
  selectedAccount.value = account
}

async function loadTransfers(accountId: string) {
  transfersLoading.value = true
  transfersError.value = ''
  transfers.value = []
  try {
    const res = await transferApi.listByAccount(accountId)
    transfers.value = res.data.transfers ?? []
  } catch (e: any) {
    transfersError.value = e.response?.data?.message || 'Greška pri učitavanju transakcija.'
  } finally {
    transfersLoading.value = false
  }
}

watch(selectedAccount, (acc) => {
  if (acc) loadTransfers(acc.id)
})

watch(activeAccounts, (accs) => {
  if (accs.length > 0 && !selectedAccount.value && accs[0]) {
    selectedAccount.value = accs[0]
  }
}, { immediate: true })

onMounted(() => {
  if (authStore.client?.id) {
    store.fetchAccounts(authStore.client.id)
  }
})
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <h1>Računi</h1>
    </div>

    <p v-if="store.error" class="global-error" style="margin-bottom:16px">{{ store.error }}</p>

    <div v-if="store.loading" style="text-align:center;padding:40px;color:#6b7280">
      Učitavam račune...
    </div>

    <template v-else-if="activeAccounts.length === 0">
      <div style="text-align:center;padding:40px;color:#6b7280">Nema aktivnih računa.</div>
    </template>

    <template v-else>
      <!-- Accounts list -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px">
        <div
          v-for="account in activeAccounts"
          :key="account.id"
          class="card"
          style="padding:16px 20px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:border-color .15s"
          :style="selectedAccount?.id === account.id ? 'border: 2px solid #2563eb;' : 'border: 2px solid transparent;'"
          @click="selectAccount(account)"
        >
          <div>
            <div style="font-weight:600;font-size:15px;margin-bottom:2px">
              {{ account.naziv || tipLabel(account.tip) }}
            </div>
            <code style="font-size:12px;color:#6b7280">{{ account.brojRacuna }}</code>
          </div>

          <div style="display:flex;align-items:center;gap:20px">
            <div style="text-align:right">
              <div style="font-size:11px;color:#6b7280;margin-bottom:1px">Raspoloživo stanje</div>
              <div style="font-size:18px;font-weight:700;color:#16a34a">
                {{ formatAmount(account.raspolozivoStanje, account.currencyKod) }}
              </div>
            </div>
            <button
              class="btn-secondary btn-sm"
              @click.stop="detailsAccount = account"
            >Detalji</button>
          </div>
        </div>
      </div>

      <!-- Transactions for selected account -->
      <div v-if="selectedAccount">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0;font-size:18px">
            Transakcije — {{ selectedAccount.naziv || tipLabel(selectedAccount.tip) }}
          </h2>
          <div style="display:flex;gap:8px;align-items:center">
            <select
              v-model="sortBy"
              style="padding:4px 8px;border-radius:6px;border:1px solid #d1d5db;font-size:13px;background:#1f2937;color:#f9fafb"
            >
              <option value="date">Sortiraj po datumu</option>
              <option value="status">Sortiraj po tipu</option>
            </select>
            <button class="btn-secondary btn-sm" @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'">
              {{ sortDir === 'desc' ? '↓' : '↑' }}
            </button>
          </div>
        </div>

        <div v-if="transfersLoading" style="text-align:center;padding:24px;color:#6b7280">
          Učitavam transakcije...
        </div>
        <p v-else-if="transfersError" class="global-error">{{ transfersError }}</p>
        <div v-else-if="sortedTransfers.length === 0" style="text-align:center;padding:24px;color:#6b7280">
          Nema transakcija za ovaj račun.
        </div>
        <div v-else class="card" style="padding:0;overflow:hidden">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Svrha</th>
                <th>Iznos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in sortedTransfers" :key="t.id">
                <td style="font-size:13px;white-space:nowrap">{{ formatDate(t.vremeTransakcije) }}</td>
                <td style="font-size:13px">{{ t.svrha || '—' }}</td>
                <td style="font-size:13px;white-space:nowrap">
                  <span :style="t.racunPosiljaocaId === selectedAccount!.id ? 'color:#dc2626' : 'color:#16a34a'">
                    {{ t.racunPosiljaocaId === selectedAccount!.id ? '-' : '+' }}{{ formatAmount(t.iznos, t.valutaIznosa) }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="t.status === 'completed' ? 'badge-green' : 'badge'">
                    {{ t.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Details modal -->
  <div v-if="detailsAccount" class="modal-overlay" @click.self="detailsAccount = null">
    <div class="modal">
      <div class="modal-header">
        <h2>Detalji računa</h2>
        <button class="modal-close" @click="detailsAccount = null">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px">
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Naziv</div>
            <div style="font-weight:600">{{ detailsAccount.naziv || tipLabel(detailsAccount.tip) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Broj računa</div>
            <code style="font-size:13px">{{ detailsAccount.brojRacuna }}</code>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Tip</div>
            <div>{{ tipLabel(detailsAccount.tip) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Vrsta</div>
            <div>{{ vrstaLabel(detailsAccount.vrsta) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Valuta</div>
            <div>{{ detailsAccount.currencyKod }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Status</div>
            <div>{{ detailsAccount.status }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Stanje</div>
            <div style="font-weight:600">{{ formatAmount(detailsAccount.stanje, detailsAccount.currencyKod) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Raspoloživo stanje</div>
            <div style="font-weight:600;color:#16a34a">{{ formatAmount(detailsAccount.raspolozivoStanje, detailsAccount.currencyKod) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Dnevni limit</div>
            <div>{{ formatAmount(detailsAccount.dnevniLimit, detailsAccount.currencyKod) }}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:2px">Mesečni limit</div>
            <div>{{ formatAmount(detailsAccount.mesecniLimit, detailsAccount.currencyKod) }}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="detailsAccount = null">Zatvori</button>
      </div>
    </div>
  </div>
</template>
