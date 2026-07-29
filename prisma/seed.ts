import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Use upsert to create the batches ONLY if they don't already exist
  const batch1 = await prisma.batch.upsert({
    where: { name: 'FOP' },
    update: {}, // Do nothing if it exists
    create: {
      name: 'FOP',
    },
  })

  const batch2 = await prisma.batch.upsert({
    where: { name: 'NC' },
    update: {},
    create: {
      name: 'NC',
    },
  })

  console.log('Batches seeded successfully:', { batch1, batch2 })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })