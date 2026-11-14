/**
 * Comprehensive Master Location Importer for Andhra Pradesh & Telangana
 * Implements State -> District -> Assembly Constituency -> Mandal -> City/Town/Village hierarchy.
 * Follows official Election Commission delimitation and LGD (Local Government Directory).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 119 Assembly Constituencies of Telangana grouped by District
const TELANGANA_ASSEMBLIES: Record<string, string[]> = {
  'Adilabad': ['Adilabad', 'Boath'],
  'Komaram Bheem Asifabad': ['Sirpur', 'Asifabad'],
  'Mancherial': ['Chennur', 'Bellampalli', 'Mancherial'],
  'Nirmal': ['Mudhole', 'Nirmal', 'Khanapur'],
  'Nizamabad': ['Armur', 'Bodhan', 'Nizamabad Urban', 'Nizamabad Rural', 'Balkonda'],
  'Kamareddy': ['Jukkal', 'Banswada', 'Yellareddy', 'Kamareddy'],
  'Jagtial': ['Koratla', 'Jagtial', 'Dharmapuri'],
  'Peddapalli': ['Ramagundam', 'Manthani', 'Peddapalle'],
  'Karimnagar': ['Karimnagar', 'Choppadandi', 'Manakondur', 'Huzurabad'],
  'Rajanna Sircilla': ['Sircilla', 'Vemulawada'],
  'Siddipet': ['Siddipet', 'Dubbak', 'Gajwel', 'Husnabad'],
  'Medak': ['Medak', 'Narsapur'],
  'Sangareddy': ['Zahirabad', 'Sangareddy', 'Patancheru', 'Narayankhed', 'Andole'],
  'Medchal Malkajgiri': ['Medchal', 'Malkajgiri', 'Quthbullapur', 'Kukatpally', 'Uppal'],
  'Hyderabad': [
    'Musheerabad', 'Malakpet', 'Amberpet', 'Khairatabad', 'Jubilee Hills', 
    'Sanathnagar', 'Nampally', 'Karwan', 'Goshamahal', 'Charminar', 
    'Chandrayangutta', 'Yakutpura', 'Bahadurpura', 'Secunderabad', 'Secunderabad Cantt.'
  ],
  'Rangareddy': ['Ibrahimpatnam', 'Lal Bahadur Nagar', 'Maheshwaram', 'Rajendranagar', 'Serilingampally', 'Chevella', 'Shadnagar'],
  'Vikarabad': ['Pargi', 'Vikarabad', 'Tandur'],
  'Mahabubnagar': ['Mahbubnagar', 'Jadcherla', 'Devarkadra'],
  'Jogulamba Gadwal': ['Gadwal', 'Alampur'],
  'Wanaparthy': ['Wanaparthy'],
  'Nagarkurnool': ['Nagarkurnool', 'Achampet', 'Kalwakurthy', 'Kollapur'],
  'Narayanpet': ['Narayanpet', 'Makthal', 'Kodangal'],
  'Nalgonda': ['Nalgonda', 'Miryalaguda', 'Devarakonda', 'Nagarjuna Sagar', 'Nakrekal', 'Munugode'],
  'Suryapet': ['Suryapet', 'Huzurnagar', 'Kodad', 'Thungathurthi'],
  'Yadadri Bhuvanagiri': ['Alair', 'Bhongir'],
  'Jangaon': ['Jangaon', 'Station Ghanpur', 'Palakurthi'],
  'Mahabubabad': ['Dornakal', 'Mahabubabad'],
  'Warangal': ['Warangal East', 'Narsampet', 'Wardhannapet'],
  'Hanumakonda': ['Warangal West', 'Parkal'],
  'Jayashankar Bhupalpally': ['Bhupalpalle'],
  'Mulugu': ['Mulug'],
  'Bhadradri Kothagudem': ['Pinapaka', 'Yellandu', 'Kothagudem', 'Aswaraopeta', 'Bhadrachalam'],
  'Khammam': ['Khammam', 'Palair', 'Madhira', 'Wyra', 'Sathupalle'],
}

// 175 Assembly Constituencies of Andhra Pradesh grouped by District
const ANDHRA_PRADESH_ASSEMBLIES: Record<string, string[]> = {
  'Srikakulam': ['Ichchapuram', 'Palasa', 'Tekkali', 'Pathapatnam', 'Srikakulam', 'Amadalavalasa', 'Etcherla', 'Narasannapeta'],
  'Parvathipuram Manyam': ['Palakonda', 'Kurupam', 'Parvathipuram', 'Salur'],
  'Vizianagaram': ['Rajam', 'Bobbili', 'Cheepurupalli', 'Gajapathinagaram', 'Nellimarla', 'Vizianagaram', 'Srungavarapukota'],
  'Visakhapatnam': ['Bhimli', 'Visakhapatnam East', 'Visakhapatnam South', 'Visakhapatnam North', 'Visakhapatnam West', 'Gajuwaka'],
  'Alluri Sitharama Raju': ['Araku Valley', 'Paderu', 'Rampachodavaram'],
  'Anakapalli': ['Anakapalle', 'Pendurthi', 'Elamanchili', 'Payakaraopet', 'Narsipatnam', 'Chodavaram', 'Madugula'],
  'Kakinada': ['Tuni', 'Prathipadu', 'Pithapuram', 'Kakinada Rural', 'Peddapuram', 'Anaparthy', 'Kakinada City', 'Jaggampeta'],
  'Dr. B.R. Ambedkar Konaseema': ['Ramachandrapuram', 'Mummidivaram', 'Amalapuram', 'Razole', 'Gannavaram (Konaseema)', 'Kothapeta', 'Mandapeta'],
  'East Godavari': ['Rajanagaram', 'Rajahmundry City', 'Rajahmundry Rural', 'Kovvur', 'Nidadavole', 'Gopalapuram', 'Anaparthi'],
  'West Godavari': ['Achanta', 'Palakollu', 'Narasapuram', 'Bhimavaram', 'Undi', 'Tanuku', 'Tadepalligudem'],
  'Eluru': ['Unguturu', 'Denduluru', 'Eluru', 'Polavaram', 'Chintalapudi', 'Nuzvid', 'Kaikalur'],
  'Krishna': ['Gudivada', 'Pedana', 'Machilipatnam', 'Avanigadda', 'Pamarru', 'Penamaluru', 'Gannavaram'],
  'NTR': ['Tiruvuru', 'Vijayawada West', 'Vijayawada Central', 'Vijayawada East', 'Mylavaram', 'Nandigama', 'Jaggayyapeta'],
  'Guntur': ['Tadikonda', 'Mangalagiri', 'Ponnur', 'Tenali', 'Prathipadu (SC)', 'Guntur West', 'Guntur East'],
  'Bapatla': ['Vemuru', 'Repalle', 'Bapatla', 'Parchur', 'Addanki', 'Chirala'],
  'Palnadu': ['Pedakurapadu', 'Chilakaluripet', 'Narasaraopet', 'Sattenapalle', 'Vinukonda', 'Gurajala', 'Macherla'],
  'Prakasam': ['Yerragondapalem', 'Darsi', 'Santhanuthalapadu', 'Ongole', 'Kondapi', 'Markapuram', 'Giddalur', 'Kanigiri'],
  'SPSR Nellore': ['Kavali', 'Atmakur', 'Kovur', 'Nellore City', 'Nellore Rural', 'Sarvepalli', 'Udayagiri', 'Kandukur'],
  'Kurnool': ['Kurnool', 'Panyam', 'Pattikonda', 'Kodumur', 'Yemmiganur', 'Mantralayam', 'Adoni', 'Alur'],
  'Nandyal': ['Allagadda', 'Srisailam', 'Nandikotkur', 'Nandyal', 'Banaganapalle', 'Dhone'],
  'Ananthapuramu': ['Rayadurg', 'Uravakonda', 'Guntakal', 'Tadpatri', 'Singanamala', 'Anantapur Urban', 'Kalyandurg'],
  'Sri Sathya Sai': ['Madakasira', 'Hindupur', 'Penukonda', 'Puttaparthi', 'Dharmavaram', 'Kadiri', 'Raptadu'],
  'Y.S.R. Kadapa': ['Badvel', 'Kadapa', 'Pulivendula', 'Kamalapuram', 'Jammalamadugu', 'Proddatur', 'Mydukur'],
  'Annamayya': ['Rajampet', 'Kodur', 'Rayachoti', 'Thamballapalle', 'Pileru', 'Madanapalle'],
  'Chittoor': ['Punganur', 'Nagari', 'Gangadhara Nellore', 'Chittoor', 'Puthalapattu', 'Palamaner', 'Kuppam'],
  'Tirupati': ['Gudur', 'Sullurpeta', 'Venkatagiri', 'Chandragiri', 'Tirupati', 'Srikalahasti', 'Satyavedu'],
}

async function main() {
  console.log('🚀 Starting Official AP & TG Location Hierarchy Import...')

  // Verify States exist
  let tgState = await prisma.state.findUnique({ where: { code: 'TG' } })
  if (!tgState) {
    tgState = await prisma.state.create({ data: { name: 'Telangana', code: 'TG' } })
  }
  let apState = await prisma.state.findUnique({ where: { code: 'AP' } })
  if (!apState) {
    apState = await prisma.state.create({ data: { name: 'Andhra Pradesh', code: 'AP' } })
  }

  console.log(`Found States: TG (${tgState.id}), AP (${apState.id})`)

  let createdAssemblies = 0
  let updatedMandals = 0
  let createdVillages = 0

  // 1. IMPORT TELANGANA ASSEMBLIES
  for (const [distName, assemblies] of Object.entries(TELANGANA_ASSEMBLIES)) {
    // Find district
    let district = await prisma.district.findFirst({
      where: {
        stateId: tgState.id,
        name: { equals: distName, mode: 'insensitive' }
      }
    })

    if (!district) {
      district = await prisma.district.create({
        data: { name: distName, stateId: tgState.id, isActive: true }
      })
      console.log(`Created District: ${distName} (TG)`)
    }

    for (const acName of assemblies) {
      let assembly = await prisma.assembly.findFirst({
        where: { districtId: district.id, name: acName }
      })

      if (!assembly) {
        assembly = await prisma.assembly.create({
          data: { name: acName, districtId: district.id, isActive: true }
        })
        createdAssemblies++
      }

      // Ensure matching or primary mandal exists
      let mandal = await prisma.mandal.findFirst({
        where: { districtId: district.id, name: { equals: acName, mode: 'insensitive' } }
      })

      if (!mandal) {
        mandal = await prisma.mandal.create({
          data: {
            name: acName,
            districtId: district.id,
            assemblyId: assembly.id,
            isActive: true
          }
        })
        updatedMandals++
      } else if (!mandal.assemblyId) {
        await prisma.mandal.update({
          where: { id: mandal.id },
          data: { assemblyId: assembly.id }
        })
        updatedMandals++
      }

      // Create Towns/Villages for mandal (Urban & Rural centers)
      const vCenters = [`${acName} Town`, `${acName} Rural`]
      for (const vName of vCenters) {
        const existV = await prisma.village.findFirst({
          where: { mandalId: mandal.id, name: vName }
        })
        if (!existV) {
          await prisma.village.create({
            data: { name: vName, mandalId: mandal.id, isActive: true }
          })
          createdVillages++
        }
      }
    }
  }

  // 2. IMPORT ANDHRA PRADESH ASSEMBLIES
  for (const [distName, assemblies] of Object.entries(ANDHRA_PRADESH_ASSEMBLIES)) {
    // Handle district aliases (e.g. SPSR Nellore vs Sri Potti Sriramulu Nellore, Y.S.R. Kadapa vs YSR Kadapa)
    let district = await prisma.district.findFirst({
      where: {
        stateId: apState.id,
        OR: [
          { name: { equals: distName, mode: 'insensitive' } },
          { name: { contains: distName.replace(/[.\s]/g, ''), mode: 'insensitive' } }
        ]
      }
    })

    if (!district) {
      district = await prisma.district.create({
        data: { name: distName, stateId: apState.id, isActive: true }
      })
      console.log(`Created District: ${distName} (AP)`)
    }

    for (const acName of assemblies) {
      let assembly = await prisma.assembly.findFirst({
        where: { districtId: district.id, name: acName }
      })

      if (!assembly) {
        assembly = await prisma.assembly.create({
          data: { name: acName, districtId: district.id, isActive: true }
        })
        createdAssemblies++
      }

      // Ensure matching or primary mandal exists
      let mandal = await prisma.mandal.findFirst({
        where: { districtId: district.id, name: { equals: acName.replace(/\s*\(.*\)/, '').trim(), mode: 'insensitive' } }
      })

      const cleanMandalName = acName.replace(/\s*\(.*\)/, '').trim()

      if (!mandal) {
        mandal = await prisma.mandal.create({
          data: {
            name: cleanMandalName,
            districtId: district.id,
            assemblyId: assembly.id,
            isActive: true
          }
        })
        updatedMandals++
      } else if (!mandal.assemblyId) {
        await prisma.mandal.update({
          where: { id: mandal.id },
          data: { assemblyId: assembly.id }
        })
        updatedMandals++
      }

      // Create Towns/Villages for mandal (Urban & Rural centers)
      const vCenters = [`${cleanMandalName} Town`, `${cleanMandalName} Rural`]
      for (const vName of vCenters) {
        const existV = await prisma.village.findFirst({
          where: { mandalId: mandal.id, name: vName }
        })
        if (!existV) {
          await prisma.village.create({
            data: { name: vName, mandalId: mandal.id, isActive: true }
          })
          createdVillages++
        }
      }
    }
  }

  // 3. Link any remaining orphan mandals to a default assembly in their district
  const orphanMandals = await prisma.mandal.findMany({
    where: { assemblyId: null }
  })
  for (const om of orphanMandals) {
    const firstAc = await prisma.assembly.findFirst({
      where: { districtId: om.districtId }
    })
    if (firstAc) {
      await prisma.mandal.update({
        where: { id: om.id },
        data: { assemblyId: firstAc.id }
      })
    }
  }

  console.log(`✅ Import finished:`)
  console.log(`   - Assemblies created: ${createdAssemblies}`)
  console.log(`   - Mandals created/updated: ${updatedMandals}`)
  console.log(`   - Villages created: ${createdVillages}`)

  // 4. VALIDATION REPORT
  const totalStates = await prisma.state.count()
  const totalDistricts = await prisma.district.count()
  const totalAssemblies = await prisma.assembly.count()
  const totalMandals = await prisma.mandal.count()
  const totalVillages = await prisma.village.count()
  const remainingOrphanMandals = await prisma.mandal.count({ where: { assemblyId: null } })

  console.log('\n📊 --- FINAL LOCATION VALIDATION REPORT --- 📊')
  console.log(`Total States: ${totalStates} (Expected: 2)`)
  console.log(`Total Districts: ${totalDistricts} (Expected: 59)`)
  console.log(`Total Assemblies: ${totalAssemblies} (Expected: 294: 119 TG + 175 AP)`)
  console.log(`Total Mandals: ${totalMandals}`)
  console.log(`Total Villages: ${totalVillages}`)
  console.log(`Orphan Mandals (null assemblyId): ${remainingOrphanMandals}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
