import {
  activateClient,
  adminLogin,
  createClient,
  loginClientUi,
  updateClientPermissions,
} from '../helpers/banking'

function assertNoTradingActions() {
  cy.get('button, a').then(($elements) => {
    const text = $elements.text().toLowerCase()
    expect(text).not.to.include('kupi')
    expect(text).not.to.include('prodaj')
    expect(text).not.to.include('buy')
    expect(text).not.to.include('sell')
  })
}

describe('Client market foundation', () => {
  it('allows a trading-enabled client to browse securities details and portfolio in read-only mode', () => {
    const testData = {}

    adminLogin()
      .then((employeeToken) => {
        testData.employeeToken = employeeToken
        return createClient(employeeToken, 'market-trading').then((client) => {
          testData.client = client
          return updateClientPermissions(employeeToken, client.id, ['clientBasic', 'clientTrading'])
        })
      })
      .then(() => activateClient(testData.client.setupToken))
      .then(() => {
        loginClientUi(testData.client.email)

        cy.get('.sidebar-nav').should('contain', 'Hartije')
        cy.get('.sidebar-nav').should('contain', 'Portfolio')

        cy.visit('/client/securities')
        cy.contains('h1', 'Hartije od vrednosti').should('be.visible')
        cy.contains('td', 'AAPL').should('be.visible')
        cy.get('input[placeholder*="ticker"]').clear().type('Apple')
        cy.contains('td', 'AAPL').should('be.visible')
        assertNoTradingActions()

        cy.visit('/client/securities/AAPL')
        cy.contains('h1', 'Apple Inc.').should('be.visible')
        cy.contains('h2', 'Istorija kretanja cene').should('be.visible')
        assertNoTradingActions()

        cy.visit('/client/portfolio')
        cy.contains('h1', 'Portfolio').should('be.visible')
        cy.contains('h2', 'Pozicije').should('be.visible')
        cy.get('.portfolio-table tbody tr').should('have.length.greaterThan', 0)
        cy.get('.portfolio-table tbody tr').first().find('a').should('exist')
        assertNoTradingActions()
      })
  })

  it('hides market navigation and redirects a client without trading permission', () => {
    const testData = {}

    adminLogin()
      .then((employeeToken) =>
        createClient(employeeToken, 'market-basic').then((client) => {
          testData.client = client
        })
      )
      .then(() => activateClient(testData.client.setupToken))
      .then(() => {
        loginClientUi(testData.client.email)

        cy.get('.sidebar-nav').should('not.contain', 'Hartije')
        cy.get('.sidebar-nav').should('not.contain', 'Portfolio')

        cy.visit('/client/securities')
        cy.url().should('include', '/client/dashboard')

        cy.visit('/client/portfolio')
        cy.url().should('include', '/client/dashboard')
      })
  })
})
