<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { actuaryApi, type ActuaryManagementItem } from '../api/actuary'

const actuaries = ref<ActuaryManagementItem[]>([])
const loading = ref(false)
const error = ref('')
const query = ref('')

const filteredActuaries = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return actuaries.value

  return actuaries.value.filter((item) =>
    `${item.ime} ${item.prezime}`.toLowerCase().includes(needle) ||
    item.email.toLowerCase().includes(needle) ||
    item.username.toLowerCase().includes(needle)
  )
})

async function fetchActuaries() {
  loading.value = true
  error.value = ''
  try {
    const res = await actuaryApi.list()
    actuaries.value = res.data.actuaries ?? []
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to load actuaries.'
  } finally {
    loading.value = false
  }
}

// --- Edit state ---
const editLimits = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})

function getLimitInput(id: string, current?: number): string {
  if (editLimits.value[id] !== undefined) return editLimits.value[id]
  return current != null ? String(current) : ''
}

function setLimitInput(id: string, val: string) {
  editLimits.value[id] = val
}

async function saveLimit(item: ActuaryManagementItem) {
  saving.value[item.employeeId] = true
  try {
    const raw = editLimits.value[item.employeeId]
    const limit = raw != null && raw !== '' ? parseFloat(raw) : null
    await actuaryApi.updateLimit(item.employeeId, limit)
    await fetchActuaries()
    delete editLimits.value[item.employeeId]
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to update limit.'
  } finally {
    saving.value[item.employeeId] = false
  }
}

async function resetUsedLimit(item: ActuaryManagementItem) {
  saving.value[`reset-${item.employeeId}`] = true
  try {
    await actuaryApi.resetUsedLimit(item.employeeId)
    await fetchActuaries()
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to reset used limit.'
  } finally {
    saving.value[`reset-${item.employeeId}`] = false
  }
}

async function toggleNeedApproval(item: ActuaryManagementItem) {
  saving.value[`approval-${item.employeeId}`] = true
  try {
    await actuaryApi.setNeedApproval(item.employeeId, !item.needApproval)
    await fetchActuaries()
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to update approval setting.'
  } finally {
    saving.value[`approval-${item.employeeId}`] = false
  }
}

onMounted(fetchActuaries)
</script>

