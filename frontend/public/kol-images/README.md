# Ảnh KOL

Bỏ ảnh thật của KOL vào folder này. Đặt tên file **theo tên KOL** (slug).

## Quy ước đặt tên

Tên file = tên KOL viết thường, bỏ dấu, nối bằng gạch ngang. Ví dụ:

```
linh-chi.jpg     ← Linh Chi
duc-phuc.png     ← Đức Phúc
ha-my.webp       ← Hà My
quang-dai.jpg    ← Quang Đại
```

- Bỏ dấu tiếng Việt: "Đức Phúc" → `duc-phuc`, "Hà My" → `ha-my`.
- Hỗ trợ đuôi: `.jpg`, `.jpeg`, `.png`, `.webp` (UI tự dò theo thứ tự đó).
- Tên slug có sẵn ở cột `suggested_filename` trong `kol-image-guide.csv` — copy đúng tên đó, chỉ đổi đuôi nếu cần.
- KOL nào chưa có ảnh thì UI tự fallback về avatar chữ cái (initials).

## Map tên ↔ slug

Xem `kol-image-guide.csv` (cùng folder): cột `suggested_filename`, `stage_name`,
`main_niche`, `kol_id`.

## Đã nối vào UI

Ảnh hiển thị ở: card KOL trong shortlist (Match Engine) và avatar nhỏ trong 3 layer.
Cứ bỏ ảnh vào đây, refresh trang là thấy — không cần đụng code.
