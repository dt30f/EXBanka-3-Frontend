<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipientStore } from '../../stores/recipient'
import { useClientAuthStore } from '../../stores/clientAuth'
import type { RecipientItem } from '../../api/recipient'

const clientAuthStore = useClientAuthStore()
const store = useRecipientStore()

const clientId = computed(() => String(clientAuthStore.client?.id ?? ''))

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ naziv: '', brojRacuna: '' })
const formError = ref('')
const formLoading = ref(false)

const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)

function openAdd() {
  editingId.value = null
  form.value = { naziv: '', brojRacuna: '' }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(r: RecipientItem) {
  editingId.value = r.id
  form.value = { naziv: r.naziv, brojRacuna: r.brojRacuna }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function handleSave() {
  if (!form.value.naziv.trim() || !form.value.brojRacuna.trim()) {
    formError.value = 'Naziv i broj računa su obavezni.'
    return
  }
  formLoading.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await store.updateRecipient(editingId.value, form.value.naziv, form.value.brojRacuna)
    } else {
      await store.createRecipient(clientId.value, form.value.naziv, form.value.brojRacuna)
    }
    modalOpen.value = false
  } catch (e: any) {
    formError.value = e.response?.data?.message || 'Greška pri čuvanju.'
  } finally {
    formLoading.value = false
  }
}

function confirmDelete(id: string) {
  deletingId.value = id
}

function cancelDelete() {
  deletingId.value = null
}

async function handleDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await store.deleteRecipient(deletingId.value)
    deletingId.value = null
  } catch (e: any) {
    store.error = e.response?.data?.message || 'Greška pri brisanju.'
    deletingId.value = null
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  if (clientId.value) await store.fetchRecipients(clientId.value)
})
</script>

