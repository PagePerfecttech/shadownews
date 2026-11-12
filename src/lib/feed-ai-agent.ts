/**
 * Intelligent AI News Agent for Telugu Short News.
 * Powered by Google Gemini with deep Telugu NLP Heuristics for 100% reliable
 * Short News Rewriting, Auto-Categorization, and Hyperlocal Location Tagging.
 */

import { db } from './db'
import { getGeminiModelsToTry } from './gemini-service'
import { RawFeedItem } from './feed-parser'

export interface CategoryInfo {
  id: string
  name: string
  slug: string
}

export interface StateInfo {
  id: string
  name: string
  code: string
}

export interface DistrictInfo {
  id: string
  name: string
  stateId: string
}

export interface AIProcessOptions {
  autoRewrite?: boolean
  autoCategory?: boolean
  autoLocation?: boolean
  defaultCategoryId?: string
  defaultStateId?: string
}

export interface ProcessedArticleResult {
  title: string
  shortDesc: string
  content: string
  aiTitle: string
  aiShortDesc: string
  aiContent: string
  aiStatus: 'generated' | 'fallback'
  categoryId: string
  categorySlug: string
  stateId: string
  stateCode: string
  districtId?: string | null
  districtName?: string | null
  mandalId?: string | null
  mandalName?: string | null
  tags: string[]
  confidence: {
    category: number
    location: number
  }
}

// ==========================================
// TELUGU DISTRICT & LOCATION DICTIONARIES
// ==========================================

interface DistrictMapping {
  englishName: string
  stateCode: 'TG' | 'AP'
  keywords: string[]
}

