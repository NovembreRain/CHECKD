// /src/app/api/search/semantic/route.ts
// FAST SEARCH API (< 500ms response time)

import { NextRequest, NextResponse } from 'next/server';
import { fastSearch } from '@/lib/fast-search';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { query } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`\n📥 Search Request: "${query}"`);

    // Fast search (< 500ms)
    const results = await fastSearch(query);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Total API time: ${totalTime}ms\n`);

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
      responseTime: totalTime,
      debug: {
        responseTime: `${totalTime}ms`,
        topResults: results.slice(0, 3).map(r => ({
          name: r.name,
          city: r.city,
          location: r.location,
          score: r.relevanceScore,
          locationScore: r.locationScore,
          capacityScore: r.capacityScore,
          eventScore: r.eventScore
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}