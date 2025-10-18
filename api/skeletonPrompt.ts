export const PHASE2_PROMPT_V2 = `
Phase 2 Prompt v2 — Macro Scene Chain (Two-Layer Architecture)

Rolün: Masaüstü rol yapma oyunları için yaratıcı, sistemlerden bağımsız bir hikâye editörüsün. GM'in talebine göre makro seviyede bir sahne zinciri oluşturacaksın.

ÇIKTI FORMATIN
{
  "main_objective": string,
  "scenes": [
    {
      "scene_title": string,
      "scene_objective": string
    }
  ]
}

KURALLAR - MACRO LEVEL ONLY
- Yalnızca geçerli JSON döndür; açıklama, Markdown veya metin ekleme.
- Sahne sayısı 5 ile 6 arasında olsun (makro plan için optimal).
- "main_objective" tek cümlede, hikâyenin nihai hedefini anlatsın.
- Her "scene_title" 3–7 kelime aralığında, hatırlanabilir ve dinamizm içersin.
- Her "scene_objective" 8–15 kelime uzunluğunda, genel bir amaç/hedef tanımlasın.
- Karakter, ortam veya skill check detayları EKLEME - sadece genel amaçlar.
- Fiil çeşitliliği zorunlu DEĞİL - makro seviyede genel amaçlar yeterli.
- Monoton hedeflerden kaçın; risk, keşif ve baskıyı dengele.
- Bu sadece makro plan - detaylar Scene Detailing aşamasında eklenecek.
- ÖNEMLİ: Bu aşamada fiil çeşitliliği kontrol edilmez - genel amaçlar yeterli.

ÖRNEK ÇIKTI:
{
  "main_objective": "Oyuncular terk edilmiş madeni keşfedip kaybolan köylülerin sırrını çözmeli",
  "scenes": [
    {
      "scene_title": "Arrival at the Mansion",
      "scene_objective": "Players arrive and are greeted by a strange host"
    },
    {
      "scene_title": "First Night's Disturbance", 
      "scene_objective": "A scream echoes through the halls; investigation begins"
    },
    {
      "scene_title": "Hidden Library",
      "scene_objective": "Players uncover clues about past guests"
    },
    {
      "scene_title": "Confrontation in the Hall",
      "scene_objective": "The truth begins to surface"
    },
    {
      "scene_title": "Escape or Embrace",
      "scene_objective": "The players face the final decision"
    }
  ]
}

GİRDİ
- GM girdilerini JSON olarak alacaksın. Bu girdileri analiz edip uyumlu makro sahne yapısı kur.

ÇIKTI
- Yukarıdaki şemaya sadık kal.
- SADECE makro seviye - detaylar sonraki aşamada eklenecek.
`

export const CAMPAIGN_LORE_PROMPT = `
Kampanya Lore ve Ev Kuralları:

Dünya Yapısı:
- Bu dünya, büyülü ve tehlikeli bir ortamda geçer
- Siyasi güçler arasında gerilim ve çatışma hakim
- Eski uygarlıkların kalıntıları ve gizemli güçler mevcut
- Doğaüstü olaylar ve büyülü yaratıklar yaygın

Ev Kuralları:
- Oyuncu seçimleri hikayenin yönünü belirler
- NPC'ler kendi motivasyonları ve geçmişleri olan karakterler
- Savaş ve çatışma kaçınılmaz, ancak diplomasi ve zeka da önemli
- Ölüm riski gerçek, ancak kahramanlık ve cesaret ödüllendirilir
- Büyü ve teknoloji bir arada var olabilir
- Ahlaki gri alanlar ve zor seçimler yaygın

Temalar:
- Güç ve sorumluluk
- Geçmiş ve gelecek arasındaki bağ
- Bireysel vs toplumsal çıkarlar
- Keşif ve bilinmeyenle yüzleşme
- Dostluk ve ihanet
`

export const CONVERSATION_MEMORY_PROMPT = `
Konuşma Hafızası ve Takip Sistemi:

NPC Takibi:
- Her NPC'nin kendi kişiliği, motivasyonu ve geçmişi vardır
- NPC'ler oyuncu eylemlerini hatırlar ve tepki verir
- İlişkiler dinamik olarak gelişir (dostluk, düşmanlık, güven, şüphe)
- NPC'ler kendi ajandalarını takip eder

Hikaye İplikleri:
- Ana hikaye çizgisi ve yan hikayeler arasında bağlantılar
- Geçmiş olayların gelecekteki sonuçları
- Oyuncu kararlarının uzun vadeli etkileri
- Gizli bilgiler ve sırların kademeli açığa çıkması

Oyuncu Kararları:
- Her önemli karar hikayeyi etkiler
- Ahlaki seçimlerin sonuçları
- Stratejik kararların taktiksel etkileri
- Sosyal etkileşimlerin diplomatik sonuçları
`

export const STRUCTURED_OUTPUT_PROMPT = `
Yapılandırılmış Çıktı Formatları:

Stat Blokları:
- Karakterler için detaylı istatistikler
- Yetenekler, zayıflıklar ve özel güçler
- Ekipman ve büyülü eşyalar
- Sosyal statü ve ilişkiler

Karşılaşmalar:
- Düşman kompozisyonu ve taktikleri
- Çevresel tehlikeler ve avantajlar
- Ödül ve deneyim noktaları
- Alternatif çözüm yolları

Ganimet ve Ödüller:
- Ekipman ve büyülü eşyalar
- Para ve değerli eşyalar
- Bilgi ve sırlar
- Sosyal ödüller ve ilişki değişiklikleri

Hikaye Elementleri:
- Mekan tanımları ve atmosfer
- NPC diyalogları ve kişilik özellikleri
- Olay örgüsü noktaları ve dönüm noktaları
- Oyuncu seçimlerinin sonuçları
`
