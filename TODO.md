# TIR Fleet TMS — Backlog

## Tamamlandı ✅

- [x] Load auto-numbering — L-001 formatı otomatik atanıyor
- [x] PTI /today endpoint photo_count döndürüyor
- [x] Driver edit modalına license_expiry date picker eklendi
- [x] Maintenance log — truck başına servis geçmişi, Fleet UI'da
- [x] Load belgesi ekleme — BOL / rate confirmation PDF upload
- [x] Loads sayfasına arama / filtre — broker, lane, load# arama kutusu
- [x] Sunucu deploy — 5.161.61.221 VPS, nginx + systemd, 7/24 aktif
- [x] Rate confirmation otomatik parse — PDF'den origin/dest/rate/miles çekiyor

## Beklemede / Sonraki Oturum

- [ ] DAT load board API entegrasyonu
      → developer.dat.com'dan API erişimi almak gerekiyor (başvuru + abonelik)
      → Filo 3+ TIR olunca öncelikli hale gelir
      → Backend + frontend skeleton hazırlanabilir, credentials gelince bağlanır

- [ ] HOS / ELD entegrasyonu — driver hours (TTLD API)
      → ELD donanımı da gerekiyor, saf yazılım değil

- [ ] Multi-tenant — birden fazla fleet şirketi desteği

## Düşük Öncelik

- [ ] IFTA mileage summary — state bazlı mil özeti, quarterly dosyalama
- [ ] Dashboard'da PTI count canlı güncelle — auto-refresh (polling)
- [ ] Truck status değişince renk tag canlı güncelle