<template>
  <div class="actuaries-page">
    <div class="page-header">
      <div>
        <h1>Aktuari i supervizori</h1>
        <p>Upravljanje limitima, odobrenjima i ulogama aktuara.</p>
      </div>
      <div class="search-box">
        <input v-model="query" type="text" placeholder="Pretraga po imenu, email-u ili username-u" />
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>Ukupno zapisa</span>
        <strong>{{ actuaries.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Supervizori</span>
        <strong>{{ actuaries.filter(item => item.isSupervisor).length }}</strong>
      </article>
      <article class="summary-card">
        <span>Agenti</span>
        <strong>{{ actuaries.filter(item => !item.isSupervisor).length }}</strong>
      </article>
    </div>

    <div v-if="loading" class="empty-state">Ucitavam aktuare...</div>
    <div v-else-if="error" class="error-box">{{ error }}</div>
    <div v-else-if="filteredActuaries.length === 0" class="empty-state">Nema rezultata za zadatu pretragu.</div>
    <section v-else class="panel">
      <div class="panel-head">
        <h2>Lista ovlascenih zaposlenih</h2>
        <span>{{ filteredActuaries.length }} stavki</span>
      </div>

      <div class="table-wrap">
        <table class="actuary-table">
          <thead>
            <tr>
              <th>Zaposleni</th>
              <th>Uloga</th>
              <th>Pozicija</th>
              <th>Limit</th>
              <th>Used limit</th>
              <th>Approval</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredActuaries" :key="item.employeeId">
              <td>
                <div class="person-name">{{ item.ime }} {{ item.prezime }}</div>
                <div class="person-meta">{{ item.email }} | {{ item.username }}</div>
              </td>
              <td>
                <span class="role-pill" :class="{ supervisor: item.isSupervisor }">
                  {{ item.isSupervisor ? 'Supervisor' : 'Agent' }}
                </span>
              </td>
              <td>
                <div class="person-name">{{ item.pozicija || 'N/A' }}</div>
                <div class="person-meta">{{ item.departman || 'N/A' }}</div>
              </td>
              <td>
                <template v-if="item.isSupervisor">Bez limita</template>
                <template v-else>
                  <div style="display:flex;align-items:center;gap:6px">
                    <input
                      type="number"
                      class="limit-input"
                      :value="getLimitInput(item.employeeId, item.limit)"
                      @input="setLimitInput(item.employeeId, ($event.target as HTMLInputElement).value)"
                      placeholder="0.00"
                      step="1000"
                      min="0"
                    />
                    <button
                      class="btn-sm btn-primary-sm"
                      @click="saveLimit(item)"
                      :disabled="saving[item.employeeId]"
                    >{{ saving[item.employeeId] ? '...' : 'Save' }}</button>
                  </div>
                </template>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <span>{{ item.usedLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  <button
                    v-if="!item.isSupervisor"
                    class="btn-sm btn-reset"
                    @click="resetUsedLimit(item)"
                    :disabled="saving[`reset-${item.employeeId}`]"
                    title="Reset used limit to 0"
                  >Reset</button>
                </div>
              </td>
              <td>
                <button
                  v-if="!item.isSupervisor"
                  class="approval-pill"
                  :class="{ yes: item.needApproval, no: !item.needApproval }"
                  @click="toggleNeedApproval(item)"
                  :disabled="saving[`approval-${item.employeeId}`]"
                  style="cursor:pointer;border:none"
                  :title="item.needApproval ? 'Click to disable approval' : 'Click to require approval'"
                >
                  {{ item.needApproval ? 'Da' : 'Ne' }}
                </button>
                <span v-else class="approval-pill no">Ne</span>
              </td>
              <td>
                <span class="status-pill" :class="{ active: item.aktivan, inactive: !item.aktivan }">
                  {{ item.aktivan ? 'Aktivan' : 'Neaktivan' }}
                </span>
              </td>
              <td>
                <button class="btn-sm btn-refresh" @click="fetchActuaries" title="Refresh">Refresh</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.actuaries-page {
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
  color: #0f172a;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.search-box input {
  width: 340px;
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
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
  padding: 20px;
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
  font-size: 24px;
  color: #0f172a;
}

.panel {
  padding: 24px;
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

.table-wrap {
  overflow-x: auto;
}

.actuary-table {
  width: 100%;
  border-collapse: collapse;
}

.actuary-table th,
.actuary-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.actuary-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
}

.person-name {
  font-weight: 600;
  color: #0f172a;
}

.person-meta {
  font-size: 12px;
  color: #64748b;
}

.role-pill,
.approval-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-pill {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-pill.supervisor {
  background: #ede9fe;
  color: #6d28d9;
}

.approval-pill.yes {
  background: #fef3c7;
  color: #92400e;
}

.approval-pill.no {
  background: #dcfce7;
  color: #166534;
}

.status-pill.active {
  background: #dcfce7;
  color: #166534;
}

.status-pill.inactive {
  background: #fee2e2;
  color: #b91c1c;
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

.limit-input {
  width: 110px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
}

.limit-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.btn-sm {
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  white-space: nowrap;
}

.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary-sm {
  background: #3b82f6;
  color: #fff;
}

.btn-primary-sm:hover:not(:disabled) {
  background: #2563eb;
}

.btn-reset {
  background: #fef3c7;
  color: #92400e;
}

.btn-reset:hover:not(:disabled) {
  background: #fde68a;
}

.btn-refresh {
  background: #f1f5f9;
  color: #475569;
}

.btn-refresh:hover:not(:disabled) {
  background: #e2e8f0;
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
