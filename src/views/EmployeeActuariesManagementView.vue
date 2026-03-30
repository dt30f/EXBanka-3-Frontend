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

function formatLimit(value?: number) {
  if (value == null) return 'Bez limita'
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(fetchActuaries)
</script>

<template>
  <div class="actuaries-page">
    <div class="page-header">
      <div>
        <h1>Aktuari i supervizori</h1>
        <p>Read-only pregled traderskih ovlascenja i limita kao Sprint 4 foundation.</p>
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
              <td>{{ formatLimit(item.limit) }}</td>
              <td>{{ item.usedLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td>
                <span class="approval-pill" :class="{ yes: item.needApproval, no: !item.needApproval }">
                  {{ item.needApproval ? 'Da' : 'Ne' }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="{ active: item.aktivan, inactive: !item.aktivan }">
                  {{ item.aktivan ? 'Aktivan' : 'Neaktivan' }}
                </span>
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
