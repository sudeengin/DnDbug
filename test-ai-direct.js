// Test the AI handler directly
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const testConcept = "Bir grup yabancı, kışın ortasında gizemli bir davet alır.";

const prompt = `Sen bir DnD hikaye kurgulama asistanısın.
Kullanıcıdan gelen kısa Story Concept'i al ve 5N1K yöntemiyle genişlet.
Ama tüm 5N1K cevaplarını zorunlu olarak sabitleme:
bazı alanlar henüz GM tarafından keşfedilecek olabilir.

Kurallar:
- Sadece JSON döndür.
- Tüm metin Türkçe olacak.
- Cevaplanabilen alanlarda net veya alternatifli bilgi ver (örnek: who, where, when).
- Belirsiz veya gizli alanlarda "status": "unknown" veya "speculative" kullan.
- Her 5N1K alanında şu 4 alt bilgi bulunmalı:
  - value
  - status (known / unknown / speculative)
  - revealPlan (early / mid / late / never)
  - confidence (0.0 - 1.0)

Ek alanlar:
- "backgroundSummary": 2-3 paragraf atmosferik anlatım.
- "anchors": sahneler boyunca değişmeyen sabit noktalar.
- "unknowns": özellikle gizli bırakılan unsurlar.
- "gmSecrets": oyuncuların bilmemesi gereken GM bilgileri.
- "motifs": tekrarlayan semboller veya görsel temalar.
- "hooks": oyuncuları içeri çekecek hikaye unsurları.
- "continuityFlags": tutarlılık notları.
- "tone" ve "pacing": tek kelimelik etiketler.

Amaç:
Bu arka plan GM'e gerçek bir dünya zemini versin,
ancak gizem duygusunu korusun. Özellikle "why" ve "how"
sorularında açıklığı bırakmaktan çekinme.

Ek kural:
Eğer bir sorunun cevabı hikaye ilerledikçe değişebilecekse,
status "speculative", revealPlan "mid" veya "late" olarak ayarlanmalı.

JSON geçerli olmalı, ekstra açıklama veya yorum verme.

Story Concept: "${testConcept}"`;

async function testAI() {
  try {
    console.log('🧪 Testing AI directly...');
    console.log('📝 Test Concept:', testConcept);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Sen bir DnD hikaye kurgulama asistanısın. Sadece geçerli JSON döndür, ekstra açıklama yapma.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log('📡 Raw AI Response:');
    console.log('='.repeat(50));
    console.log(responseText);
    console.log('='.repeat(50));

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Try to parse the JSON
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('✅ JSON parsing successful!');
      console.log('📊 Parsed structure:', Object.keys(parsed));
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.error('Cleaned text:', responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    }

  } catch (error) {
    console.error('❌ AI test failed:', error.message);
  }
}

testAI();