const TELUGU_DISTRICT_KEYWORDS: DistrictMapping[] = [
  // --- TELANGANA DISTRICTS ---
  {
    englishName: 'Hyderabad',
    stateCode: 'TG',
    keywords: [
      'హైదరాబాద్', 'భాగ్యనగరం', 'సికింద్రాబాద్', 'సికింద్రాబాదు', 'చార్మినార్',
      'బంజారాహిల్స్', 'జూబ్లీహిల్స్', 'హైటెక్ సిటీ', 'గచ్చిబౌలి', 'మాదాపూర్',
      'అమీర్‌పేట్', 'ఖైరతాబాద్', 'పంజాగుట్ట', 'దిల్‌సుఖ్‌నగర్', 'కోటి', 'గోల్కొండ', 'జీహెచ్‌ఎంసీ'
    ],
  },
  {
    englishName: 'Medchal Malkajgiri',
    stateCode: 'TG',
    keywords: ['మేడ్చల్', 'మల్కాజిగిరి', 'కూకట్‌పల్లి', 'ఉప్పల్', 'కుత్బుల్లాపూర్', 'కాప్రా', 'అల్వాల్', 'మేడ్చల్-మల్కాజిగిరి'],
  },
  {
    englishName: 'Rangareddy',
    stateCode: 'TG',
    keywords: ['రంగారెడ్డి', 'శంషాబాద్', 'రాజేంద్రనగర్', 'ఇబ్రహీంపట్నం', 'చేవెళ్ల', 'షాద్‌నగర్', 'మహేశ్వరం'],
  },
  {
    englishName: 'Warangal',
    stateCode: 'TG',
    keywords: ['వరంగల్', 'వరంగల్లు', 'నర్సంపేట', 'వర్ధన్నపేట'],
  },
  {
    englishName: 'Hanumakonda',
    stateCode: 'TG',
    keywords: ['హనుమకొండ', 'హన్మకొండ', 'కాజీపేట', 'హసన్‌పర్తి', 'వరంగల్ అర్బన్'],
  },
  {
    englishName: 'Karimnagar',
    stateCode: 'TG',
    keywords: ['కరీంనగర్', 'కరీంనగరు', 'హుజూరాబాద్', 'చొప్పదండి', 'మానకొండూరు'],
  },
  {
    englishName: 'Nizamabad',
    stateCode: 'TG',
    keywords: ['నిజామాబాద్', 'నిజామాబాదు', 'ఆర్మూర్', 'బోధన్', 'బాల్కొండ'],
  },
  {
    englishName: 'Khammam',
    stateCode: 'TG',
    keywords: ['ఖమ్మం', 'సత్తుపల్లి', 'మధిర', 'వైరా', 'పాలేరు'],
  },
  {
    englishName: 'Bhadradri Kothagudem',
    stateCode: 'TG',
    keywords: ['భద్రాద్రి', 'కొత్తగూడెం', 'భద్రాచలం', 'పాల్వంచ', 'ఇల్లందు', 'మణుగూరు'],
  },
  {
    englishName: 'Nalgonda',
    stateCode: 'TG',
    keywords: ['నల్గొండ', 'నల్లగొండ', 'మిర్యాలగూడ', 'దేవరకొండ', 'నకిరేకల్', 'నాగార్జునసాగర్'],
  },
  {
    englishName: 'Suryapet',
    stateCode: 'TG',
    keywords: ['సూర్యాపేట', 'కోదాడ', 'హుజూర్‌నగర్', 'తుంగతుర్తి'],
  },
  {
    englishName: 'Yadadri Bhuvanagiri',
    stateCode: 'TG',
    keywords: ['యాదాద్రి', 'భువనగిరి', 'ఆలేరు', 'చౌటుప్పల్', 'మోత్కూరు'],
  },
  {
    englishName: 'Mahabubnagar',
    stateCode: 'TG',
    keywords: ['మహబూబ్‌నగర్', 'మహబూబ్ నగర్', 'పాలమూరు', 'జడ్చర్ల', 'దేవరకద్ర'],
  },
  {
    englishName: 'Nagarkurnool',
    stateCode: 'TG',
    keywords: ['నాగర్‌కర్నూల్', 'కొల్లాపూర్', 'కల్వకుర్తి', 'అచ్చంపేట'],
  },
  {
    englishName: 'Wanaparthy',
    stateCode: 'TG',
    keywords: ['వనపర్తి', 'పెబ్బేరు', 'శ్రీరంగాపూర్'],
  },
  {
    englishName: 'Jogulamba Gadwal',
    stateCode: 'TG',
    keywords: ['జోగులాంబ', 'గద్వాల', 'అలంపూర్', 'ఐజ'],
  },
  {
    englishName: 'Narayanpet',
    stateCode: 'TG',
    keywords: ['నారాయణపేట', 'మక్తల్', 'కోస్గి'],
  },
  {
    englishName: 'Sangareddy',
    stateCode: 'TG',
    keywords: ['సంగారెడ్డి', 'జహీరాబాద్', 'పటాన్‌చెరు', 'నారాయణఖేడ్'],
  },
  {
    englishName: 'Siddipet',
    stateCode: 'TG',
    keywords: ['సిద్దిపేట', 'గజ్వేల్', 'దుబ్బాక', 'హుస్నాబాద్'],
  },
  {
    englishName: 'Medak',
    stateCode: 'TG',
    keywords: ['మెదక్', 'నర్సాపూర్', 'రామాయంపేట', 'పాపన్నపేట'],
  },
  {
    englishName: 'Kamareddy',
    stateCode: 'TG',
    keywords: ['కామారెడ్డి', 'బాన్సువాడ', 'ఎల్లారెడ్డి', 'జుక్కల్'],
  },
  {
    englishName: 'Rajanna Sircilla',
    stateCode: 'TG',
    keywords: ['సిరిసిల్ల', 'రాజన్న సిరిసిల్ల', 'వేములవాడ'],
  },
  {
    englishName: 'Jagtial',
    stateCode: 'TG',
    keywords: ['జగిత్యాల', 'కోరుట్ల', 'మెట్‌పల్లి', 'ధర్మపురి'],
  },
  {
    englishName: 'Peddapalli',
    stateCode: 'TG',
    keywords: ['పెద్దపల్లి', 'రామగుండం', 'మంథని', 'గోదావరిఖని'],
  },
  {
    englishName: 'Mancherial',
    stateCode: 'TG',
    keywords: ['మంచిర్యాల', 'బెల్లంపల్లి', 'చెన్నూర్'],
  },
  {
    englishName: 'Nirmal',
    stateCode: 'TG',
    keywords: ['నిర్మల్', 'భైంసా', 'ముధోల్', 'ఖానాపూర్'],
  },
  {
    englishName: 'Adilabad',
    stateCode: 'TG',
    keywords: ['ఆదిలాబాద్', 'బోథ్', 'ఉట్నూరు'],
  },
  {
    englishName: 'Komaram Bheem Asifabad',
    stateCode: 'TG',
    keywords: ['ఆసిఫాబాద్', 'కాగజ్‌నగర్', 'సిర్పూర్', 'కొమరంభీమ్'],
  },
  {
    englishName: 'Jayashankar Bhupalpally',
    stateCode: 'TG',
    keywords: ['భూపాలపల్లి', 'జయశంకర్ భూపాలపల్లి', 'కాటారం', 'మహదేవపూర్'],
  },
  {
    englishName: 'Mulugu',
    stateCode: 'TG',
    keywords: ['ములుగు', 'ఏటూరునాగారం', 'మేడారం', 'వెంకటాపురం'],
  },
  {
    englishName: 'Mahabubabad',
    stateCode: 'TG',
    keywords: ['మహబూబాబాద్', 'డోర్నకల్', 'మర్రిపెడ'],
  },
  {
    englishName: 'Jangaon',
    stateCode: 'TG',
    keywords: ['జనగామ', 'జనగాం', 'పాలకుర్తి', 'స్టేషన్ ఘన్‌పూర్'],
  },
  {
    englishName: 'Vikarabad',
    stateCode: 'TG',
    keywords: ['వికారాబాద్', 'తాండూరు', 'పరిగి', 'కొడంగల్'],
  },

  // --- ANDHRA PRADESH DISTRICTS ---
  {
    englishName: 'Visakhapatnam',
    stateCode: 'AP',
    keywords: ['విశాఖపట్నం', 'విశాఖ', 'వైజాగ్', 'గాజువాక', 'భీమిలి', 'గోపాలపట్నం', 'రుషికొండ'],
  },
  {
    englishName: 'NTR',
    stateCode: 'AP',
    keywords: ['విజయవాడ', 'ఎన్టీఆర్ జిల్లా', 'నందిగామ', 'జగ్గయ్యపేట', 'మైలవరం', 'తిరువూరు'],
  },
  {
    englishName: 'Guntur',
    stateCode: 'AP',
    keywords: ['గుంటూరు', 'తెనాలి', 'మంగళగిరి', 'తాడేపల్లి', 'పొన్నూరు', 'ప్రత్తిపాడు', 'అమరావతి'],
  },
  {
    englishName: 'Krishna',
    stateCode: 'AP',
    keywords: ['కృష్ణా జిల్లా', 'మచిలీపట్నం', 'గుడివాడ', 'అవనిగడ్డ', 'గన్నవరం', 'పామర్రు', 'పెడన'],
  },
  {
    englishName: 'Tirupati',
    stateCode: 'AP',
    keywords: ['తిరుపతి', 'తిరుమల', 'శ్రీకాళహస్తి', 'చంద్రగిరి', 'గూడూరు', 'సూళ్లూరుపేట', 'వెంకటగిరి'],
  },
  {
    englishName: 'Chittoor',
    stateCode: 'AP',
    keywords: ['చిత్తూరు', 'పలమనేరు', 'కుప్పం', 'నగరి', 'పుంగనూరు'],
  },
  {
    englishName: 'Kurnool',
    stateCode: 'AP',
    keywords: ['కర్నూలు', 'కర్నూల్', 'ఆదోని', 'ఎమ్మిగనూరు', 'పత్తికొండ', 'కోడుమూరు'],
  },
  {
    englishName: 'Nandyal',
    stateCode: 'AP',
    keywords: ['నంద్యాల', 'ఆళ్లగడ్డ', 'బనగానపల్లె', 'డోన్', 'నందికొట్కూరు', 'శ్రీశైలం'],
  },
  {
    englishName: 'Ananthapuramu',
    stateCode: 'AP',
    keywords: ['అనంతపురం', 'అనంతపురము', 'తాడిపత్రి', 'రాయదుర్గం', 'కళ్యాణదుర్గం', 'గుంతకల్లు'],
  },
  {
    englishName: 'Sri Sathya Sai',
    stateCode: 'AP',
    keywords: ['శ్రీ సత్యసాయి', 'పుట్టపర్తి', 'హిందూపురం', 'ధర్మవరం', 'కదిరి', 'పెనుకొండ'],
  },
  {
    englishName: 'YSR',
    stateCode: 'AP',
    keywords: ['కడప', 'వైఎస్సార్', 'వైఎస్‌ఆర్', 'ప్రొద్దుటూరు', 'పులివెందుల', 'జమ్మలమడుగు', 'మైదుకూరు'],
  },
  {
    englishName: 'Annamayya',
    stateCode: 'AP',
    keywords: ['అన్నమయ్య', 'రాయచోటి', 'మదనపల్లె', 'రాజంపేట', 'పీలేరు'],
  },
  {
    englishName: 'Prakasam',
    stateCode: 'AP',
    keywords: ['ప్రకాశం', 'ఒంగోలు', 'మార్కాపురం', 'గిద్దలూరు', 'కనిగిరి', 'దర్శి'],
  },
  {
    englishName: 'Bapatla',
    stateCode: 'AP',
    keywords: ['బాపట్ల', 'చీరాల', 'రేపల్లె', 'వేమూరు', 'పర్చూరు'],
  },
  {
    englishName: 'Palnadu',
    stateCode: 'AP',
    keywords: ['పల్నాడు', 'నరసరావుపేట', 'చిలకలూరిపేట', 'సత్తెనపల్లి', 'మాచర్ల', 'వినుకొండ', 'గురజాల'],
  },
  {
    englishName: 'Eluru',
    stateCode: 'AP',
    keywords: ['ఏలూరు', 'నూజివీడు', 'చింతలపూడి', 'కైకలూరు', 'దెందులూరు'],
  },
  {
    englishName: 'West Godavari',
    stateCode: 'AP',
    keywords: ['పశ్చిమ గోదావరి', 'భీమవరం', 'తాడేపల్లిగూడెం', 'తణుకు', 'నరసాపురం', 'పాలకొల్లు', 'ఆచంట'],
  },
  {
    englishName: 'East Godavari',
    stateCode: 'AP',
    keywords: ['తూర్పు గోదావరి', 'రాజమండ్రి', 'రాజమహేంద్రవరం', 'కొవ్వూరు', 'నిడదవోలు', 'గోపాలపురం'],
  },
  {
    englishName: 'Kakinada',
    stateCode: 'AP',
    keywords: ['కాకినాడ', 'పెద్దాపురం', 'తుని', 'పిఠాపురం', 'ప్రత్తిపాడు'],
  },
  {
    englishName: 'Dr. B.R. Ambedkar Konaseema',
    stateCode: 'AP',
    keywords: ['కోనసీమ', 'అమలాపురం', 'కొత్తపేట', 'రామచంద్రపురం', 'ముమ్మిడివరం', 'రాజోలు'],
  },
  {
    englishName: 'Anakapalli',
    stateCode: 'AP',
    keywords: ['అనకాపల్లి', 'నర్సీపట్నం', 'చోడవరం', 'ఎలమంచిలి', 'పాయకరావుపేట'],
  },
  {
    englishName: 'Vizianagaram',
    stateCode: 'AP',
    keywords: ['విజయనగరం', 'బొబ్బిలి', 'చీపురుపల్లి', 'గజపతినగరం', 'నెల్లిమర్ల', 'శృంగవరపుకోట'],
  },
  {
    englishName: 'Parvathipuram Manyam',
    stateCode: 'AP',
    keywords: ['పార్వతీపురం మన్యం', 'పార్వతీపురం', 'సాలూరు', 'పాలకొండ', 'కురుపాం'],
  },
  {
    englishName: 'Srikakulam',
    stateCode: 'AP',
    keywords: ['శ్రీకాకుళం', 'పలాస', 'టెక్కలి', 'రాజాం', 'ఇచ్ఛాపురం', 'ఆమదాలవలస'],
  },
  {
    englishName: 'Alluri Sitharama Raju',
    stateCode: 'AP',
    keywords: ['అల్లూరి సీతారామరాజు', 'పాడేరు', 'అరకు', 'అరకులోయ', 'చింతూరు', 'రంపచోడవరం'],
  },
]

