export type QueuedPayment = {
  request_key: string
  user_id: string
  school_id: string
  student_id: string
  invoice_id: string | null
  amount_ugx: number
  payment_method: string
  reference: string | null
  queued_at: string
}

const DATABASE_NAME = 'school-finance-offline'
const STORE_NAME = 'queued-payments'
const DATABASE_VERSION = 1

function openQueueDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline payment storage is unavailable in this browser.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'request_key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open offline payment storage.'))
  })
}

export async function listQueuedPayments(): Promise<QueuedPayment[]> {
  const database = await openQueueDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()
    let records: QueuedPayment[] = []
    request.onsuccess = () => { records = request.result as QueuedPayment[] }
    request.onerror = () => reject(request.error ?? new Error('Could not read queued payments.'))
    transaction.oncomplete = () => {
      database.close()
      resolve(records)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Could not read queued payments.'))
    }
  })
}

export async function enqueuePayment(payment: QueuedPayment): Promise<void> {
  const database = await openQueueDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(payment)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the payment offline.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not save the payment offline.'))
  }).finally(() => database.close())
}

export async function removeQueuedPayment(requestKey: string): Promise<void> {
  const database = await openQueueDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(requestKey)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the synced payment.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not remove the synced payment.'))
  }).finally(() => database.close())
}

export async function clearQueuedPaymentsForUser(userId: string): Promise<void> {
  const records = await listQueuedPayments()
  const userRecords = records.filter((record) => record.user_id === userId)
  await Promise.all(userRecords.map((record) => removeQueuedPayment(record.request_key)))
}
