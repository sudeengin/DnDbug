# Edit Delta & Impact Domain Calculation Implementation

## Overview

Bu implementasyon, sahnede yapılan düzenlemelerin önceki bağlamı nasıl değiştirdiğini tespit etmek ve hangi sonraki sahnelerin yeniden üretilmesi gerektiğini belirlemek için geliştirilmiştir.

## 🎯 Hedef

- Sahne edit sonrası otomatik delta analizi
- Etkilenen sahneler listesi (affectedScenes)
- Yeniden üretim önerisi (soft/hard)
- Scene Detailing UI'da "Etkilenen Sahneler" paneli

## 📦 Kapsam

### API Endpoints

#### POST /apply_edit
**Input:**
```json
{
  "sceneId": "scene-2",
  "oldDetail": { ...SceneDetail },
  "newDetail": { ...SceneDetail }
}
```

**Output:**
```json
{
  "ok": true,
  "data": {
    "updatedDetail": { ...SceneDetail },
    "delta": {
      "keysChanged": ["trust_level_host", "revealedInfo"],
      "summary": "NPC attitude changed; new clue added"
    },
    "affectedScenes": [
      { "sceneId": "scene-3", "reason": "trust_level_host changed", "severity": "soft" },
      { "sceneId": "scene-4", "reason": "new clue revealed", "severity": "hard" }
    ]
  }
}
```

#### POST /propagate
**Input:**
```json
{
  "fromSceneIndex": 2,
  "chainId": "chain_123",
  "affectedScenes": [...AffectedScene]
}
```

**Output:**
```json
{
  "ok": true,
  "data": {
    "regenerationPlan": ["scene-3", "scene-4", "scene-5"]
  }
}
```

## 🧱 Delta Hesaplama Mantığı

### Programmatic Analysis (`delta_service.ts`)
1. **Eski ve yeni SceneDetail objeleri karşılaştırılır**
2. **Alan bazlı farklar çıkarılır:**
   - `keyEvents` veya `revealedInfo` değişirse → hard uyarı
   - `stateChanges` içinde değer farkı varsa → soft uyarı
   - Sadece yazım/üslup farkı → ignore
3. **Değişen anahtarlar** `delta.keysChanged` listesine eklenir
4. **İlgili sahneler** (i+1..n) `affectedScenes` listesinde döner

### AI-Powered Analysis (`delta_prompt.ts`)
- Daha anlamsal analiz için OpenAI kullanır
- Fallback olarak programmatic analiz kullanılır
- Türkçe çıktı üretir

## 🧩 Prompt Şablonu

```typescript
const prompt = `
Sen bir DnD sahne editörüsün. Aşağıdaki eski ve yeni sahne detaylarını karşılaştır ve değişiklikleri analiz et.

OLD_DETAIL: {oldDetail}
NEW_DETAIL: {newDetail}

GÖREVLER:
1. Her iki versiyonu anlamsal olarak karşılaştır
2. Değişen anahtarları (context ile ilgili) belirle
3. Delta'yı doğal dilde özetle
4. Etkilenen sonraki sahneleri belirle ve önem derecesi ata
5. Güncellenmiş detay, delta özeti ve etkilenen sahneler listesini döndür

ÇIKTI ŞEMASI:
{
  "updatedDetail": SceneDetail,
  "delta": {
    "keysChanged": string[],
    "summary": string
  },
  "affectedScenes": Array<{
    "sceneId": string,
    "reason": string,
    "severity": "soft" | "hard"
  }>
}
`;
```

## 🧩 UI Implementation

### SceneDetailEditor.tsx Updates
- **Edit Mode**: Sahne içeriğini düzenlemek için form alanları
- **Save Changes**: Değişiklikleri kaydet ve delta analizi yap
- **Affected Scenes Panel**: Etkilenen sahneleri görsel olarak göster
- **Severity Indicators**: Soft (🟡) ve Hard (🔴) etki göstergeleri

