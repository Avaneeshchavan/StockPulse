import { useParams } from 'react-router-dom'
import StockDetailPage from './StockDetailPage'

/** Remount detail view when :symbol changes so local state resets without sync effects. */
export default function StockDetailRoute() {
  const { symbol } = useParams()
  const key = (symbol || 'AAPL').toUpperCase()
  return <StockDetailPage key={key} />
}
