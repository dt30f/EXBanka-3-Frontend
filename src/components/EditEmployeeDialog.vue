<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { employeeApi, type UpdateEmployeePayload } from '../api/employee'
import PermissionManager from './PermissionManager.vue'
import { usePermissions } from '../composables/usePermissions'

interface Permission {
  id: string; name: string; description: string
}
interface EmployeeDetail {
  id: string; ime: string; prezime: string; datumRodjenja: string
  pol: string; email: string; brojTelefona: string; adresa: string
  username: string; pozicija: string; departman: string; aktivan: boolean
  permissions: Permission[]
}

const props = defineProps<{
  employee: EmployeeDetail
  allPermissions: Permission[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const perms = usePermissions()

// form state
const form = ref({ ...props.employee, datumRodjenja: '' })
const selectedPermissions = ref<string[]>([])
const error = ref('')
const loading = ref(false)
const activeTab = ref<'info' | 'permissions'>('info')

// Actuary role checkboxes
const isAgentChecked = ref(false)
const isSupervisorChecked = ref(false)
const isTargetAdmin = computed(() => {
  return props.employee.permissions.some(p => p.name === 'employeeAdmin')
})

watch(() => props.employee, (emp) => {
  form.value = {
    ...emp,
    datumRodjenja: emp.datumRodjenja ? emp.datumRodjenja.substring(0, 10) : '',
  }
  selectedPermissions.value = emp.permissions.map(p => p.name)
  isAgentChecked.value = selectedPermissions.value.includes('employeeAgent')
  isSupervisorChecked.value = selectedPermissions.value.includes('employeeSupervisor')
}, { immediate: true })

// Sync checkboxes back to permissions list
watch([isAgentChecked, isSupervisorChecked], ([agent, supervisor]) => {
  const permsSet = new Set(selectedPermissions.value)
  if (agent) permsSet.add('employeeAgent')
  else permsSet.delete('employeeAgent')
  if (supervisor) permsSet.add('employeeSupervisor')
  else permsSet.delete('employeeSupervisor')
  selectedPermissions.value = Array.from(permsSet)
})

async function handleSave() {
  error.value = ''
  loading.value = true
  try {
    const payload: UpdateEmployeePayload = {
      ime:           form.value.ime,
      prezime:       form.value.prezime,
      datumRodjenja: form.value.datumRodjenja
        ? Math.floor(new Date(form.value.datumRodjenja).getTime() / 1000)
        : 0,
      pol:          form.value.pol,
      email:        form.value.email,
      brojTelefona: form.value.brojTelefona,
      adresa:       form.value.adresa,
      username:     form.value.username,
      pozicija:     form.value.pozicija,
      departman:    form.value.departman,
      aktivan:      form.value.aktivan,
    }
    await employeeApi.update(props.employee.id, payload)

    if (perms.canManagePermissions()) {
      await employeeApi.updatePermissions(props.employee.id, selectedPermissions.value)
    }

    emit('saved')
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to save changes.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Edit Employee</h2>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;border-bottom:1px solid #e5e7eb;padding:0 24px">
        <button
          v-if="perms.canUpdate()"
          :style="{ borderBottom: activeTab==='info' ? '2px solid #3b82f6' : 'none', color: activeTab==='info' ? '#3b82f6' : '#6b7280', background:'none', borderRadius:0, padding:'10px 16px', marginBottom:'-1px' }"
          @click="activeTab='info'"
        >Employee Info</button>
        <button
          v-if="perms.canManagePermissions()"
          :style="{ borderBottom: activeTab==='permissions' ? '2px solid #3b82f6' : 'none', color: activeTab==='permissions' ? '#3b82f6' : '#6b7280', background:'none', borderRadius:0, padding:'10px 16px', marginBottom:'-1px' }"
          @click="activeTab='permissions'"
        >Permissions</button>
      </div>

      <div class="modal-body">
        <!-- Info tab -->
        <template v-if="activeTab === 'info' && perms.canUpdate()">
          <div class="form-row">
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="form.ime" required />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="form.prezime" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date of Birth</label>
              <input v-model="form.datumRodjenja" type="date" />
            </div>
            <div class="form-group">
              <label>Gender *</label>
              <select v-model="form.pol">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" required />
            </div>
            <div class="form-group">
              <label>Username *</label>
              <input v-model="form.username" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.brojTelefona" />
            </div>
            <div class="form-group">
              <label>Address</label>
              <input v-model="form.adresa" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Position</label>
              <input v-model="form.pozicija" />
            </div>
            <div class="form-group">
              <label>Department</label>
              <input v-model="form.departman" />
            </div>
          </div>

          <div class="form-group" style="flex-direction:row;align-items:center;gap:10px">
            <input type="checkbox" id="aktivan-edit" v-model="form.aktivan" style="width:16px;height:16px" />
            <label for="aktivan-edit" style="margin:0;cursor:pointer">Active</label>
          </div>
        </template>

        <!-- Permissions tab -->
        <template v-if="activeTab === 'permissions' && perms.canManagePermissions()">
          <!-- Actuary role checkboxes (only for non-admin employees) -->
          <div v-if="!isTargetAdmin" style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
            <h3 style="margin:0 0 12px;font-size:14px;color:#475569">Actuary Roles</h3>
            <div style="display:flex;gap:24px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" v-model="isAgentChecked" style="width:16px;height:16px" />
                <span>Agent</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" v-model="isSupervisorChecked" style="width:16px;height:16px" />
                <span>Supervisor</span>
              </label>
            </div>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">
              Agents trade with limits. Supervisors trade without limits and manage agents.
            </p>
          </div>
          <div v-else style="margin-bottom:16px;padding:12px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e">
            This employee is an admin. Admins are automatically supervisors. One admin cannot edit another admin's roles.
          </div>

          <PermissionManager
            :allPermissions="allPermissions"
            v-model="selectedPermissions"
          />
        </template>

        <p v-if="error" class="global-error">{{ error }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="handleSave" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>
