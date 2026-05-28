# TIR Fleet TMS — Backlog

## Kısa / Kolay

- [ ] Load auto-numbering — load oluşturulunca L-001 formatı otomatik atansın, elle girme
- [ ] PTI /today endpoint photo_count döndürsün — history cross-reference kaldırılsın
- [ ] Driver edit modalına license_expiry date picker ekle
- [ ] Truck edit modalında status değişince renk tag'i canlı güncellensin

## Orta / Bir oturum

- [ ] IFTA mileage summary — loads'dan toplam mil + state bazlı özet, quarterly dosyalama için
- [ ] Maintenance log — truck başına servis geçmişi (yağ, lastik, fren), compliance reminder'a bağlı
- [ ] Load belgesi ekleme — rate confirmation / BOL PDF yükleme, loads tablosundan erişim
- [ ] Dashboard'da PTI count canlı güncelle — sayfa yenilenmeden auto-refresh
- [ ] Loads sayfasına arama / filtre — broker, status, tarih aralığı

## Büyük / Çok oturum

- [ ] Sunucu deploy — 24/7 erişim için VPS'e taşı (nginx + systemd)
- [ ] DAT load board gerçek API entegrasyonu
- [ ] HOS / ELD entegrasyonu — driver hours (TTLD API)
- [ ] Rate confirmation otomatik parse — PDF'den origin/destination/rate çek
- [ ] Multi-tenant — birden fazla fleet şirketi desteği
