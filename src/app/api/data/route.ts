import { NextResponse } from 'next/server';
import { getAllEntities, saveEntity, isDbConnected, getDbEngine, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { connected, engine, data } = await getAllEntities();
    return NextResponse.json({
      success: true,
      connected,
      engine,
      message: engine === 'POSTGRESQL'
        ? 'Base de datos PostgreSQL en línea'
        : 'Almacenamiento persistente en servidor activo (Disco JSON)',
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
    const engine = await getDbEngine();

    // Soporte para guardado en lote (batch) o por entidad individual
    if (body.batch && typeof body.batch === 'object') {
      for (const [key, val] of Object.entries(body.batch)) {
        await saveEntity(key, val);
      }

      return NextResponse.json({
        success: true,
        connected: true,
        engine,
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
      engine,
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

