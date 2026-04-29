import { getBuyBoxes } from '@/lib/actions/buybox'
import BuyBoxSettings from '@/components/settings/BuyBoxSettings'

export default async function BuyBoxPage() {
  const { buyBoxes } = await getBuyBoxes()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Buy Box</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Define your investment thresholds by asset type. The AI uses these when scoring inbound deals.
        </p>
      </div>
      <BuyBoxSettings buyBoxes={(buyBoxes ?? []) as any} />
    </div>
  )
}
