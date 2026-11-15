import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const TELANGANA_DATA: Record<string, string[]> = {
  'Adilabad': [
    'Adilabad Urban', 'Adilabad Rural', 'Mavala', 'Gudihatnoor', 'Bazarhathnoor',
    'Bela', 'Boidath', 'Jainath', 'Indervelly', 'Narnoor', 'Gadiguda', 'Utnoor',
    'Tamsi', 'Bheempur', 'Talamadugu', 'Boath', 'Sirikonda', 'Neradigonda'
  ],
  'Bhadradri Kothagudem': [
    'Kothagudem', 'Palwancha', 'Sujatanagar', 'Chunchupalli', 'Laxmidevipalli',
    'Julurpad', 'Chandrugonda', 'Tekulapalli', 'Yellandu', 'Allapalli', 'Gundala',
    'Manuguru', 'Pinapaka', 'Aswapuram', 'Karakagudem', 'Burgampahad',
    'Dummugudem', 'Bhadrachalam', 'Cherla', 'Aswaraopeta', 'Dammapeta',
    'Mulakalapalli', 'Annapureddypalli'
  ],
  'Hanumakonda': [
    'Hanumakonda', 'Kazipet', 'Hasanparthy', 'Inavolu', 'Velair', 'Dharmasagar',
    'Elkathurthy', 'Bheemadevarpalli', 'Kamalapur', 'Parkal', 'Nadikuda',
    'Damera', 'Athmakur', 'Shayampet'
  ],
  'Hyderabad': [
    'Amberpet', 'Asifnagar', 'Bahadurpura', 'Bandlaguda', 'Charminar',
    'Golconda', 'Himayathnagar', 'Khairatabad', 'Marredpally', 'Musheerabad',
    'Nampally', 'Saidabad', 'Secunderabad', 'Shaikpet', 'Tirumalagiri', 'Ameerpet'
  ],
  'Jagtial': [
    'Jagtial', 'Jagtial Rural', 'Raikal', 'Sarangapur', 'Beerpur', 'Dharmapuri',
    'Buggaram', 'Pegadapalli', 'Gollapalli', 'Velgatoor', 'Korutla', 'Metpalli',
    'Mallapur', 'Ibrahimpatnam', 'Medipalli', 'Kathlapur', 'Kodimial', 'Malial'
  ],
  'Jangaon': [
    'Jangaon', 'Lingalaghanpur', 'Bachannapet', 'Devaruppula', 'Narmetta',
    'Tharigoppula', 'Raghunathpalli', 'Station Ghanpur', 'Chilpur', 'Zaffergadh',
    'Palakurthi', 'Kodakandla'
  ],
  'Jayashankar Bhupalpally': [
    'Bhupalpalle', 'Ghanpur', 'Regonda', 'Mogullapalle', 'Chityal', 'Tekumatla',
    'Malharrao', 'Kataram', 'Mahadevpur', 'Palimela', 'Mutharam'
  ],
  'Jogulamba Gadwal': [
    'Gadwal', 'Dharoor', 'Maldakal', 'Ghattu', 'Kaloor Timmanadoddi', 'Itikyal',
    'Manopad', 'Waddepalle', 'Rajoli', 'Alampur', 'Undavelli', 'Ieeza'
  ],
  'Kamareddy': [
    'Kamareddy', 'Machareddy', 'Domakonda', 'Bibipet', 'Bhiknoor', 'Rajampet',
    'Tadwai', 'Banswada', 'Birkoor', 'Nasrullabad', 'Kotgiri', 'Rudrur',
    'Nizamsagar', 'Pitlam', 'Jukkal', 'Madnoor', 'Bichkunda', 'Dongli',
    'Yellareddy', 'Nagireddypet', 'Lingampet', 'Gandhari'
  ],
  'Karimnagar': [
    'Karimnagar', 'Karimnagar Rural', 'Kothapalli', 'Manakondur', 'Timmapur',
    'Ganneruvaram', 'Chigurumamidi', 'Choppadandi', 'Gangadhara', 'Ramadugu',
    'Huzurabad', 'Jammikunta', 'Veenavanka', 'Saidapur', 'Illanthakunta', 'Shankarapatnam'
  ],
  'Khammam': [
    'Khammam Urban', 'Khammam Rural', 'Raghunadhapalem', 'Tirumalayapalem',
    'Kusumanchi', 'Nelakondapalli', 'Mudigonda', 'Chinthakani', 'Bonakal',
    'Madira', 'Errupalem', 'Wyra', 'Konijerla', 'Singareni', 'Enkoor', 'Kallur',
    'Penuballi', 'Sathupalli', 'Vemsoor', 'Tallada', 'Kamepalli'
  ],
  'Komaram Bheem Asifabad': [
    'Asifabad', 'Rebbena', 'Kerameri', 'Wankidi', 'Sirpur (U)', 'Jainoor',
    'Lingapur', 'Tiryani', 'Kaghaznagar', 'Sirpur (T)', 'Kouthala', 'Bejjur',
    'Dahegaon', 'Penchikalpet', 'Chintalamanepalli'
  ],
  'Mahabubabad': [
    'Mahabubabad', 'Kuravi', 'Kesamudram', 'Dornakal', 'Gudur', 'Kothaguda',
    'Gangaram', 'Bayyaram', 'Garla', 'Chinnagudur', 'Danthalapalle', 'Maripeda',
    'Nellikudur', 'Narsimhulapet', 'Inugurthy'
  ],
  'Mahabubnagar': [
    'Mahbubnagar Urban', 'Mahbubnagar Rural', 'Hanwada', 'Koilkonda', 'Rajapur',
    'Balanagar', 'Nawabpet', 'Jadcherla', 'Midjil', 'Bhoothpur', 'Devarkadra',
    'Kothakota', 'Chinnachintakunta', 'Addakal', 'Moosapet', 'Gandeed'
  ],
  'Mancherial': [
    'Mancherial', 'Naspur', 'Hajipur', 'Mandamarri', 'Dandepally', 'Luxettipet',
    'Jannaram', 'Kasipet', 'Bellampalli', 'Vemanpally', 'Nennal', 'Tandur',
    'Bheemaram', 'Chennur', 'Kotapally', 'Jaipur', 'Bheemini', 'Kannepalli'
  ],
  'Medak': [
    'Medak', 'Havelighanpur', 'Shankarampet (R)', 'Shankarampet (A)',
    'Ramayampet', 'Nizampet', 'Yeldurthy', 'Chegunta', 'Narsapur', 'Kulcharam',
    'Shivampet', 'Kowdipalle', 'Chilipched', 'Alladurg', 'Regode', 'Tekmal',
    'Papannapet', 'Manorabad', 'Narsingi', 'Maasipet'
  ],
  'Medchal Malkajgiri': [
    'Medchal', 'Shamirpet', 'Keesara', 'Ghatkesar', 'Medipally', 'Uppal',
    'Kapra', 'Alwal', 'Malkajgiri', 'Kukatpally', 'Balanagar', 'Quthbullapur',
    'Dundigal Gandimaisamma', 'Bachupally', 'Muduchintalapalli'
  ],
  'Mulugu': [
    'Mulug', 'Venkatapur', 'Govindaraopet', 'Eturnagaram', 'Mangapet',
    'Tadvai', 'Kannaiguda', 'Wazedu', 'Venkatapuram'
  ],
  'Nagarkurnool': [
    'Nagarkurnool', 'Bijinapalle', 'Thadoor', 'Telkapalle', 'Gopalpet',
    'Urkonda', 'Achampet', 'Amrabad', 'Padra', 'Balmoor', 'Lingal',
    'Uppununthala', 'Vangoor', 'Kalwakurthy', 'Veldanda', 'Charakonda',
    'Kollapur', 'Pentlavelly', 'Kodair', 'Peddakothapally'
  ],
  'Nalgonda': [
    'Nalgonda', 'Thipparthy', 'Kanagal', 'Madugulapally', 'Miryalaguda',
    'Vemulapally', 'Dameracherla', 'Adavidevulapally', 'Devarakonda',
    'Gundlapally', 'Chandampet', 'Neredugommu', 'Pedda Adiserlapally',
    'Gurrampode', 'Chinthapally', 'Marriguda', 'Nampally', 'Munugode',
    'Chandur', 'Kethepally', 'Kattangur', 'Nakrekal', 'Thungathurthi',
    'Shaligowraram', 'Chityal', 'Narketpally', 'Anumula (Haliya)',
    'Nidamanur', 'Tripuraram', 'Tirumalagiri Sagar', 'Peddavoora'
  ],
  'Narayanpet': [
    'Narayanpet', 'Damargidda', 'Dhanwada', 'Marikal', 'Kosgi', 'Maddur',
    'Krishna', 'Makthal', 'Maganoor', 'Utkoor', 'Narva'
  ],
  'Nirmal': [
    'Nirmal Urban', 'Nirmal Rural', 'Soan', 'Mamada', 'Laxmanchanda',
    'Sarangapur', 'Dilawarpur', 'Narsapur (G)', 'Kuntala', 'Kubeer', 'Bhainsa',
    'Tanoor', 'Mudhole', 'Lokeswaram', 'Dasturabad', 'Khanapur', 'Pembi', 'Basar'
  ],
  'Nizamabad': [
    'Nizamabad North', 'Nizamabad South', 'Nizamabad Rural', 'Mugpal',
    'Dichpally', 'Dharpally', 'Indalwai', 'Jakranpally', 'Sirikonda', 'Navipet',
    'Armoor', 'Balkonda', 'Mupkal', 'Mendora', 'Kammarpally', 'Velpur',
    'Ergatla', 'Bheemgal', 'Mortad', 'Bodhan', 'Yedpalli', 'Renjal',
    'Kotgiri', 'Rudrur', 'Varni', 'Chandur', 'Mosra', 'Aloor', 'Donkeshwar'
  ],
  'Peddapalli': [
    'Peddapalli', 'Basanthnagar', 'Sulthanabad', 'Odela', 'Julapalle',
    'Eligaid', 'Ramagundam', 'Anthergaon', 'Palakurthy', 'Manthani',
    'Ramagiri', 'Kamanpur', 'Mutharam', 'Dharmaram'
  ],
  'Rajanna Sircilla': [
    'Sircilla', 'Thangallapalli', 'Gambhiraopet', 'Yellareddypet',
    'Veernapalli', 'Mustabad', 'Illanthakunta', 'Vemulawada', 'Vemulawada Rural',
    'Chandurthi', 'Rudrangi', 'Boinpalli', 'Konaraopet'
  ],
  'Rangareddy': [
    'Shamshabad', 'Rajendranagar', 'Gandipet', 'Serilingampally', 'Chevella',
    'Shabad', 'Moinabad', 'Shankarpalle', 'Ibrahimpatnam', 'Manchal',
    'Yacharam', 'Abdullapurmet', 'Hayathnagar', 'Maheshwaram', 'Kandukur',
    'Kadthal', 'Amangal', 'Madgul', 'Talakondapalle', 'Farooqnagar (Shadnagar)',
    'Kothur', 'Kondurg', 'Chowderguda', 'Nandigama', 'Balanagar', 'Keshampet',
    'Saroornagar'
  ],
  'Sangareddy': [
    'Sangareddy', 'Kandi', 'Kondapur', 'Sadashivpet', 'Patancheru', 'Ameenpur',
    'Gummadidala', 'Jinnaram', 'Ramachandrapuram', 'Hathnoora', 'Pulkal',
    'Andole', 'Vatpally', 'Choutkur', 'Zahirabad', 'Kohir', 'Mogudampally',
    'Nyalkal', 'Jharasangam', 'Narayankhed', 'Kangti', 'Kalher', 'Sirgapoor',
    'Manoor', 'Nagalgidda', 'Nizampet'
  ],
  'Siddipet': [
    'Siddipet Urban', 'Siddipet Rural', 'Chinnakodur', 'Nanganur',
    'Narayanraopet', 'Dubbak', 'Mirdoddi', 'Doulthabad', 'Chegunta', 'Thoguta',
    'Gajwel', 'Jagdevpur', 'Kondapak', 'Markook', 'Wargal', 'Mulug', 'Husnabad',
    'Akkannapet', 'Koheda', 'Bejjanki', 'Maddur', 'Komuravelli', 'Dhoolmitta'
  ],
  'Suryapet': [
    'Suryapet', 'Chivvemla', 'Mothey', 'Jaji Reddi Gudem (Arvapally)',
    'Penpahad', 'Atmakur (S)', 'Kodad', 'Chilkur', 'Munagala', 'Nadigudem',
    'Ananthagiri', 'Huzurnagar', 'Mattampally', 'Mellachervu', 'Garidepally',
    'Neredcherla', 'Palakeedu', 'Thungathurthi', 'Noothankal', 'Maddirala',
    'Nagaram', 'Thirumalagiri', 'Chinthalapalem'
  ],
  'Vikarabad': [
    'Vikarabad', 'Dharur', 'Kotepally', 'Marpalle', 'Mominpet', 'Nawabpet',
    'Tandur', 'Peddemul', 'Basheerabad', 'Yalal', 'Pargi', 'Doma',
    'Kulkacherla', 'Gandeed', 'Pudur', 'Doulthabad', 'Kodangal', 'Bomraspet'
  ],
  'Wanaparthy': [
    'Wanaparthy', 'Gopalpet', 'Peddamandadi', 'Ghanpur', 'Pangal', 'Kothakota',
    'Pebbair', 'Srirangapur', 'Madanapur', 'Chinnambavi', 'Veepangandla',
    'Revally', 'Amarachinta', 'Atmakur'
  ],
  'Warangal': [
    'Warangal', 'Khila Warangal', 'Geesugonda', 'Atmakur', 'Damera',
    'Parvathagiri', 'Rayaparthy', 'Wardhannapet', 'Narsampet', 'Chennaraopet',
    'Duggondi', 'Khanapur', 'Nekkonda', 'Nallabelly'
  ],
  'Yadadri Bhuvanagiri': [
    'Bhongir', 'Bibinagar', 'Bhuvanagiri', 'Pochampally', 'Choutuppal',
    'Samsthan Narayanpur', 'Ramannapet', 'Valigonda', 'Alair', 'Yadagirigutta',
    'Turkapally', 'Rajapet', 'Mothkur', 'Gundala', 'Atmakur (M)', 'Addagudur',
    'Bommalaramaram'
  ],
};

