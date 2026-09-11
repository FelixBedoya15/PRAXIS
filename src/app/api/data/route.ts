import { NextResponse } from 'next/server';
import { getAllEntities, saveEntity, isDbConnected, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isConnected = await isDbConnected();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        connected: false,
        message: 'PostgreSQL no configurado o no disponible en DATABASE_URL',
        data: {},
      });
    }

    const { data } = await getAllEntities();
    return NextResponse.json({
      success: true,
      connected: true,
      data,
    });
  } catch (error: any) {
    console.error('API /api/data GET error:', error);
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error.message || 'Error al conectar con la base de datos',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Soporte para guardado en lote (batch) o por entidad individual
    if (body.batch && typeof body.batch === 'object') {
      const isConnected = await isDbConnected();
      if (!isConnected) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: 'PostgreSQL no disponible para guardar en lote',
        });
      }

      for (const [key, val] of Object.entries(body.batch)) {
        await saveEntity(key, val);
      }

      return NextResponse.json({
        success: true,
        connected: true,
        savedBatch: Object.keys(body.batch),
      });
    }

    const { key, data } = body;
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Parámetro "key" requerido' },
        { status: 400 }
      );
    }

    const saved = await saveEntity(key, data);
    return NextResponse.json({
      success: saved,
      connected: saved,
      key,
    });
  } catch (error: any) {
    console.error('API /api/data POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al guardar en base de datos',
      },
      { status: 500 }
    );
  }
}
