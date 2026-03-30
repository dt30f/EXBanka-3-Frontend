const API_BASE = '/api/v1'

export function adminLogin() {
  return cy
    .request('POST', `${API_BASE}/auth/login`, {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    })
    .its('body')
}

export function loginEmployeeUi(email = Cypress.env('adminEmail'), password = Cypress.env('adminPassword')) {
  cy.visit('/login', {
    onBeforeLoad(win) {
      win.sessionStorage.clear()
    },
  })
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password)
  cy.contains('button', 'Sign In').click()
  cy.url().should('not.include', '/login')
}

export function createEmployee(adminToken, label, overrides = {}) {
  const timestamp = Date.now()
  const email = overrides.email || `cypress.employee.${label}.${timestamp}@bank.com`
  const username = overrides.username || `cyemp${timestamp}`

  return cy.request({
    method: 'POST',
    url: `${API_BASE}/employees`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      ime: overrides.ime || 'Cypress',
      prezime: overrides.prezime || 'Employee',
      datumRodjenja: overrides.datumRodjenja || 946684800,
      pol: overrides.pol || 'M',
      email,
      brojTelefona: overrides.brojTelefona || '0641234567',
      adresa: overrides.adresa || 'Cypress Employee 1',
      username,
      pozicija: overrides.pozicija || 'Analyst',
      departman: overrides.departman || 'Trading',
      aktivan: false,
    },
  }).then(({ body }) => ({
    id: String(body.employee.id),
    ime: overrides.ime || 'Cypress',
    prezime: overrides.prezime || 'Employee',
    email,
    username,
  }))
}

export function updateEmployeePermissions(adminToken, employeeId, permissionNames) {
  return cy.request({
    method: 'PUT',
    url: `${API_BASE}/employees/${employeeId}/permissions`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { permissionNames },
  })
}

function normalizeMailhogBody(body) {
  return body
    .replace(/=\r?\n/g, '')
    .replace(/=3D/g, '=')
}

export function fetchMailhogLinkToken(toEmail, subjectHint, routePrefix, attempt = 0) {
  return cy.request('GET', 'http://localhost:8025/api/v2/messages').then(({ body }) => {
    const items = body.items || []
    const match = [...items].reverse().find((item) => {
      const toHeader = (item.Content?.Headers?.To || []).join(' ')
      const subjectHeader = (item.Content?.Headers?.Subject || []).join(' ')
      return toHeader.includes(toEmail) && subjectHeader.includes(subjectHint)
    })

    if (match) {
      const normalized = normalizeMailhogBody(match.Content?.Body || '')
      const tokenMatch = normalized.match(new RegExp(`${routePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"'<>\\s]+)`))
      expect(tokenMatch, 'mailhog activation token').to.not.be.null
      return tokenMatch[1]
    }

    if (attempt >= 10) {
      throw new Error(`Mailhog token not found for ${toEmail} / ${subjectHint}`)
    }

    cy.wait(1000)
    return fetchMailhogLinkToken(toEmail, subjectHint, routePrefix, attempt + 1)
  })
}

export function activateEmployee(token, password = 'EmpPass12!') {
  return cy.request('POST', `${API_BASE}/auth/activate`, {
    token,
    password,
    passwordConfirm: password,
  })
}

export { API_BASE }
