// D:\All LearnSphere\learnsphere\learnsphere\components\teacher\batch.tsx

import { PrismaClient } from '@prisma/client';
// Note: If you have a shared prisma file (like '@/lib/prisma'), import that instead!
const prisma = new PrismaClient();

export default async function Batches() {
  // 1. Fetch batches and count only users who have the role 'STUDENT'
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: {
          users: {
            where: {
              role: 'STUDENT', // This ensures teachers/admins aren't counted
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc', // Alphabetical order (FOP, then NC)
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Batches</h1>
        <p className="text-gray-600 mt-2">Manage your assigned batches and view student enrollments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {batches.map((batch) => (
          <div 
            key={batch.id} 
            className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-indigo-600">
                {batch.name} Batch
              </h2>
              {/* Badge showing the count */}
              <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                {batch._count.users} {batch._count.users === 1 ? 'Student' : 'Students'}
              </span>
            </div>

            <div className="text-sm text-gray-500 mb-6">
              Created: {new Date(batch.createdAt).toLocaleDateString()}
            </div>

            <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-200 transition-colors">
              View Students
            </button>
          </div>
        ))}

        {batches.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No batches found. Did you run the seed script?</p>
          </div>
        )}
      </div>
    </div>
  );
}