### Key Features
- Real-time edit mode toggle
- Delta analysis on save
- Visual severity indicators
- Turkish language support
- Collapsible affected scenes panel

## ✅ Validation & Error Handling

### Schema Validation (`validation.ts`)
- `validateApplyEditResponse()`: Apply edit response validation
- `validatePropagateResponse()`: Propagate response validation
- `validateEditDelta()`: Delta object validation
- `validateAffectedScene()`: Affected scene validation
- `validateSceneDetail()`: Scene detail validation

### Error Handling
- AI analysis failure → fallback to programmatic analysis
- JSON parsing errors → graceful degradation
- Validation failures → warning logs
- Network errors → user-friendly error messages

## 🧪 Test Scenarios

### Test File: `test-delta.html`
1. **Minor State Change**: `trust_level_host: -1 → 1` → soft impact
2. **Major Plot Change**: New clue revealed → hard impact  
3. **No Significant Change**: Only formatting differences → ignored

### Test Cases
- ✅ Objective değişmez → delta boş, affectedScenes boş
- ✅ trust_level_host -1 → 1 → sahne3 soft öneri
- ✅ Yeni clue eklendi → sahne4 hard öneri
- ✅ Sadece yazım farkı → ignored delta
- ✅ Arka arkaya edit → son context geçerli kalır

## 🚧 Risk Mitigation

### Model Anlamsız Fark Üretmesi
- **Threshold kontrolü** ve anahtar filtreleme
- **Fallback mechanism** programmatic analiz
- **Validation** tüm response'lar için

### Fazla Sahne İşaretlemesi
- **Yalnızca sonraki 2-3 sahneye etki** sınırı
- **Severity-based filtering** (hard vs soft)
- **Scene ID validation** geçerli format kontrolü

### JSON Bozulması
- **Şema doğrulama** zorunluluğu
- **Graceful degradation** hata durumlarında
- **Comprehensive logging** debug için

## 📁 File Structure

```
api/
├── delta_service.ts          # Programmatic delta analysis
├── delta_prompt.ts           # AI prompt templates
├── apply_edit.ts             # Apply edit API endpoint
├── propagate.ts              # Propagate API endpoint
├── validation.ts             # Response validation
└── model.ts                  # AI model configuration

src/
├── types/macro-chain.ts      # Type definitions
└── components/
    └── SceneDetailEditor.tsx # UI implementation

test-delta.html               # Test interface
EDIT_DELTA_IMPLEMENTATION.md  # This documentation
```

## 🚀 Usage

1. **Generate Scene Content**: Normal sahne üretimi
2. **Edit Scene**: "Edit Scene" butonuna tıkla
3. **Make Changes**: Form alanlarında değişiklik yap
4. **Save Changes**: "Save Changes" ile kaydet
5. **View Impact**: "Etkilenen Sahneler" panelinde sonuçları gör
6. **Regenerate**: Etkilenen sahneleri yeniden üret

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: AI analysis için (opsiyonel)
- Yoksa programmatic analysis kullanılır

### Server Configuration
- Port: 3000
- CORS: Enabled
- JSON parsing: Enabled

## 📊 Performance

- **AI Analysis**: ~2-3 saniye (OpenAI API)
- **Programmatic Analysis**: ~50ms
- **UI Updates**: Real-time
- **Validation**: ~10ms

## 🎨 UI/UX Features

- **Turkish Language Support**: Tüm metinler Türkçe
- **Visual Severity Indicators**: Renkli etki göstergeleri
- **Collapsible Panels**: Alan tasarrufu
- **Real-time Feedback**: Anlık sonuç gösterimi
- **Error Handling**: Kullanıcı dostu hata mesajları

## 🔮 Future Enhancements

- **Batch Analysis**: Birden fazla sahne düzenleme
- **Impact Visualization**: Grafik gösterim
- **Auto-regeneration**: Otomatik yeniden üretim
- **History Tracking**: Değişiklik geçmişi
- **Advanced AI**: Daha gelişmiş anlamsal analiz