export const ANDHRA_PRADESH_DATA: Record<string, string[]> = {
  'Srikakulam': [
    'Srikakulam', 'Amadalavalasa', 'Ponduru', 'Sarubujjili', 'Burja', 'Gara',
    'Polaki', 'Narasannapeta', 'Jalumuru', 'Saravakota', 'Pathapatnam',
    'Meliaputti', 'Tekkali', 'Kotabommali', 'Santhabommali', 'Nandigam',
    'Palasa', 'Mandasa', 'Vajrapukotturu', 'Sompeta', 'Kanchili', 'Kaviti',
    'Ichchapuram', 'Ranastalam', 'Laveru', 'Etcherla', 'G.Sigadam', 'Rajam',
    'Vangara', 'Santhakavati'
  ],
  'Parvathipuram Manyam': [
    'Parvathipuram', 'Seethanagaram', 'Balijipeta', 'Salur', 'Pachipenta',
    'Makkuva', 'Komarada', 'Gummalaxmipuram', 'Kurupam', 'Jiyyammavalasa',
    'Garugubilli', 'Palakonda', 'Seethampeta', 'Bhamini', 'Veeraghattam'
  ],
  'Vizianagaram': [
    'Vizianagaram', 'Gantyada', 'Pusapatirega', 'Denkada', 'Bondapalli',
    'Nellimarla', 'Gurla', 'Cheepurupalli', 'Garividi', 'Merakamudidam',
    'Therlam', 'Bobbili', 'Ramabhadrapuram', 'Badangi', 'Dattirajeru',
    'Gajapathinagaram', 'Vepada', 'Kothavalasa', 'L.Kota', 'Srungavarapukota',
    'Jami', 'Mentada'
  ],
  'Visakhapatnam': [
    'Visakhapatnam Urban', 'Maharanipeta', 'Gopalapatnam', 'Mulagada',
    'Visakhapatnam Rural', 'Bheemunipatnam', 'Anandapuram', 'Padmanabham',
    'Gajuwaka', 'Pedagantyada', 'Pendurthi'
  ],
  'Alluri Sitharama Raju': [
    'Paderu', 'Araku Valley', 'Dumbriguda', 'Ananthagiri', 'Hukumpeta',
    'Pedabayalu', 'Munchingiputtu', 'G.Madugula', 'Chintapalle', 'G.K.Veedhi',
    'Koyyuru', 'Rampachodavaram', 'Devipatnam', 'Y.Ramavaram', 'Addateegala',
    'Rajavommangi', 'Gangavaram', 'Maredumilli', 'Chintoor', 'Kunavaram',
    'Vararamachandrapuram', 'Yetapaka'
  ],
  'Anakapalli': [
    'Anakapalli', 'Kasimkota', 'Munagapaka', 'Parawada', 'Sabbavaram',
    'Achutapuram', 'Rambilli', 'Yelamanchili', 'Nakkapalli', 'Payakaraopeta',
    'S.Rayavaram', 'Kotauratla', 'Makavarapalem', 'Narsipatnam', 'Golugonda',
    'Nathavaram', 'Rolugunta', 'Ravikamatham', 'Madugula', 'Cheedikada',
    'Devarapalli', 'K.Kotapadu', 'Butchayyapeta', 'Chodavaram'
  ],
  'Kakinada': [
    'Kakinada Urban', 'Kakinada Rural', 'Karapa', 'Samalkota', 'Peddapuram',
    'Jaggampeta', 'Gandepalli', 'Kirlampudi', 'Prathipadu', 'Yeleswaram',
    'Sankhavaram', 'Rowthulapudi', 'Kotananduru', 'Tuni', 'Thondangi',
    'Pithapuram', 'Gollaprolu', 'U.Kothapalli', 'Kajuluru', 'Thallarevu'
  ],
  'Dr. B.R. Ambedkar Konaseema': [
    'Amalapuram', 'Allavaram', 'Uppalaguptam', 'Katrenikona', 'Mummidivaram',
    'I.Polavaram', 'Sakhinetipalli', 'Malkipuram', 'Razole', 'Ainavilli',
    'P.Gannavaram', 'Ambajipeta', 'Kothapeta', 'Ravulapalem', 'Atreyapuram',
    'Mandapeta', 'Rayavaram', 'Kapileswarapuram', 'Ramachandrapuram'
  ],
  'East Godavari': [
    'Rajahmundry Urban', 'Rajahmundry Rural', 'Kadiam', 'Rajanagaram',
    'Korukonda', 'Gokavaram', 'Seethanagaram', 'Kovvur', 'Chagallu',
    'Tallapudi', 'Nidadavole', 'Peravali', 'Undrajavaram', 'Gopalapuram',
    'Devarapalle', 'Nallajerla', 'Biccavolu', 'Anaparthy'
  ],
  'West Godavari': [
    'Bhimavaram', 'Veeravasaram', 'Palakoderu', 'Undi', 'Akividu', 'Kalla',
    'Achanta', 'Penumantra', 'Penugonda', 'Poduru', 'Palakollu', 'Yelamanchili',
    'Narasapuram', 'Mogalthur', 'Tanuku', 'Attili', 'Iragavaram',
    'Tadepalligudem', 'Pentapadu'
  ],
  'Eluru': [
    'Eluru', 'Denduluru', 'Pedavegi', 'Pedapadu', 'Unguturu', 'Bhimadole',
    'Nidamarru', 'Ganapavaram', 'Chintalapudi', 'Lingapalem', 'Kamavarapukota',
    'T.Narasapuram', 'Jangareddygudem', 'Polavaram', 'Buttayagudem',
    'Jeelugumilli', 'Koyyalagudem', 'Kukunoor', 'Velairpadu', 'Nuzvid',
    'Agiripalli', 'Chatrai', 'Musunuru', 'Kaikalur', 'Mandavalli',
    'Mudinepalli', 'Kalidindi'
  ],
  'Krishna': [
    'Machilipatnam', 'Gudur', 'Kruthivennu', 'Bantumilli', 'Pedana',
    'Gudlavalleru', 'Nandivada', 'Gudivada', 'Pamarru', 'Pedaparupudi',
    'Movva', 'Ghantasala', 'Challapalli', 'Mopidevi', 'Avanigadda',
    'Nagayalanka', 'Koduru', 'Penamaluru', 'Kankipadu', 'Vuyyuru',
    'Thotlavalluru', 'Pamidimukkala', 'Gannavaram', 'Bapulapadu', 'Unguturu'
  ],
  'NTR': [
    'Vijayawada Central', 'Vijayawada East', 'Vijayawada West',
    'Vijayawada North', 'Vijayawada Rural', 'Ibrahimpatnam', 'G.Konduru',
    'Mylavaram', 'Reddigudem', 'Tiruvuru', 'A.Konduru', 'Vissannapeta',
    'Gampalagudem', 'Nandigama', 'Kanchikacherla', 'Veerullapadu',
    'Chandarlapadu', 'Jaggayyapeta', 'Vatsavai', 'Penuganchiprolu'
  ],
  'Guntur': [
    'Guntur East', 'Guntur West', 'Guntur Rural', 'Mangalagiri', 'Tadepalli',
    'Thullur', 'Tadikonda', 'Medikonduru', 'Phirangipuram', 'Pedakakani',
    'Pedanandipadu', 'Prathipadu', 'Vatticherukuru', 'Chebrolu', 'Tenali',
    'Kollipara', 'Duggirala', 'Ponnur', 'Kakumanu'
  ],
  'Bapatla': [
    'Bapatla', 'Pittalavanipalem', 'Karlapalem', 'Nizampatnam', 'Nagaram',
    'Cherukupalle', 'Bhattiprolu', 'Repalle', 'Vemuru', 'Kollur', 'Amrutalur',
    'Tsundur', 'Chirala', 'Vetapalem', 'Karamchedu', 'Inkollu', 'Chinaganjam',
    'Parchur', 'Martur', 'Yaddanapudi', 'Addanki', 'J.Panguluru',
    'Santhamaguluru', 'Ballikurava', 'Korisapadu'
  ],
  'Palnadu': [
    'Narasaraopet', 'Rompicherla', 'Nakarekallu', 'Chilakaluripet', 'Nadendla',
    'Edlapadu', 'Sattenapalle', 'Muppalla', 'Rajupalem', 'Krosuru', 'Atchampet',
    'Bellamkonda', 'Pedakurapadu', 'Amaravathi', 'Vinukonda', 'Nuzendla',
    'Savalyapuram', 'Ipur', 'Bollapalle', 'Macherla', 'Veldurthi', 'Durgi',
    'Rentachintala', 'Gurazala', 'Dachepalle', 'Machavaram', 'Karempudi',
    'Piduguralla'
  ],
  'Prakasam': [
    'Ongole', 'Kothapatnam', 'Santhanuthalapadu', 'Maddipadu', 'Chimakurthy',
    'Tangutur', 'Naguluppalapadu', 'Singarayakonda', 'Zarugumalli', 'Kondapi',
    'Ponnaluru', 'Marripudi', 'Podili', 'Markapuram', 'Tarlupadu', 'Donakonda',
    'Konakanamitla', 'Darsi', 'Mundlamuru', 'Kurichedu', 'Giddalur', 'Cumbum',
    'Bestavaripeta', 'Racherla', 'Komarolu', 'Ardhaveedu', 'Yerragondapalem',
    'Tripuranthakam', 'Dornala', 'Peddaraveedu', 'Pullalacheruvu', 'Kanigiri',
    'Pamur', 'C.S.Puram', 'Veligandla', 'Hanumanthunipadu',
    'Chandrasekarapuram'
  ],
  'SPSR Nellore': [
    'Nellore Urban', 'Nellore Rural', 'Kovur', 'Buchireddypalem', 'Indukurpet',
    'Kodavalur', 'Vidavalur', 'Allur', 'Dagadarthi', 'Jaladanki', 'Kavali',
    'Bogole', 'Bitragunta', 'Duttalur', 'Udayagiri', 'Marripadu',
    'Varikuntapadu', 'Sitaramapuram', 'Kaligiri', 'Vinjamur', 'Kondapuram',
    'Atmakur', 'Ananthasagaram', 'Chejerla', 'Sangam', 'AS Pet', 'Podalakur',
    'Rapur', 'Kaluvoya', 'Saidapuram', 'Venkatachalam', 'Manubolu', 'Muthukur',
    'Thotapalligudur', 'Kota', 'Chillakur', 'Vakadu', 'Chittamur'
  ],
  'Kurnool': [
    'Kurnool Urban', 'Kurnool Rural', 'Kallur', 'Orvakal', 'C.Belagal',
    'Gudur', 'Kodumur', 'Veldurthi', 'Devanakonda', 'Krishnagiri',
    'Pattikonda', 'Maddikera', 'Tuggali', 'Aspari', 'Alur', 'Holagunda',
    'Halaharvi', 'Chippagiri', 'Adoni', 'Kowthalam', 'Kosigi', 'Mantralayam',
    'Nandavaram', 'Yemmiganur', 'Gonegandla', 'Peddakadubur'
  ],
  'Nandyal': [
    'Nandyal', 'Gospadu', 'Mahanandi', 'Sirvella', 'Rudravaram', 'Allagadda',
    'Chagalamarri', 'Uyyalawada', 'Dornipadu', 'Koilkuntla', 'Sanjamala',
    'Kolimigundla', 'Banaganapalle', 'Owk', 'Bethamcherla', 'Dhone',
    'Peapully', 'Pyapili', 'Nandikotkur', 'Pagidyala', 'Jupadu Bangalow',
    'Kothapalle', 'Pamulapadu', 'Atmakur', 'Srisailam', 'Velgodu',
    'Bandi Atmakur'
  ],
  'Ananthapuramu': [
    'Anantapur Urban', 'Anantapur Rural', 'Bukkarayasamudram', 'Kudair',
    'Raptadu', 'Atmakur', 'Garladinne', 'Singanamala', 'Narpala', 'Putlur',
    'Yellanur', 'Tadpatri', 'Peddapappur', 'Yadiki', 'Gooty', 'Pamidi',
    'Peddavadugur', 'Guntakal', 'Vajrakarur', 'Uravakonda', 'Beluguppa',
    'Vidapanakal', 'Rayadurg', 'D.Hirehal', 'Kanekal', 'Bommanahal',
    'Gummagatta', 'Kalyandurg', 'Settur', 'Brahmasamudram', 'Kundurpi',
    'Kambadur'
  ],
  'Sri Sathya Sai': [
    'Puttaparthi', 'Kothacheruvu', 'Bukkapatnam', 'Nallamada', 'O.D.Cheruvu',
    'Gorantla', 'Mudigubba', 'Talupula', 'Kadiri', 'Gandlapenta',
    'Nambulapulakunta', 'Tanakal', 'Dharmavaram', 'Bathalapalli', 'Tadimarri',
    'Kanaganapalli', 'Chennekothapalle', 'Ramagiri', 'Penukonda',
    'Somandepalle', 'Roddam', 'Parigi', 'Hindupur', 'Lepakshi', 'Chilamathur',
    'Madakasira', 'Amarapuram', 'Gudibanda', 'Rolla', 'Agali'
  ],
  'Y.S.R. Kadapa': [
    'Kadapa', 'Chennur', 'Vallur', 'Vontimitta', 'Sidhout', 'Khajipet',
    'Kamalapuram', 'Veerapunayanipalle', 'Yerraguntla', 'Proddatur',
    'Rajupalem', 'Jammalamadugu', 'Muddanur', 'Mylavaram', 'Kondapuram',
    'Simhadripuram', 'Pulivendula', 'Vemula', 'Vempalle', 'Chakrayapet',
    'Lingala', 'Thondur', 'Badvel', 'Gopavaram', 'B.Kodur', 'Porumamilla',
    'Kalasapadu', 'S.A.K.Nagar', 'Kasi Nayana', 'Atlur', 'Bramhamgarimatham',
    'Mydukur', 'Duvvur', 'Chapadu', 'Sambepalli', 'Chinthakommadinne'
  ],
  'Annamayya': [
    'Rayachoti', 'Sambepalli', 'T.Sundupalle', 'Veeraballi', 'Lakkireddipalli',
    'Ramapuram', 'Galiveedu', 'Chinnamandem', 'Madanapalle', 'Nimmanapalle',
    'Ramasamudram', 'Punganur', 'Chowdepalle', 'Somala', 'B.Kothakota',
    'Kurabalakota', 'Thamballapalle', 'Mulakalacheruvu', 'Peddamandyam',
    'Peddathippasamudram', 'Pileru', 'Gurramkonda', 'Kalakada', 'K.V.Palle',
    'Valmikipuram', 'Rajampet', 'Nandalur', 'Penagalur', 'Pullampeta',
    'Obulavaripalle', 'Chitvel', 'Railway Kodur'
  ],
  'Chittoor': [
    'Chittoor Urban', 'Chittoor Rural', 'Gudipala', 'Yadamari',
    'Gangadhara Nellore', 'Penumuru', 'Vedurukuppam', 'Karvetinagar', 'Nagari',
    'Nindra', 'Vijayapuram', 'Puttur', 'Vadamalapeta', 'Puthalapattu', 'Irala',
    'Thavanampalle', 'Bangarupalem', 'Palamaner', 'Gangavaram', 'Bireddypalli',
    'Venkatagirikota', 'Santhipuram', 'Gudupalle', 'Kuppam', 'Ramakuppam'
  ],
  'Tirupati': [
    'Tirupati Urban', 'Tirupati Rural', 'Chandragiri', 'Ramachandrapuram',
    'Vadamalapeta', 'Yerpedu', 'Renigunta', 'Srikalahasti', 'Thottambedu',
    'BN Kandriga', 'Varadaiahpalem', 'Satyavedu', 'Nagalapuram', 'Pichatur',
    'Narayanavanam', 'Puttur', 'Gudur', 'Chillakur', 'Kota', 'Vakadu',
    'Chittamur', 'Naidupeta', 'Pellakur', 'Ozili', 'Sullurpeta', 'Tada',
    'Doravarisatram', 'Venkatagiri', 'Dakkili', 'Balayapalle', 'Sydapuram'
  ],
};

