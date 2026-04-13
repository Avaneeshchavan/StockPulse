import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import MarketsPage from './pages/MarketsPage'
import PortfolioPage from './pages/PortfolioPage'
import NewsPage from './pages/NewsPage'
import ScreenerPage from './pages/ScreenerPage'
import StockDetailRoute from './pages/StockDetailRoute'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import LeaderboardPage from './pages/LeaderboardPage'
import LearnPage from './pages/LearnPage'
import LoginPage from './pages/LoginPage'
import AlertsPage from './pages/AlertsPage'
import WatchlistPage from './pages/WatchlistPage'
import JournalPage from './pages/JournalPage'
import ComparePage from './pages/ComparePage'
import AlertManager from './components/AlertManager'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      refetchInterval: 30000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AlertManager />
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route
              path="/transaction-history"
              element={<TransactionHistoryPage />}
            />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/journal" element={<JournalPage />} />
          </Route>
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/stock/:symbol" element={<StockDetailRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}
