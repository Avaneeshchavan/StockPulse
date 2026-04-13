import { useState, useMemo, useEffect } from 'react'
import { LEARN_CATEGORIES } from '../data/learnContent.js'

/* ── Components ────────────────────────────────────────────────────────────── */

function CategoryBadge({ children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: 'var(--tv-accent)', background: 'var(--tv-accent-dim)',
      padding: '2px 8px', borderRadius: 4,
      textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {children}
    </span>
  )
}

function ArticleCard({ article, categoryTitle, isRead, onClick }) {
  return (
    <div
      onClick={() => onClick(article.id)}
      style={{
        background: 'var(--tv-bg-secondary)',
        border: '1px solid var(--tv-border)',
        borderRadius: 8, padding: 20,
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 12,
        height: '100%'
      }}
      className="learn-article-card"
      onMouseEnter={(e) => { 
        e.currentTarget.style.borderColor = 'var(--tv-accent)'; 
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.borderColor = 'var(--tv-border)'; 
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CategoryBadge>{categoryTitle}</CategoryBadge>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isRead && (
            <span title="Read" style={{ color: '#22c55e', fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--tv-text-muted)' }}>{article.readTime}</span>
        </div>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tv-text-primary)', margin: 0, lineHeight: 1.4 }}>
        {article.title}
      </h3>
      <p style={{
        fontSize: 13, color: 'var(--tv-text-secondary)',
        lineHeight: 1.6, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
      }}>
        {article.description}
      </p>
    </div>
  )
}

function ArticleReader({ article, categoryTitle, onBack, onNavigate }) {
  // Find all articles for related section
  const allArticles = useMemo(() => {
    return LEARN_CATEGORIES.flatMap(cat => cat.articles.map(a => ({ ...a, categoryTitle: cat.title })))
  }, [])

  const related = useMemo(() => {
    return allArticles
      .filter(a => a.categoryTitle === categoryTitle && a.id !== article.id)
      .slice(0, 3)
  }, [allArticles, categoryTitle, article.id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [article.id])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: 'var(--tv-text-muted)',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0', marginBottom: 32, transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--tv-accent)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--tv-text-muted)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Hub
      </button>

      <div style={{ marginBottom: 40 }}>
        <CategoryBadge>{categoryTitle}</CategoryBadge>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--tv-text-primary)', margin: '16px 0 12px 0', lineHeight: 1.2 }}>
          {article.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--tv-text-muted)', fontSize: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {article.readTime}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {article.content.map((section, i) => (
          <section key={i} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              color: 'var(--tv-text-primary)', 
              margin: 0,
              paddingLeft: 12,
              borderLeft: '4px solid var(--tv-accent)'
            }}>
              {section.heading}
            </h2>
            <p style={{ 
              fontSize: 16, 
              lineHeight: 1.8, 
              color: 'var(--tv-text-secondary)', 
              margin: 0,
              textAlign: 'justify'
            }}>
              {section.body}
            </p>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 80, borderTop: '1px solid var(--tv-border)', paddingTop: 40 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tv-text-primary)', marginBottom: 24 }}>
            Continue Learning in {categoryTitle}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {related.map(r => (
              <ArticleCard 
                key={r.id} 
                article={r} 
                categoryTitle={r.categoryTitle}
                onClick={onNavigate} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */

export default function LearnPage() {
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState(LEARN_CATEGORIES[0].title)
  const [selectedArticleId, setSelectedArticleId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [readArticles, setReadArticles] = useState(() => {
    const saved = localStorage.getItem('stockpulse_read_articles')
    return saved ? JSON.parse(saved) : []
  })

  // Persist read articles
  useEffect(() => {
    localStorage.setItem('stockpulse_read_articles', JSON.stringify(readArticles))
  }, [readArticles])

  // Mark article as read when selected
  useEffect(() => {
    if (selectedArticleId && !readArticles.includes(selectedArticleId)) {
      setReadArticles(prev => [...prev, selectedArticleId])
    }
  }, [selectedArticleId])

  const allArticles = useMemo(() => {
    return LEARN_CATEGORIES.flatMap(cat => 
      cat.articles.map(a => ({ ...a, categoryTitle: cat.title }))
    )
  }, [])

  const filteredArticles = useMemo(() => {
    if (searchQuery.trim()) {
      return allArticles.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    const cat = LEARN_CATEGORIES.find(c => c.title === selectedCategoryTitle)
    return cat ? cat.articles.map(a => ({ ...a, categoryTitle: cat.title })) : []
  }, [selectedCategoryTitle, searchQuery, allArticles])

  const currentArticle = useMemo(() => {
    return allArticles.find(a => a.id === selectedArticleId)
  }, [selectedArticleId, allArticles])

  const getCategoryProgress = (category) => {
    const total = category.articles.length
    const read = category.articles.filter(a => readArticles.includes(a.id)).length
    return { total, read, percentage: (read / total) * 100 }
  }

  if (currentArticle) {
    return (
      <div style={{ background: 'var(--tv-bg-primary)', minHeight: 'calc(100vh - 64px)' }}>
        <ArticleReader
          article={currentArticle}
          categoryTitle={currentArticle.categoryTitle}
          onBack={() => setSelectedArticleId(null)}
          onNavigate={(id) => setSelectedArticleId(id)}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: 'var(--tv-bg-primary)' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, flexShrink: 0,
        borderRight: '1px solid var(--tv-border)',
        background: 'var(--tv-bg-secondary)',
        padding: '24px 0', overflowY: 'auto',
        position: 'sticky', top: 64, height: 'calc(100vh - 64px)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '0 20px 20px 20px' }}>
          <h2 style={{
            fontSize: 11, fontWeight: 800, color: 'var(--tv-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0
          }}>
            Categories
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LEARN_CATEGORIES.map(cat => {
            const { total, read } = getCategoryProgress(cat)
            const isActive = selectedCategoryTitle === cat.title && !searchQuery
            
            return (
              <button
                key={cat.title}
                onClick={() => {
                  setSelectedCategoryTitle(cat.title)
                  setSearchQuery('')
                }}
                style={{
                  textAlign: 'left', padding: '12px 20px',
                  background: isActive ? 'var(--tv-accent-dim)' : 'transparent',
                  border: 'none', borderLeft: `3px solid ${isActive ? 'var(--tv-accent)' : 'transparent'}`,
                  color: isActive ? 'var(--tv-accent)' : 'var(--tv-text-secondary)',
                  fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 4
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--tv-text-primary)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--tv-text-secondary)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                   <span>{cat.title}</span>
                   {read === total && total > 0 && (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                       <polyline points="20 6 9 17 4 12"></polyline>
                     </svg>
                   )}
                </div>
                <div style={{ fontSize: 10, color: isActive ? 'var(--tv-accent)' : 'var(--tv-text-muted)', fontWeight: 400 }}>
                  {read} of {total} articles read
                </div>
                <div style={{ 
                  width: '100%', height: 2, background: 'var(--tv-border)', 
                  borderRadius: 1, marginTop: 4, overflow: 'hidden' 
                }}>
                  <div style={{ 
                    width: `${(read/total)*100}%`, height: '100%', 
                    background: isActive ? 'var(--tv-accent)' : 'var(--tv-text-muted)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '40px 60px', maxWidth: 1200 }}>
        {/* Header & Search */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 40 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--tv-text-primary)', marginBottom: 8 }}>
                Learning Hub
              </h1>
              <p style={{ fontSize: 15, color: 'var(--tv-text-secondary)', margin: 0, maxWidth: 600 }}>
                Master the art of trading and investing with our structured education path. 
                Track your progress as you level up your skills.
              </p>
            </div>
            
            <div style={{ position: 'relative', width: 300 }}>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--tv-bg-secondary)',
                  border: '1px solid var(--tv-border)',
                  borderRadius: 8,
                  padding: '12px 16px 12px 40px',
                  color: 'var(--tv-text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--tv-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--tv-border)'}
              />
              <svg 
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tv-text-muted)' }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--tv-border)', width: '100%' }}></div>
        </div>

        {searchQuery && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tv-text-primary)' }}>
              Search results for "{searchQuery}"
              <span style={{ marginLeft: 12, fontSize: 14, color: 'var(--tv-text-muted)', fontWeight: 400 }}>
                {filteredArticles.length} articles found
              </span>
            </h2>
          </div>
        )}

        {filteredArticles.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24
          }}>
            {filteredArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                categoryTitle={article.categoryTitle}
                isRead={readArticles.includes(article.id)}
                onClick={(id) => setSelectedArticleId(id)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '80px 0', textAlign: 'center', color: 'var(--tv-text-muted)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
          }}>
            <div style={{ fontSize: 64 }}>🔍</div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--tv-text-secondary)' }}>
                No articles found
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
                Try adjusting your search terms or browse categories.
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'var(--tv-accent)', color: 'white',
                border: 'none', padding: '10px 24px', borderRadius: 6,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                marginTop: 12
              }}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