// ==========================================
// CATEGORY TELUGU HEURISTIC KEYWORDS
// ==========================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: [
    'రాజకీయాలు', 'రాజకీయ', 'ఎన్నికలు', 'సీఎం', 'ముఖ్యమంత్రి', 'మంత్రులు', 'మంత్రి',
    'రేవంత్', 'కేసీఆర్', 'చంద్రబాబు', 'జగన్', 'పవన్', 'లోకేష్', 'కేటీఆర్', 'హరీష్ రావు',
    'కాంగ్రెస్', 'బీజేపీ', 'బీఆర్ఎస్', 'టీడీపీ', 'వైసీపీ', 'అసెంబ్లీ', 'పార్లమెంట్',
    'ఎమ్మెల్యే', 'ఎంపీ', 'కేబినెట్', 'ఉపఎన్నిక', 'ప్రభుత్వం', 'తీర్మానం', 'ప్రతిపక్షం'
  ],
  crime: [
    'క్రైమ్', 'నేరం', 'హత్య', 'అరెస్ట్', 'పోలీసులు', 'గంజాయి', 'మోసం', 'సీబీఐ', 'ఈడీ',
    'కోర్టు', 'బెయిల్', 'ఎఫ్‌ఐఆర్', 'కేసు', 'దాడి', 'చైన్ స్నాచింగ్', 'రోడ్డు ప్రమాదం',
    'ఆత్మహత్య', 'కాల్పులు', 'లంచం', 'ఏసీబీ', 'రిమాండ్', 'దొంగతనం', 'స్మగ్లింగ్'
  ],
  sports: [
    'క్రికెట్', 'ఐపీఎల్', 'మ్యాచ్', 'రోహిత్', 'కోహ్లీ', 'క్రీడలు', 'వరల్డ్ కప్',
    'గోల్డ్ మెడల్', 'బ్యాడ్మింటన్', 'పీవీ సింధు', 'హాకీ', 'ఫుట్‌బాల్', 'ఒలింపిక్స్',
    'ట్రోఫీ', 'సెంచరీ', 'వికెట్లు', 'బీసీసీఐ', 'టీ20', 'సిరీస్'
  ],
  entertainment: [
    'సినిమా', 'టాలీవుడ్', 'హీరో', 'హీరోయిన్', 'డైరెక్టర్', 'బాక్సాఫీస్', 'మూవీ',
    'రివ్యూ', 'ఓటీటీ', 'సాంగ్స్', 'ప్రభాస్', 'అల్లు అర్జున్', 'మహేష్ బాబు', 'ఎన్టీఆర్',
    'రామ్ చరణ్', 'చిరంజీవి', 'బాలకృష్ణ', 'ట్రైలర్', 'టీజర్', 'షూటింగ్', 'సెలబ్రిటీ'
  ],
  business: [
    'మార్కెట్', 'సెన్సెక్స్', 'నిఫ్టీ', 'బిజినెస్', 'బంగారం ధరలు', 'వెండి', 'కంపెనీ',
    'బ్యాంక్', 'జీఎస్టీ', 'షేర్లు', 'స్టాక్ మార్కెట్', 'ఆర్బీఐ', 'రిలయన్స్', 'టాటా',
    'పెట్టుబడులు', 'పెట్రోల్ ధర', 'రూపాయి', 'స్టార్టప్'
  ],
  technology: [
    'టెక్నాలజీ', 'సాంకేతికత', 'ఏఐ', 'కృత్రిమ మేధ', 'మొబైల్', 'స్మార్ట్‌ఫోన్', 'ఇంటర్నెట్',
    'గూగుల్', 'మైక్రోసాఫ్ట్', 'యాపిల్', 'ఇస్రో', 'రోదసి', 'ఉపగ్రహం', 'సైబర్', 'యాప్'
  ],
  education: [
    'విద్య', 'ఫలితాలు', 'పరీక్షలు', 'డీఎస్సీ', 'జాబ్స్', 'నోటిఫికేషన్', 'యూనివర్సిటీ',
    'టెన్త్', 'ఇంటర్', 'నీట్', 'జేఈఈ', 'అడ్మిషన్లు', 'స్కాలర్‌షిప్', 'ఉపాధ్యాయ', 'విద్యార్థి'
  ],
  health: [
    'ఆరోగ్యం', 'ఆసుపత్రి', 'డాక్టర్', 'వ్యాక్సిన్', 'మెడికల్', 'కేన్సర్', 'గుండె',
    'డయాబెటిస్', 'డెంగ్యూ', 'జ్వరం', 'చికిత్స', 'ఆపరేషన్', 'డైట్', 'మందులు', 'కరోనా'
  ],
  agriculture: [
    'రైతులు', 'రైతు', 'వ్యవసాయం', 'పంట', 'వర్షాలు', 'ధాన్యం', 'రుణమాఫీ', 'ఎరువులు',
    'విత్తనాలు', 'కనీస మద్దతు ధర', 'రైతు భరోసా', 'కౌలు రైతులు', 'నీటిపారుదల', 'బోర్లు'
  ],
  infrastructure: [
    'ప్రాజెక్టులు', 'రోడ్లు', 'మెట్రో', 'బ్రిడ్జి', 'సాగునీరు', 'డ్యామ్', 'ఎక్స్‌ప్రెస్‌వే',
    'రైల్వే', 'విమానాశ్రయం', 'పోర్టు', 'తాగునీరు', 'విద్యుత్', 'ఫ్లైఓవర్', 'భవనం'
  ],
}

