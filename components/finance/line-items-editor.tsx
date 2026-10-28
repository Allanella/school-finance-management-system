'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/school/format-currency'

type DraftLineItem = { name: string; amount_ugx: string }

type LineItemsEditorProps = {
  idPrefix: string
  itemLabel: string
  currencyCode: string
  countryCode: string
  allowZeroAmounts?: boolean
}

export function LineItemsEditor({ idPrefix, itemLabel, currencyCode, countryCode, allowZeroAmounts = true }: LineItemsEditorProps) {
  const [items, setItems] = useState<DraftLineItem[]>([{ name: '', amount_ugx: '' }])
  const total = items.reduce((sum, item) => {
    const amount = Number(item.amount_ugx)
    return Number.isSafeInteger(amount) && amount >= 0 ? sum + amount : sum
  }, 0)
  const serializedItems = JSON.stringify(items.map((item) => ({ name: item.name, amount_ugx: item.amount_ugx })))

  function updateItem(index: number, field: keyof DraftLineItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  return (
    <section aria-label={`${itemLabel} line items`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Line items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 20}
          onClick={() => setItems((current) => current.length < 20 ? [...current, { name: '', amount_ugx: '' }] : current)}
        >
          <Plus aria-hidden="true" data-icon="inline-start" /> Add item
        </Button>
      </div>
      <input type="hidden" name="items_json" value={serializedItems} />
      <FieldGroup className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(7rem,0.8fr)_2.75rem]">
        {items.map((item, index) => (
          <div key={`${idPrefix}-${index}`} className="contents">
            <Field className="col-span-2 min-w-0 sm:col-span-1">
              <FieldLabel htmlFor={`${idPrefix}-name-${index}`}>{itemLabel} {index + 1}</FieldLabel>
              <Input
                id={`${idPrefix}-name-${index}`}
                value={item.name}
                onChange={(event) => updateItem(index, 'name', event.target.value)}
                maxLength={100}
                required
                placeholder={itemLabel}
              />
            </Field>
            <Field className="min-w-0">
              <FieldLabel htmlFor={`${idPrefix}-amount-${index}`}>Amount ({currencyCode})</FieldLabel>
              <Input
                id={`${idPrefix}-amount-${index}`}
                type="number"
                inputMode="numeric"
                min={allowZeroAmounts ? 0 : 1}
                step="1"
                value={item.amount_ugx}
                onChange={(event) => updateItem(index, 'amount_ugx', event.target.value)}
                required
                placeholder="0"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </FieldGroup>
      <p aria-live="polite" className="text-xs text-muted-foreground">Estimated total: <span className="font-medium text-foreground">{formatCurrency(total, currencyCode, countryCode)}</span></p>
      {items.length >= 20 ? <p className="text-xs text-muted-foreground">A maximum of 20 line items is allowed.</p> : null}
    </section>
  )
}
