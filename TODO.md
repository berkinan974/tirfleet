# TIR Fleet TMS — Backlog

## Beklemede

- [ ] DAT credentials gelince aktive et
      → Server'da: `nano /opt/tirfleet/.env`
      → DAT_CLIENT_ID ve DAT_CLIENT_SECRET ekle
      → `systemctl restart tir-backend`
      → Bitti, mock → live geçer

- [ ] HOS / ELD entegrasyonu — driver hours takibi
      → ELD donanımı da gerekiyor (Samsara, KeepTruckin vb.)
      → Donanım seçilince API entegrasyonu yapılır

- [ ] Multi-tenant — birden fazla fleet şirketi desteği

## Düşük Öncelik

- [ ] Mobil uyumluluk — responsive UI, şoför telefon erişimi (filo büyüyünce öncelikli)
- [ ] IFTA mileage summary — state bazlı mil özeti, quarterly dosyalama
- [ ] Dashboard PTI count auto-refresh — sayfa yenilenmeden canlı güncelleme
- [ ] Truck status değişince renk tag canlı güncelleme
