import { getBuyBoxes } from '@/lib/actions/buybox'
import BuyBoxSettings from '@/components/settings/BuyBoxSettings'

export default async function BuyBoxPage() {
  const { buyBoxes } = await getBuyBoxes()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BuyBoxSettings buyBoxes={buyBoxes ?? []} />
    </div>
  )
}
