import { adminLogin as adminAccessToken } from '../helpers/banking'
import {
  activateEmployee,
  createEmployee,
  fetchMailhogLinkToken,
  loginEmployeeUi,
  updateEmployeePermissions,
} from '../helpers/employee'

const EMPLOYEE_PASSWORD = 'EmpPass12!'

function assertNoExerciseActions() {
  cy.get('button, a').then(($elements) => {
    const text = $elements.text().toLowerCase()
    expect(text).not.to.include('iskoristi')
    expect(text).not.to.include('exercise')
  })
}

describe('Employee market foundation', () => {
  it('allows an actuary employee to open employee securities and portfolio pages', () => {
    const testData = {}

    adminAccessToken()
      .then((adminToken) => {
        testData.adminToken = adminToken
        return createEmployee(adminToken, 'market-agent', {
          ime: 'Market',
          prezime: 'Agent',
          pozicija: 'Agent',
        }).then((employee) => {
          testData.employee = employee
          return updateEmployeePermissions(adminToken, employee.id, ['employeeAgent'])
        })
      })
      .then(() =>
        fetchMailhogLinkToken(testData.employee.email, 'Activate Your Bank Account', '/activate/')
      )
      .then((token) => activateEmployee(token, EMPLOYEE_PASSWORD))
      .then(() => {
        loginEmployeeUi(testData.employee.email, EMPLOYEE_PASSWORD)

        cy.get('.sidebar-nav').should('contain', 'Hartije')
        cy.get('.sidebar-nav').should('contain', 'Portfolio')
        cy.get('.sidebar-nav').should('not.contain', 'Aktuari')

        cy.visit('/securities')
        cy.contains('h1', 'Hartije od vrednosti').should('be.visible')
        cy.contains('td', 'AAPL').should('be.visible')
        assertNoExerciseActions()

        cy.visit('/portfolio')
        cy.contains('h1', 'Portfolio').should('be.visible')
        cy.get('body').then(($body) => {
          if ($body.find('.portfolio-table tbody tr').length > 0) {
            cy.contains('h2', 'Pozicije').should('be.visible')
            cy.get('.portfolio-table tbody tr').first().find('a').should('exist')
          } else {
            cy.contains('Portfolio trenutno nema aktivnih pozicija.').should('be.visible')
          }
        })
        assertNoExerciseActions()

        cy.visit('/actuaries')
        cy.url().should('include', '/clients')
      })
  })

  it('allows an admin to open the actuaries management page', () => {
    loginEmployeeUi()

    cy.get('.sidebar-nav').should('contain', 'Aktuari')

    cy.visit('/actuaries')
    cy.contains('h1', 'Aktuari i supervizori').should('be.visible')
    cy.contains('h2', 'Lista ovlascenih zaposlenih').should('be.visible')
    cy.contains('admin@bank.com').should('be.visible')
  })
})