<template>
  <div class="rcp-page">
    <div class="rcp-header">
      <div>
        <h1 class="rcp-title">Primaoci plaćanja</h1>
        <p class="rcp-subtitle">Upravljajte listom primalaca za brža plaćanja</p>
      </div>
      <button class="rcp-btn rcp-btn-primary" @click="openAdd">+ Dodaj primaoca</button>
    </div>

    <div v-if="store.loading" class="rcp-empty">Učitavam...</div>
    <div v-else-if="store.error" class="rcp-error">{{ store.error }}</div>
    <div v-else-if="store.recipients.length === 0" class="rcp-empty-state">
      <div class="rcp-empty-icon">◉</div>
      <h3>Nema sačuvanih primalaca</h3>
      <p>Dodajte primaoca da biste ubrzali buduća plaćanja.</p>
      <button class="rcp-btn rcp-btn-primary" @click="openAdd">+ Dodaj prvog primaoca</button>
    </div>

    <div v-else class="rcp-list">
      <div v-for="r in store.recipients" :key="r.id" class="rcp-card">
        <div class="rcp-card-left">
          <div class="rcp-avatar">{{ r.naziv.charAt(0).toUpperCase() }}</div>
          <div class="rcp-info">
            <div class="rcp-name">{{ r.naziv }}</div>
            <div class="rcp-account">{{ r.brojRacuna }}</div>
          </div>
        </div>
        <div class="rcp-card-actions">
          <button class="rcp-action-btn rcp-edit" @click="openEdit(r)">Izmeni</button>
          <button class="rcp-action-btn rcp-delete" @click="confirmDelete(r.id)">Obriši</button>
        </div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="modalOpen" class="rcp-overlay" @click.self="closeModal">
      <div class="rcp-modal">
        <div class="rcp-modal-header">
          <h2>{{ editingId ? 'Izmeni primaoca' : 'Novi primalac' }}</h2>
          <button class="rcp-modal-close" @click="closeModal">✕</button>
        </div>
        <div class="rcp-modal-body">
          <div class="rcp-field">
            <label>Naziv primaoca</label>
            <input v-model="form.naziv" placeholder="npr. EPS, Telenor, Petar Petrović" />
          </div>
          <div class="rcp-field">
            <label>Broj računa</label>
            <input v-model="form.brojRacuna" placeholder="18 cifara" maxlength="18" />
          </div>
          <div v-if="formError" class="rcp-form-error">{{ formError }}</div>
        </div>
        <div class="rcp-modal-footer">
          <button class="rcp-btn rcp-btn-sec" @click="closeModal">Poništi</button>
          <button class="rcp-btn rcp-btn-primary" :disabled="formLoading" @click="handleSave">
            {{ formLoading ? 'Čuvam...' : 'Potvrdi' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deletingId" class="rcp-overlay" @click.self="cancelDelete">
      <div class="rcp-modal rcp-modal-sm">
        <div class="rcp-modal-body" style="text-align:center;padding:32px">
          <div style="font-size:40px;margin-bottom:12px;color:#ef4444">⚠</div>
          <h3 style="margin-bottom:8px">Obriši primaoca?</h3>
          <p style="color:#64748b;font-size:14px;margin-bottom:20px">Ova akcija se ne može poništiti.</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="rcp-btn rcp-btn-sec" @click="cancelDelete">Otkaži</button>
            <button class="rcp-btn rcp-btn-danger" :disabled="deleteLoading" @click="handleDelete">
              {{ deleteLoading ? 'Brišem...' : 'Obriši' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rcp-page { padding: 32px; max-width: 800px; margin: 0 auto; }
.rcp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.rcp-title { font-size: 28px; font-weight: 700; color: #0f172a; }
.rcp-subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }

.rcp-list { display: flex; flex-direction: column; gap: 10px; }
.rcp-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: 12px; padding: 18px 20px;
  border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s;
}
.rcp-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.rcp-card-left { display: flex; align-items: center; gap: 14px; }
.rcp-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb; display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.rcp-info { min-width: 0; }
.rcp-name { font-weight: 600; color: #1e293b; font-size: 15px; }
.rcp-account { font-size: 13px; color: #94a3b8; font-family: 'SF Mono', monospace; margin-top: 2px; }
.rcp-card-actions { display: flex; gap: 8px; }

.rcp-action-btn {
  padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
  border: none; cursor: pointer; transition: all 0.15s;
}
.rcp-edit { background: #f1f5f9; color: #475569; }
.rcp-edit:hover { background: #e2e8f0; }
.rcp-delete { background: #fef2f2; color: #dc2626; }
.rcp-delete:hover { background: #fee2e2; }

.rcp-btn {
  padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
  border: none; cursor: pointer; transition: all 0.15s;
}
.rcp-btn-primary { background: #2563eb; color: #fff; }
.rcp-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.rcp-btn-primary:disabled { opacity: 0.5; }
.rcp-btn-sec { background: #f1f5f9; color: #475569; }
.rcp-btn-sec:hover { background: #e2e8f0; }
.rcp-btn-danger { background: #ef4444; color: #fff; }
.rcp-btn-danger:hover:not(:disabled) { background: #dc2626; }

.rcp-empty { text-align: center; padding: 40px; color: #94a3b8; }
.rcp-error { padding: 12px 16px; background: #fef2f2; color: #dc2626; border-radius: 8px; margin-bottom: 16px; }
.rcp-empty-state {
  text-align: center; padding: 60px 20px;
  background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
}
.rcp-empty-icon { font-size: 48px; color: #cbd5e1; margin-bottom: 12px; }
.rcp-empty-state h3 { font-size: 18px; color: #1e293b; margin-bottom: 4px; }
.rcp-empty-state p { color: #64748b; font-size: 14px; margin-bottom: 20px; }

/* Modal */
.rcp-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.rcp-modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
}
.rcp-modal-sm { max-width: 380px; }
.rcp-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
}
.rcp-modal-header h2 { font-size: 18px; font-weight: 700; color: #0f172a; }
.rcp-modal-close { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.rcp-modal-close:hover { background: #f1f5f9; color: #475569; }
.rcp-modal-body { padding: 24px; }
.rcp-modal-footer {
  padding: 16px 24px; border-top: 1px solid #f1f5f9;
  display: flex; justify-content: flex-end; gap: 10px;
}
.rcp-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
.rcp-field label { font-size: 13px; font-weight: 600; color: #374151; }
.rcp-field input {
  padding: 11px 14px; border: 1px solid #d1d5db; border-radius: 10px;
  font-size: 14px; transition: border-color 0.15s;
}
.rcp-field input:focus { border-color: #3b82f6; outline: none; }
.rcp-form-error { padding: 10px 14px; background: #fef2f2; color: #dc2626; border-radius: 8px; font-size: 13px; }
</style>