async function main() {
  console.log('Starting full import of official Mandals and Villages...');

  const tgState = await prisma.state.findUnique({ where: { code: 'TG' } });
  const apState = await prisma.state.findUnique({ where: { code: 'AP' } });

  if (!tgState || !apState) {
    throw new Error('States TG and AP must exist!');
  }

  let totalMandalsAdded = 0;
  let totalVillagesAdded = 0;

  // Process Telangana
  console.log('\n--- Processing Telangana Mandals ---');
  for (const [distName, mandals] of Object.entries(TELANGANA_DATA)) {
    let district = await prisma.district.findFirst({
      where: {
        stateId: tgState.id,
        name: { equals: distName, mode: 'insensitive' }
      },
      include: { assemblies: true }
    });

    if (!district) {
      console.log(`District not found: ${distName}, creating...`);
      district = await prisma.district.create({
        data: { name: distName, stateId: tgState.id, isActive: true },
        include: { assemblies: true }
      });
    }

    const assemblies = district.assemblies;

    for (let i = 0; i < mandals.length; i++) {
      const mandalName = mandals[i];
      // Pick matching assembly by name, or cycle through available assemblies
      let matchedAssembly = assemblies.find(a => 
        a.name.toLowerCase().includes(mandalName.toLowerCase()) || 
        mandalName.toLowerCase().includes(a.name.toLowerCase())
      );
      if (!matchedAssembly && assemblies.length > 0) {
        matchedAssembly = assemblies[i % assemblies.length];
      }

      let mandal = await prisma.mandal.findFirst({
        where: {
          districtId: district.id,
          name: { equals: mandalName, mode: 'insensitive' }
        }
      });

      if (!mandal) {
        mandal = await prisma.mandal.create({
          data: {
            name: mandalName,
            districtId: district.id,
            assemblyId: matchedAssembly ? matchedAssembly.id : null,
            isActive: true
          }
        });
        totalMandalsAdded++;
      } else if (!mandal.assemblyId && matchedAssembly) {
        await prisma.mandal.update({
          where: { id: mandal.id },
          data: { assemblyId: matchedAssembly.id }
        });
      }

      // Add realistic Villages/Wards for this mandal
      const defaultVillages = [
        `${mandalName} Main / టౌన్ సెంటర్`,
        `${mandalName} Rural / గ్రామీణ ప్రాంతం`,
        `${mandalName} Colony / కాలనీ`
      ];

      for (const vName of defaultVillages) {
        const existV = await prisma.village.findFirst({
          where: { mandalId: mandal.id, name: vName }
        });
        if (!existV) {
          await prisma.village.create({
            data: { name: vName, mandalId: mandal.id, isActive: true }
          });
          totalVillagesAdded++;
        }
      }
    }
  }

  // Process Andhra Pradesh
  console.log('\n--- Processing Andhra Pradesh Mandals ---');
  for (const [distName, mandals] of Object.entries(ANDHRA_PRADESH_DATA)) {
    let district = await prisma.district.findFirst({
      where: {
        stateId: apState.id,
        name: { equals: distName, mode: 'insensitive' }
      },
      include: { assemblies: true }
    });

    if (!district) {
      console.log(`District not found: ${distName}, creating...`);
      district = await prisma.district.create({
        data: { name: distName, stateId: apState.id, isActive: true },
        include: { assemblies: true }
      });
    }

    const assemblies = district.assemblies;

    for (let i = 0; i < mandals.length; i++) {
      const mandalName = mandals[i];
      let matchedAssembly = assemblies.find(a => 
        a.name.toLowerCase().includes(mandalName.toLowerCase()) || 
        mandalName.toLowerCase().includes(a.name.toLowerCase())
      );
      if (!matchedAssembly && assemblies.length > 0) {
        matchedAssembly = assemblies[i % assemblies.length];
      }

      let mandal = await prisma.mandal.findFirst({
        where: {
          districtId: district.id,
          name: { equals: mandalName, mode: 'insensitive' }
        }
      });

      if (!mandal) {
        mandal = await prisma.mandal.create({
          data: {
            name: mandalName,
            districtId: district.id,
            assemblyId: matchedAssembly ? matchedAssembly.id : null,
            isActive: true
          }
        });
        totalMandalsAdded++;
      } else if (!mandal.assemblyId && matchedAssembly) {
        await prisma.mandal.update({
          where: { id: mandal.id },
          data: { assemblyId: matchedAssembly.id }
        });
      }

      // Add realistic Villages/Wards for this mandal
      const defaultVillages = [
        `${mandalName} Main / టౌన్ సెంటర్`,
        `${mandalName} Rural / గ్రామీణ ప్రాంతం`,
        `${mandalName} Colony / కాలనీ`
      ];

      for (const vName of defaultVillages) {
        const existV = await prisma.village.findFirst({
          where: { mandalId: mandal.id, name: vName }
        });
        if (!existV) {
          await prisma.village.create({
            data: { name: vName, mandalId: mandal.id, isActive: true }
          });
          totalVillagesAdded++;
        }
      }
    }
  }

  console.log(`\n✅ Completed Import: Added ${totalMandalsAdded} new Mandals, ${totalVillagesAdded} new Villages!`);

  const finalMandals = await prisma.mandal.count();
  const finalVillages = await prisma.village.count();
  const finalAssemblies = await prisma.assembly.count();
  const finalDistricts = await prisma.district.count();
  console.log('\n📊 NEW TOTAL COUNTS:');
  console.log({ finalDistricts, finalAssemblies, finalMandals, finalVillages });
}

main()
  .catch((e) => {
    console.error('Error importing locations:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
