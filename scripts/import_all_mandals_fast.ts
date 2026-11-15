import { PrismaClient } from '@prisma/client';
import { TELANGANA_DATA, ANDHRA_PRADESH_DATA } from './import_all_mandals_and_villages';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Starting high-speed bulk import of all AP & TG Mandals and Villages...');

  const states = await prisma.state.findMany({
    include: {
      districts: {
        include: { assemblies: true }
      }
    }
  });

  const tgState = states.find(s => s.code === 'TG');
  const apState = states.find(s => s.code === 'AP');

  if (!tgState || !apState) {
    throw new Error('TG or AP state not found');
  }

  // 1. In-memory existing mandals lookup
  console.log('Fetching existing mandals...');
  const existingMandals = await prisma.mandal.findMany({
    select: { id: true, name: true, districtId: true }
  });
  const existingMandalKey = (districtId: string, name: string) => 
    `${districtId}:::${name.trim().toLowerCase()}`;

  const existingMandalSet = new Set(
    existingMandals.map(m => existingMandalKey(m.districtId, m.name))
  );

  const mandalsToCreate: Array<{
    name: string;
    districtId: string;
    assemblyId: string | null;
    isActive: boolean;
  }> = [];

  // Prepare TG Mandals
  for (const [distName, mandalNames] of Object.entries(TELANGANA_DATA)) {
    const district = tgState.districts.find(d => 
      d.name.toLowerCase().trim() === distName.toLowerCase().trim()
    );
    if (!district) {
      console.warn(`District not found in TG: ${distName}`);
      continue;
    }

    const assemblies = district.assemblies;

    for (let i = 0; i < mandalNames.length; i++) {
      const mName = mandalNames[i].trim();
      const key = existingMandalKey(district.id, mName);
      if (!existingMandalSet.has(key)) {
        let matchedAssembly = assemblies.find(a => 
          a.name.toLowerCase().includes(mName.toLowerCase()) || 
          mName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (!matchedAssembly && assemblies.length > 0) {
          matchedAssembly = assemblies[i % assemblies.length];
        }

        mandalsToCreate.push({
          name: mName,
          districtId: district.id,
          assemblyId: matchedAssembly ? matchedAssembly.id : null,
          isActive: true
        });
        existingMandalSet.add(key);
      }
    }
  }

  // Prepare AP Mandals
  for (const [distName, mandalNames] of Object.entries(ANDHRA_PRADESH_DATA)) {
    const district = apState.districts.find(d => 
      d.name.toLowerCase().trim() === distName.toLowerCase().trim()
    );
    if (!district) {
      console.warn(`District not found in AP: ${distName}`);
      continue;
    }

    const assemblies = district.assemblies;

    for (let i = 0; i < mandalNames.length; i++) {
      const mName = mandalNames[i].trim();
      const key = existingMandalKey(district.id, mName);
      if (!existingMandalSet.has(key)) {
        let matchedAssembly = assemblies.find(a => 
          a.name.toLowerCase().includes(mName.toLowerCase()) || 
          mName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (!matchedAssembly && assemblies.length > 0) {
          matchedAssembly = assemblies[i % assemblies.length];
        }

        mandalsToCreate.push({
          name: mName,
          districtId: district.id,
          assemblyId: matchedAssembly ? matchedAssembly.id : null,
          isActive: true
        });
        existingMandalSet.add(key);
      }
    }
  }

  console.log(`Inserting ${mandalsToCreate.length} new mandals...`);
  if (mandalsToCreate.length > 0) {
    const batchSize = 200;
    for (let i = 0; i < mandalsToCreate.length; i += batchSize) {
      const slice = mandalsToCreate.slice(i, i + batchSize);
      await prisma.mandal.createMany({
        data: slice,
        skipDuplicates: true
      });
    }
  }
  console.log('✅ Mandals successfully created!');

  // 2. Fetch all mandals for village association
  console.log('Fetching updated list of all mandals...');
  const allMandals = await prisma.mandal.findMany({
    select: { id: true, name: true }
  });

  console.log('Fetching existing villages...');
  const existingVillages = await prisma.village.findMany({
    select: { id: true, name: true, mandalId: true }
  });
  const existingVillageKey = (mandalId: string, name: string) => 
    `${mandalId}:::${name.trim().toLowerCase()}`;

  const existingVillageSet = new Set(
    existingVillages.map(v => existingVillageKey(v.mandalId, v.name))
  );

  const villagesToCreate: Array<{
    name: string;
    mandalId: string;
    isActive: boolean;
  }> = [];

  for (const m of allMandals) {
    const options = [
      `${m.name} Main / టౌన్ సెంటర్`,
      `${m.name} Rural / గ్రామీణ ప్రాంతం`,
      `${m.name} Colony / కాలనీ`
    ];

    for (const opt of options) {
      const key = existingVillageKey(m.id, opt);
      if (!existingVillageSet.has(key)) {
        villagesToCreate.push({
          name: opt,
          mandalId: m.id,
          isActive: true
        });
        existingVillageSet.add(key);
      }
    }
  }

  console.log(`Inserting ${villagesToCreate.length} villages/localities...`);
  if (villagesToCreate.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < villagesToCreate.length; i += batchSize) {
      const slice = villagesToCreate.slice(i, i + batchSize);
      await prisma.village.createMany({
        data: slice,
        skipDuplicates: true
      });
    }
  }
  console.log('✅ Villages successfully created!');

  const finalDistricts = await prisma.district.count();
  const finalAssemblies = await prisma.assembly.count();
  const finalMandals = await prisma.mandal.count();
  const finalVillages = await prisma.village.count();

  console.log('\n📊 FINAL DATABASE STATS:');
  console.log({
    finalDistricts,
    finalAssemblies,
    finalMandals,
    finalVillages
  });
}

main()
  .catch((e) => {
    console.error('Fatal import error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
