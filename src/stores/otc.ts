import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  otcApi,
  type CounterOtcOfferPayload,
  type CreateOtcOfferPayload,
  type OtcOffer,
  type OtcContract,
  type OtcContractStatus,
  type OtcOfferStatus,
  type PublicOtcStock,
} from '../api/otc'

export const useOtcStore = defineStore('otc', () => {
  const publicStocks = ref<PublicOtcStock[]>([])
  const contracts = ref<OtcContract[]>([])
  const offers = ref<OtcOffer[]>([])
  const lastCreatedOffer = ref<OtcOffer | null>(null)
  const selectedContractStatus = ref<OtcContractStatus>('')
  const selectedOfferStatus = ref<OtcOfferStatus>('pending')
  const loadingStocks = ref(false)
  const loadingContracts = ref(false)
  const loadingOffers = ref(false)
  const creatingOffer = ref(false)
  const updatingOffer = ref(false)
  const error = ref('')

  const availablePublicQuantity = computed(() =>
    publicStocks.value.reduce((sum, stock) => sum + stock.availableQuantity, 0)
  )

  const validContracts = computed(() =>
    contracts.value.filter((contract) => contract.status === 'valid')
  )

  const pendingOffers = computed(() =>
    offers.value.filter((offer) => offer.status === 'pending')
  )

  async function fetchPublicStocks() {
    loadingStocks.value = true
    error.value = ''
    try {
      const res = await otcApi.listPublicStocks()
      publicStocks.value = res.data.stocks ?? []
    } catch (e: any) {
      publicStocks.value = []
      error.value = e?.response?.data?.message ?? 'Failed to load OTC public stocks.'
    } finally {
      loadingStocks.value = false
    }
  }

  async function fetchContracts(status: OtcContractStatus = selectedContractStatus.value) {
    loadingContracts.value = true
    error.value = ''
    selectedContractStatus.value = status
    try {
      const res = await otcApi.listContracts(status)
      contracts.value = res.data.contracts ?? []
    } catch (e: any) {
      contracts.value = []
      error.value = e?.response?.data?.message ?? 'Failed to load OTC contracts.'
    } finally {
      loadingContracts.value = false
    }
  }

  async function fetchOffers(status: OtcOfferStatus = selectedOfferStatus.value) {
    loadingOffers.value = true
    error.value = ''
    selectedOfferStatus.value = status
    try {
      const res = await otcApi.listOffers(status)
      offers.value = res.data.offers ?? []
    } catch (e: any) {
      offers.value = []
      error.value = e?.response?.data?.message ?? 'Failed to load OTC offers.'
    } finally {
      loadingOffers.value = false
    }
  }

  async function createOffer(payload: CreateOtcOfferPayload) {
    creatingOffer.value = true
    error.value = ''
    try {
      const res = await otcApi.createOffer(payload)
      lastCreatedOffer.value = res.data.offer
      return res.data.offer
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to create OTC offer.'
      throw e
    } finally {
      creatingOffer.value = false
    }
  }

  async function counterOffer(offerId: number, payload: CounterOtcOfferPayload) {
    updatingOffer.value = true
    error.value = ''
    try {
      const res = await otcApi.counterOffer(offerId, payload)
      return res.data.offer
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to send OTC counteroffer.'
      throw e
    } finally {
      updatingOffer.value = false
    }
  }

  async function acceptOffer(offerId: number) {
    updatingOffer.value = true
    error.value = ''
    try {
      const res = await otcApi.acceptOffer(offerId)
      return res.data.contract
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to accept OTC offer.'
      throw e
    } finally {
      updatingOffer.value = false
    }
  }

  async function declineOffer(offerId: number) {
    updatingOffer.value = true
    error.value = ''
    try {
      const res = await otcApi.declineOffer(offerId)
      return res.data.offer
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to decline OTC offer.'
      throw e
    } finally {
      updatingOffer.value = false
    }
  }

  async function cancelOffer(offerId: number) {
    updatingOffer.value = true
    error.value = ''
    try {
      const res = await otcApi.cancelOffer(offerId)
      return res.data.offer
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to cancel OTC offer.'
      throw e
    } finally {
      updatingOffer.value = false
    }
  }

  return {
    publicStocks,
    contracts,
    offers,
    lastCreatedOffer,
    selectedContractStatus,
    selectedOfferStatus,
    loadingStocks,
    loadingContracts,
    loadingOffers,
    creatingOffer,
    updatingOffer,
    error,
    availablePublicQuantity,
    validContracts,
    pendingOffers,
    fetchPublicStocks,
    fetchContracts,
    fetchOffers,
    createOffer,
    counterOffer,
    acceptOffer,
    declineOffer,
    cancelOffer,
  }
})
