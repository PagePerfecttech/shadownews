export interface TeluguFeedSource {
  id: string
  name: string
  nameTe: string
  url: string
  categorySlug?: string
  stateCode?: 'TG' | 'AP' | 'ALL'
  description: string
  badgeColor: string
  iconText: string
}

export const TELUGU_FEED_SOURCES: TeluguFeedSource[] = [
  {
    id: 'gnews-te-top',
    name: 'Google News - Telugu Top Stories',
    nameTe: 'గూగుల్ న్యూస్ - ముఖ్యాంశాలు',
    url: 'https://news.google.com/rss?hl=te&gl=IN&ceid=IN:te',
    stateCode: 'ALL',
    description: 'Real-time aggregation from all top Telugu media houses (Eenadu, Sakshi, TV9, Andhrajyothy, etc.)',
    badgeColor: '#2563EB',
    iconText: 'GNews',
  },
  {
    id: 'gnews-te-telangana',
    name: 'Google News - Telangana',
    nameTe: 'తెలంగాణ తాజా వార్తలు',
    url: 'https://news.google.com/rss/search?q=తెలంగాణ&hl=te&gl=IN&ceid=IN:te',
    stateCode: 'TG',
    description: 'Dedicated Telangana state & district hyperlocal coverage',
    badgeColor: '#DC2626',
    iconText: 'TG',
  },
  {
    id: 'gnews-te-ap',
    name: 'Google News - Andhra Pradesh',
    nameTe: 'ఆంధ్రప్రదేశ్ తాజా వార్తలు',
    url: 'https://news.google.com/rss/search?q=ఆంధ్రప్రదేశ్&hl=te&gl=IN&ceid=IN:te',
    stateCode: 'AP',
    description: 'Dedicated Andhra Pradesh state & district hyperlocal coverage',
    badgeColor: '#059669',
    iconText: 'AP',
  },
  {
    id: 'gnews-te-politics',
    name: 'Google News - Telugu Politics',
    nameTe: 'రాజకీయ ముఖ్యాంశాలు',
    url: 'https://news.google.com/rss/search?q=రాజకీయాలు&hl=te&gl=IN&ceid=IN:te',
    categorySlug: 'politics',
    stateCode: 'ALL',
    description: 'Assembly, party politics, governance, and election coverage',
    badgeColor: '#7C3AED',
    iconText: 'POL',
  },
  {
    id: 'gnews-te-cinema',
    name: 'Google News - Tollywood & Cinema',
    nameTe: 'సినిమా & ఎంటర్‌టైన్‌మెంట్',
    url: 'https://news.google.com/rss/search?q=సినిమా&hl=te&gl=IN&ceid=IN:te',
    categorySlug: 'entertainment',
    stateCode: 'ALL',
    description: 'Tollywood news, movie updates, box office, celebrity buzz',
    badgeColor: '#D97706',
    iconText: 'CINE',
  },
  {
    id: 'gnews-te-sports',
    name: 'Google News - Sports & Cricket',
    nameTe: 'క్రీడలు & క్రికెట్',
    url: 'https://news.google.com/rss/search?q=క్రీడలు+క్రికెట్&hl=te&gl=IN&ceid=IN:te',
    categorySlug: 'sports',
    stateCode: 'ALL',
    description: 'IPL, Indian cricket team, national & international sports',
    badgeColor: '#0891B2',
    iconText: 'SPT',
  },
  {
    id: 'abp-desam',
    name: 'ABP Desam Telugu',
    nameTe: 'ఏబీపీ దేశం',
    url: 'https://telugu.abplive.com/home/feed',
    stateCode: 'ALL',
    description: 'Breaking news, regional analysis, and feature stories from ABP Desam',
    badgeColor: '#EA580C',
    iconText: 'ABP',
  },
  {
    id: 'tv9-telugu',
    name: 'TV9 Telugu',
    nameTe: 'టీవీ9 తెలుగు',
    url: 'https://tv9telugu.com/feed',
    stateCode: 'ALL',
    description: 'Live broadcast feed and breaking alerts from TV9 Network',
    badgeColor: '#B91C1C',
    iconText: 'TV9',
  },
  {
    id: 'sakshi-news',
    name: 'Sakshi News',
    nameTe: 'సాక్షి వార్తలు',
    url: 'https://www.sakshi.com/rss.xml',
    stateCode: 'ALL',
    description: 'Comprehensive regional reporting across AP and Telangana',
    badgeColor: '#0284C7',
    iconText: 'SK',
  },
  {
    id: 'teluguone-latest',
    name: 'TeluguOne Latest News',
    nameTe: 'తెలుగువన్ లేటెస్ట్ న్యూస్',
    url: 'https://www.teluguone.com/news/rss/latestnews/latestnews-25.rss',
    stateCode: 'ALL',
    description: 'Top trending articles, editorial pieces, and daily headlines',
    badgeColor: '#4F46E5',
    iconText: 'TO',
  },
  {
    id: 'asianet-telugu',
    name: 'Asianet News Telugu',
    nameTe: 'ఏషియానెట్ న్యూస్ తెలుగు',
    url: 'https://telugu.asianetnews.com/rss',
    stateCode: 'ALL',
    description: 'Fast updates on regional politics, national events, and business',
    badgeColor: '#16A34A',
    iconText: 'AN',
  },
]

