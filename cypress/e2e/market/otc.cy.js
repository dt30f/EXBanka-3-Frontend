const tradingClient = {
  id: '100',
  ime: 'Cypress',
  prezime: 'Trader',
  email: 'cypress.otc@example.com',
  permissions: ['clientBasic', 'clientTrading'],
}

const exchange = {
  name: 'NASDAQ',
  acronym: 'NASDAQ',
  micCode: 'XNAS',
  currency: 'USD',
}

function visitAsTradingClient(path) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem('client_access_token', 'cypress-client-token')
      win.sessionStorage.setItem('client_refresh_token', 'cypress-refresh-token')
      win.sessionStorage.setItem('client', JSON.stringify(tradingClient))
    },
  })
}

function assertNoExerciseAction() {
  cy.get('body').should('not.contain', 'Iskoristi')
  cy.get('button, a').then(($elements) => {
    expect($elements.text()).not.to.include('Iskoristi')
  })
}

function sampleOffer(overrides = {}) {
  return {
    id: 11,
    stockListingId: 1,
    sellerHoldingId: 501,
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange,
    amount: 3,
    pricePerStock: 151,
    currentPrice: 150,
    deviationPct: 0.67,
    settlementDate: '2026-07-15',
    premium: 25,
    lastModified: '2026-04-28T10:00:00Z',
    modifiedById: 100,
    modifiedByType: 'client',
    status: 'pending',
    buyerId: 100,
    buyerType: 'client',
    buyerAccountId: 45,
    sellerId: 200,
    sellerType: 'client',
    sellerAccountId: 46,
    ...overrides,
  }
}