/**
 * Intelligent Location Detector using Telugu keywords
 */
export function detectLocationFromTeluguText(
  text: string,
  states: StateInfo[],
  districts: DistrictInfo[]
): {
  stateId: string
  stateCode: string
  districtId: string | null
  districtName: string | null
} {
  const normalized = text.toLowerCase()

  // 1. Scan for specific districts
  for (const mapping of TELUGU_DISTRICT_KEYWORDS) {
    for (const kw of mapping.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        const matchedState = states.find(s => s.code === mapping.stateCode) || states[0]
        const matchedDistrict = districts.find(
          d => d.name.toLowerCase() === mapping.englishName.toLowerCase() && d.stateId === matchedState.id
        ) || districts.find(d => d.name.toLowerCase() === mapping.englishName.toLowerCase())

        return {
          stateId: matchedState.id,
          stateCode: matchedState.code,
          districtId: matchedDistrict ? matchedDistrict.id : null,
          districtName: mapping.englishName,
        }
      }
    }
  }

  // 2. Scan for broad state keywords if no district matched
  const isAP = normalized.includes('ఆంధ్ర') || normalized.includes('ఏపీ') || normalized.includes('ఆంధ్రప్రదేశ్')
  const isTG = normalized.includes('తెలంగాణ') || normalized.includes('తెలంగాణలో')

  if (isAP && !isTG) {
    const apState = states.find(s => s.code === 'AP')
    if (apState) {
      return { stateId: apState.id, stateCode: 'AP', districtId: null, districtName: null }
    }
  }

  if (isTG) {
    const tgState = states.find(s => s.code === 'TG')
    if (tgState) {
      return { stateId: tgState.id, stateCode: 'TG', districtId: null, districtName: null }
    }
  }

  // Fallback to primary state (Telangana by default in shadow news)
  const defaultState = states.find(s => s.code === 'TG') || states[0]
  return {
    stateId: defaultState?.id || '',
    stateCode: defaultState?.code || 'TG',
    districtId: null,
    districtName: null,
  }
}

