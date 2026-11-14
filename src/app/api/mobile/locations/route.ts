import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const states = await db.state.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        districts: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            name: 'asc',
          },
          select: {
            id: true,
            name: true,
            mandals: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              orderBy: {
                name: 'asc',
              },
              select: {
                id: true,
                name: true,
                villages: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            assemblies: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              orderBy: {
                name: 'asc',
              },
              select: {
                id: true,
                name: true,
                mandals: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                  select: {
                    id: true,
                    name: true,
                    villages: {
                      where: {
                        isActive: true,
                        deletedAt: null,
                      },
                      orderBy: {
                        name: 'asc',
                      },
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      states: states.map(state => ({
        id: state.id,
        name: state.name,
        code: state.code,
        districts: state.districts,
      })),
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
