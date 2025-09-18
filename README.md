# Seçili Sekmeleri Birleştir

Sağ tıklama bağlam menülerini kullanarak **tarayıcı pencerelerini birleştirmenize ve bölmenize** yardımcı olan hafif bir Chrome uzantısı.

## Özellikler

* **Pencereler Arasında Sekmeleri Birleştir**
Sağ tıklayın ve bir pencereyi seçerek tüm sekmelerini geçerli pencerenizle birleştirin.

* **Pencereyi Böl**
Geçerli sekmeyi yeni bir pencereye taşıyın, kalan sekmeleri başka bir pencereye itin.

* **Dinamik Bağlam Menüleri**
Bağlam menüsü, o anda odaklanılan pencereye bağlı olarak otomatik olarak güncellenir.

## Nasıl Çalışır?

* Eklenti, iki ana seçeneğe sahip bir **bağlam menüsü** ekler:

* **Başka bir penceredeki tüm sekmeleri birleştir** – diğer tüm açık Chrome pencerelerini, ilk sekmelerinin başlığını ve sekme sayısını göstererek listeler. Birini seçtiğinizde, tüm sekmeleri geçerli pencerenizle birleştirilir.
* **Pencereyi Böl (geçerli sekme → yeni pencere)** – geçerli sekmenizi yeni bir pencereye taşır ve kalan sekmeleri başka bir pencereye yerleştirir.

* `background.js` menü oluşturma, sekme birleştirme ve pencere bölme işlemlerini gerçekleştirir.

* `content.js` sağ tıklamaları dinler ve arka plan betiğini bilgilendirir.

* `manifest.json` eklentiyi gerekli izinlerle kaydeder.

## Kurulum

1. Bu deponun kopyasını oluşturun veya indirin.
2. **Google Chrome**'u açın ve `chrome://extensions/` adresine gidin.
3. **Geliştirici modunu** etkinleştirin (sağ üst köşedeki geçiş düğmesi).
4. **Paketlenmemiş olarak yükle**'ye tıklayın ve bu projenin klasörünü seçin.
5. Eklenti artık Chrome araç çubuğunuzda görünmelidir.

## İzinler

Eklenti şunları gerektirir:

* `tabs` – sekmeleri taşımak ve birleştirmek için.
* `windows` – tarayıcı pencereleri oluşturmak ve yönetmek için.
* `contextMenus` – sağ tıklama seçenekleri eklemek için. * `scripting` – içerik ve arka plan betikleri arasındaki etkileşimleri yönetmek için.

## Dosya Yapısı

```
.
├── background.js # Bağlam menüsü, birleştirme ve bölme mantığını yönetir
├── content.js # Sağ tıklamada olay gönderir
├── manifest.json # Eklenti yapılandırması
└── README.md # Proje dokümantasyonu
```

## Notlar

* **Chrome Manifest V3** ile çalışır.
* Bölme sırasında oluşturulan pencereler durumlarını (tam ekran, normal vb.) korur.
* Odak pencereler arasında değiştiğinde uzantı menülerini dinamik olarak günceller.

---

### Gelecekteki Geliştirmeler

* Seçici sekme birleştirme eklendi (tüm pencereler yerine belirli sekmeleri seçin).
* Bağlam menülerine ek olarak klavye kısayolları desteği.