/**
 * Intelligent Category Detector using Telugu keywords
 */
export function detectCategoryFromTeluguText(
  text: string,
  categories: CategoryInfo[],
  hint?: string
): CategoryInfo {
  const normalized = (text + ' ' + (hint || '')).toLowerCase()

  let bestMatchSlug: string | null = null
  let maxHits = 0

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        hits++
      }
    }
    if (hits > maxHits) {
      maxHits = hits
      bestMatchSlug = slug
    }
  }

  if (bestMatchSlug) {
    const found = categories.find(c => c.slug.toLowerCase() === bestMatchSlug!.toLowerCase())
    if (found) return found
  }

  // Default to politics or first category
  return categories.find(c => c.slug === 'politics') || categories[0]
}

/**
 * Generates Telugu short news headline & body using local heuristics (used if Gemini key is missing or fails)
 */
export function generateLocalTeluguShortNews(raw: RawFeedItem): {
  aiTitle: string
  aiShortDesc: string
  aiContent: string
} {
  // Strip source branding from title
  let cleanTitle = raw.title
    .replace(/^.*?(?:టీవీ9|సాక్షి|ఈనాడు|నమస్తే తెలంగాణ|ఆంధ్రజ్యోతి|ఏబీపీ దేశం|వెబ్‌దునియా|వన్ఇండియా)[\s:-]+/i, '')
    .replace(/[\s:-]+(?:TV9|Sakshi|Eenadu|ABP|Oneindia|TeluguOne|Asianet).*?$/i, '')
    .trim()

  if (cleanTitle.length > 80) {
    cleanTitle = cleanTitle.substring(0, 78) + '...'
  }

  // Build clean 60-80 words summary from description or content
  let body = (raw.description || raw.content || raw.title).trim()
  body = body.replace(/https?:\/\/\S+/g, '') // remove urls
  body = body.replace(/(?:ఈనాడు|సాక్షి|టీవీ9|ఏబీపీ).+?ప్రత్యేక కథనం/g, '')

  const sentences = body.split(/[.!?।]+/).map(s => s.trim()).filter(Boolean)
  let shortDesc = sentences.slice(0, 3).join('. ') + '.'
  if (shortDesc.length < 50 && raw.content) {
    shortDesc = raw.content.substring(0, 200).trim() + '...'
  }

  return {
    aiTitle: cleanTitle,
    aiShortDesc: shortDesc.substring(0, 350),
    aiContent: (raw.content || raw.description || raw.title).trim(),
  }
}