describe('Client OTC portal', () => {
  it('renders public stocks and creates an initial OTC offer without exercise actions', () => {
    cy.intercept('GET', '/api/v1/otc/public-stocks', {
      statusCode: 200,
      body: {
        count: 1,
        stocks: [
          {
            holdingId: 501,
            sellerId: 200,
            sellerType: 'client',
            assetId: 1,
            ticker: 'AAPL',
            name: 'Apple Inc.',
            exchange: 'NASDAQ',
            currency: 'USD',
            price: 150,
            ask: 151,
            bid: 149,
            publicQuantity: 10,
            reservedQuantity: 2,
            availableQuantity: 8,
            lastRefresh: '2026-04-28T10:00:00Z',
          },
        ],
      },
    }).as('publicStocks')

    cy.intercept('GET', '/api/v1/accounts/client/100', {
      statusCode: 200,
      body: [
        {
          id: '45',
          brojRacuna: '111-0000000000045-00',
          clientId: '100',
          currencyKod: 'USD',
          status: 'aktivan',
          naziv: 'USD racun',
          stanje: 1000,
          raspolozivoStanje: 1000,
        },
      ],
    }).as('clientAccounts')

    cy.intercept('POST', '/api/v1/otc/offers', (req) => {
      expect(req.body).to.include({
        sellerHoldingId: 501,
        buyerAccountId: 45,
        amount: 3,
        pricePerStock: 151,
        premium: 25,
      })
      req.reply({
        statusCode: 201,
        body: { offer: sampleOffer({ id: 77 }) },
      })
    }).as('createOffer')

    visitAsTradingClient('/client/otc')
    cy.wait(['@publicStocks', '@clientAccounts'])

    cy.contains('h1', 'Javne akcije').should('be.visible')
    cy.contains('td', 'AAPL').should('be.visible')
    cy.contains('button', 'Kreiraj ponudu').click()

    cy.get('.offer-modal').within(() => {
      cy.get('select').select('45')
      cy.get('input[type="number"]').eq(0).clear().type('3')
      cy.get('input[type="number"]').eq(1).clear().type('151')
      cy.get('input[type="number"]').eq(2).clear().type('25')
      cy.contains('button', 'Kreiraj ponudu').click()
    })

    cy.wait('@createOffer')
    cy.contains('Ponuda #77 je kreirana za AAPL.').should('be.visible')
    assertNoExerciseAction()
  })

  it('supports local OTC offer negotiation actions on pending offers', () => {
    const offers = [
      sampleOffer({ id: 11, buyerId: 100, sellerId: 200, pricePerStock: 151, currentPrice: 150, deviationPct: 0.67 }),
      sampleOffer({ id: 12, buyerId: 300, sellerId: 100, modifiedById: 300, pricePerStock: 180, currentPrice: 150, deviationPct: 20 }),
      sampleOffer({ id: 13, buyerId: 400, sellerId: 100, modifiedById: 400, pricePerStock: 190, currentPrice: 150, deviationPct: 26.67 }),
    ]

    cy.intercept('GET', '/api/v1/otc/offers*', {
      statusCode: 200,
      body: { count: offers.length, status: 'pending', offers },
    }).as('offers')
    cy.intercept('POST', '/api/v1/otc/offers/11/counter', (req) => {
      expect(req.body).to.include({
        amount: 4,
        pricePerStock: 152,
        premium: 30,
      })
      req.reply({
        statusCode: 200,
        body: { offer: sampleOffer({ id: 11, amount: 4, pricePerStock: 152, currentPrice: 150, deviationPct: 1.33, premium: 30 }) },
      })
    }).as('counterOffer')
    cy.intercept('POST', '/api/v1/otc/offers/11/cancel', {
      statusCode: 200,
      body: { offer: sampleOffer({ id: 11, status: 'cancelled' }) },
    }).as('cancelOffer')
    cy.intercept('POST', '/api/v1/otc/offers/12/accept', {
      statusCode: 200,
      body: {
        contract: {
          id: 901,
          offerId: 12,
          stockListingId: 1,
          sellerHoldingId: 501,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          exchange,
          amount: 3,
          strikePrice: 151,
          currentPrice: 165,
          premium: 25,
          profit: 17,
          settlementDate: '2026-07-15',
          buyerId: 300,
          buyerType: 'client',
          buyerAccountId: 45,
          sellerId: 100,
          sellerType: 'client',
          sellerAccountId: 46,
          status: 'valid',
          createdAt: '2026-04-28T10:00:00Z',
        },
      },
    }).as('acceptOffer')
    cy.intercept('POST', '/api/v1/otc/offers/13/decline', {
      statusCode: 200,
      body: { offer: sampleOffer({ id: 13, status: 'declined', sellerId: 100 }) },
    }).as('declineOffer')

    visitAsTradingClient('/client/otc/offers')
    cy.wait('@offers')

    cy.contains('h1', 'Aktivne ponude').should('be.visible')
    cy.contains('th', 'Odstupanje').should('be.visible')
    cy.contains('tr', '#11').should('contain', 'Kupac')
    cy.contains('tr', '#12').should('contain', 'Prodavac')
    cy.contains('tr', '#11').find('.deviation-green').should('contain', '+0.67%')
    cy.contains('tr', '#12').find('.deviation-yellow').should('contain', '+20.00%')
    cy.contains('tr', '#13').find('.deviation-red').should('contain', '+26.67%')

    cy.contains('tr', '#11').within(() => {
      cy.contains('button', 'Kontra').click()
    })
    cy.get('.offer-modal').within(() => {
      cy.get('input[type="number"]').eq(0).clear().type('4')
      cy.get('input[type="number"]').eq(1).clear().type('152')
      cy.get('input[type="number"]').eq(2).clear().type('30')
      cy.contains('button', 'Posalji kontraponudu').click()
    })
    cy.wait('@counterOffer')
    cy.contains('Kontraponuda za ponudu #11 je poslata.').should('be.visible')

    cy.contains('tr', '#11').within(() => {
      cy.contains('button', 'Otkazi').click()
    })
    cy.wait('@cancelOffer')
    cy.contains('Ponuda #11 je otkazana.').should('be.visible')

    cy.contains('tr', '#12').within(() => {
      cy.contains('button', 'Prihvati').click()
    })
    cy.wait('@acceptOffer')
    cy.contains('Kreiran je ugovor #901.').should('be.visible')

    cy.contains('tr', '#13').within(() => {
      cy.contains('button', 'Odbij').click()
    })
    cy.wait('@declineOffer')
    cy.contains('Ponuda #13 je odbijena.').should('be.visible')
    assertNoExerciseAction()
  })

  it('renders OTC contracts read-only without the exercise action', () => {
    cy.intercept('GET', '/api/v1/otc/contracts*', {
      statusCode: 200,
      body: {
        count: 1,
        status: 'valid',
        contracts: [
          {
            id: 901,
            offerId: 12,
            stockListingId: 1,
            sellerHoldingId: 501,
            ticker: 'AAPL',
            name: 'Apple Inc.',
            exchange,
            amount: 3,
            strikePrice: 151,
            currentPrice: 165,
            premium: 25,
            profit: 17,
            settlementDate: '2026-07-15',
            buyerId: 100,
            buyerType: 'client',
            buyerAccountId: 45,
            sellerId: 200,
            sellerType: 'client',
            sellerAccountId: 46,
            status: 'valid',
            createdAt: '2026-04-28T10:00:00Z',
          },
        ],
      },
    }).as('contracts')

    visitAsTradingClient('/client/otc/contracts')
    cy.wait('@contracts')

    cy.contains('h1', 'Sklopljeni ugovori').should('be.visible')
    cy.contains('td', 'AAPL').should('be.visible')
    cy.contains('th', 'Profit').should('be.visible')
    cy.contains('td', '17.00 USD').should('be.visible')
    cy.contains('.status-pill', 'Vazeci').should('be.visible')
    assertNoExerciseAction()
  })
})
