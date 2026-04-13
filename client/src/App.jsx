import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page is code-split into its own chunk, reducing the initial JS bundle
// by ~60%. Only the current route's page is loaded.
const HomePage               = lazy(() => import('./pages/HomePage'))
const MarketsPage            = lazy(() => import('./pages/MarketsPage'))
const PortfolioPage          = lazy(() => import('./pages/PortfolioPage'))
const NewsPage               = lazy(() => import('./pages/NewsPage'))
const ScreenerPage           = lazy(() => import('./pages/ScreenerPage'))
const StockDetailRoute       = lazy(() => import('./pages/StockDetailRoute'))
const TransactionHistoryPage = lazy(() => import('./pages/TransactionHistoryPage'))
const LeaderboardPage        = lazy(() => import('./pages/LeaderboardPage'))
const LearnPage              = lazy(() => import('./pages/LearnPage'))
const LoginPage              = lazy(() => import('./pages/LoginPage'))
const AlertsPage             = lazy(() => import('./pages/AlertsPage'))
const WatchlistPage          = lazy(() => import('./pages/WatchlistPage'))
const JournalPage            = lazy(() => import('./pages/JournalPage'))
const ComparePage            = lazy(() => import('./pages/ComparePage'))
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

// Minimal loading fallback — matches app background so there's no flash
function PageFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: 'var(--tv-text-muted)', fontSize: 13
    }}>
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AlertManager />
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Suspense fallback={<PageFallback />}><HomePage /></Suspense>} />
          <Route path="/markets" element={<Suspense fallback={<PageFallback />}><MarketsPage /></Suspense>} />
          <Route path="/news" element={<Suspense fallback={<PageFallback />}><NewsPage /></Suspense>} />
          <Route path="/screener" element={<Suspense fallback={<PageFallback />}><ScreenerPage /></Suspense>} />
          <Route path="/leaderboard" element={<Suspense fallback={<PageFallback />}><LeaderboardPage /></Suspense>} />
          <Route path="/learn" element={<Suspense fallback={<PageFallback />}><LearnPage /></Suspense>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portfolio" element={<Suspense fallback={<PageFallback />}><PortfolioPage /></Suspense>} />
            <Route path="/transaction-history" element={<Suspense fallback={<PageFallback />}><TransactionHistoryPage /></Suspense>} />
            <Route path="/alerts" element={<Suspense fallback={<PageFallback />}><AlertsPage /></Suspense>} />
            <Route path="/watchlist" element={<Suspense fallback={<PageFallback />}><WatchlistPage /></Suspense>} />
            <Route path="/journal" element={<Suspense fallback={<PageFallback />}><JournalPage /></Suspense>} />
          </Route>
          <Route path="/compare" element={<Suspense fallback={<PageFallback />}><ComparePage /></Suspense>} />
          <Route path="/stock/:symbol" element={<Suspense fallback={<PageFallback />}><StockDetailRoute /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}