/**
 * Main AI Agent pipeline:
 * Takes a raw feed item, queries Google Gemini with prompt engineering for
 * Short News + Category + Location + Tags, and falls back gracefully to local heuristics.
 */
export async function processArticleWithAIAgent(
  item: RawFeedItem,
  context: {
    categories: CategoryInfo[]
    states: StateInfo[]
    districts: DistrictInfo[]
    options?: AIProcessOptions
  }
): Promise<ProcessedArticleResult> {
  const { categories, states, districts, options } = context

  // 1. Retrieve Gemini API Key from DB or environment
  let apiKey = ''
  try {
    const dbGeminiSetting = await db.setting.findFirst({
      where: {
        key: {
          in: ['gemini_api_key', 'google_gemini_api_key', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'],
        },
      },
    })
    apiKey = dbGeminiSetting?.value?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      ''
  } catch (err) {
    console.warn('Could not read Gemini API key from setting table:', err)
  }

  const categorySlugs = categories.map(c => c.slug).join(', ')
  const districtNames = districts.map(d => d.name).join(', ')

  let aiTitle = ''
  let aiShortDesc = ''
  let aiContent = ''
  let chosenCategorySlug: string | null = null
  let chosenDistrictName: string | null = null
  let chosenStateCode: string | null = null
  let chosenMandalName: string | null = null
  let extractedTags: string[] = []
  let isGeminiUsed = false

  // 2. Try Google Gemini if key is available and autoRewrite or classification is requested
  if (apiKey && (options?.autoRewrite !== false || options?.autoCategory !== false || options?.autoLocation !== false)) {
    try {
      const models = await getGeminiModelsToTry(apiKey)
      const systemPrompt = `You are the Lead Telugu News Editor & AI Assistant for 'Shadow News' (షాడో న్యూస్), a hyperlocal mobile short news app for Telangana and Andhra Pradesh.

TASK:
1. Transform raw Telugu news into a crisp, engaging, objective "Short News" card (similar to Inshorts / Way2News).
2. Rewrite the headline into an eye-catching, factual Telugu title (MAX 75 CHARACTERS).
3. Condense the summary into 60-80 words in professional, modern Telugu covering: Who, What, Where, When, and Why. Remove all source watermarks/branding (e.g., "సాక్షి ప్రతినిధి", "టీవీ9", "ఈనాడు", etc.).
4. Provide a full 150-220 words formatted Telugu article.
5. Identify the single best Category from this exact list: [${categorySlugs}].
6. Identify the Location:
   - State code: "TG" (Telangana), "AP" (Andhra Pradesh), or "ALL" (National/International).
   - District name: Choose the exact English name from this list if mentioned or clearly related: [${districtNames}]. If national/international, return null.
   - Mandal/Town: Local mandal or town name in Telugu or English if specifically mentioned, else null.
7. Extract 2 to 4 key entities/topics for tags (e.g. "రేవంత్ రెడ్డి", "చంద్రబాబు", "హైకోర్టు", "ఐపీఎల్").

Respond ONLY with a valid JSON object matching this schema without markdown fences:
{
  "aiTitle": "క్రిస్ప్ తెలుగు హెడ్‌లైన్ (max 75 chars)",
  "aiShortDesc": "60-80 పదాల షార్ట్ న్యూస్ సారాంశం",
  "aiContent": "150-220 పదాల పూర్తి వివరాలతో కూడిన వ్యాసం",
  "categorySlug": "one of the allowed slugs",
  "stateCode": "TG | AP | ALL",
  "districtName": "Exact district English name from list or null",
  "mandalName": "Town/Mandal name or null",
  "tags": ["Tag 1", "Tag 2", "Tag 3"]
}`

      const userPrompt = `ARTICLE TO PROCESS:
Source: ${item.sourceName || 'Unknown'}
Raw Title: ${item.title}
Category Hint: ${item.categoryHint || 'None'}
Raw Description: ${item.description || ''}
Raw Content: ${item.content || item.description || item.title}`

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.25,
                responseMimeType: 'application/json',
              },
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              let clean = text.trim()
              if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
              else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')

              const parsed = JSON.parse(clean)
              if (parsed.aiTitle && (parsed.aiShortDesc || parsed.aiContent)) {
                aiTitle = parsed.aiTitle.trim()
                aiShortDesc = parsed.aiShortDesc?.trim() || aiTitle
                aiContent = parsed.aiContent?.trim() || aiShortDesc
                chosenCategorySlug = parsed.categorySlug?.toLowerCase().trim() || null
                chosenStateCode = parsed.stateCode?.toUpperCase().trim() || null
                chosenDistrictName = parsed.districtName?.trim() || null
                chosenMandalName = parsed.mandalName?.trim() || null
                if (Array.isArray(parsed.tags)) {
                  extractedTags = parsed.tags.map((t: any) => String(t).trim()).filter(Boolean)
                }
                isGeminiUsed = true
                console.log(`AI Agent successfully processed article with model: ${model}`)
                break
              }
            }
          }
        } catch (err: any) {
          console.warn(`Gemini model ${model} processing failed:`, err?.message || err)
        }
      }
    } catch (e: any) {
      console.warn('Gemini AI Agent failed, falling back to local NLP heuristics:', e?.message || e)
    }
  }

  // 3. Fallback Heuristics for Title, Description & Content if Gemini was not used or failed
  if (!isGeminiUsed) {
    const local = generateLocalTeluguShortNews(item)
    aiTitle = local.aiTitle
    aiShortDesc = local.aiShortDesc
    aiContent = local.aiContent
  }

  // 4. Resolve Category (AI chosen -> Telugu keyword detection -> default/fallback)
  let matchedCategory: CategoryInfo
  if (chosenCategorySlug && categories.some(c => c.slug.toLowerCase() === chosenCategorySlug?.toLowerCase())) {
    matchedCategory = categories.find(c => c.slug.toLowerCase() === chosenCategorySlug?.toLowerCase())!
  } else {
    matchedCategory = detectCategoryFromTeluguText(
      `${item.title} ${item.description} ${item.categoryHint}`,
      categories,
      item.categoryHint
    )
  }

  // Override with user's explicitly selected fallback category if autoCategory is disabled
  if (options?.autoCategory === false && options?.defaultCategoryId) {
    const explicitCat = categories.find(c => c.id === options.defaultCategoryId)
    if (explicitCat) matchedCategory = explicitCat
  }

  // 5. Resolve Location (AI chosen -> Telugu district dictionary scan -> default/fallback)
  let resolvedStateId = ''
  let resolvedStateCode = 'TG'
  let resolvedDistrictId: string | null = null
  let resolvedDistrictName: string | null = null

  if (chosenDistrictName) {
    const matchedDist = districts.find(d => d.name.toLowerCase() === chosenDistrictName?.toLowerCase())
    if (matchedDist) {
      resolvedDistrictId = matchedDist.id
      resolvedDistrictName = matchedDist.name
      resolvedStateId = matchedDist.stateId
      const st = states.find(s => s.id === matchedDist.stateId)
      if (st) resolvedStateCode = st.code
    }
  }

  if (!resolvedDistrictId) {
    const loc = detectLocationFromTeluguText(`${item.title} ${item.description}`, states, districts)
    resolvedStateId = loc.stateId
    resolvedStateCode = loc.stateCode
    resolvedDistrictId = loc.districtId
    resolvedDistrictName = loc.districtName
  }

  // If still no state assigned, fallback to requested default state or first state
  if (!resolvedStateId) {
    const defaultState = (options?.defaultStateId && states.find(s => s.id === options.defaultStateId)) ||
      states.find(s => s.code === 'TG') || states[0]
    resolvedStateId = defaultState?.id || ''
    resolvedStateCode = defaultState?.code || 'TG'
  }

  // 6. Build Tags
  const finalTags = new Set<string>()
  if (resolvedDistrictName) finalTags.add(resolvedDistrictName)
  if (matchedCategory.name) finalTags.add(matchedCategory.name)
  for (const tag of extractedTags) {
    if (tag.length >= 2 && tag.length <= 40) finalTags.add(tag)
  }

  return {
    title: item.title,
    shortDesc: aiShortDesc,
    content: aiContent,
    aiTitle,
    aiShortDesc,
    aiContent,
    aiStatus: isGeminiUsed ? 'generated' : 'fallback',
    categoryId: matchedCategory.id,
    categorySlug: matchedCategory.slug,
    stateId: resolvedStateId,
    stateCode: resolvedStateCode,
    districtId: resolvedDistrictId,
    districtName: resolvedDistrictName,
    mandalId: null,
    mandalName: chosenMandalName || null,
    tags: Array.from(finalTags).slice(0, 5),
    confidence: {
      category: isGeminiUsed ? 0.95 : 0.8,
      location: resolvedDistrictId ? (isGeminiUsed ? 0.92 : 0.85) : 0.6,
    },
  }
}

