# Thành + Sơn — Research Session

**Format:** Sơn dẫn buổi, Thành là người được phỏng vấn
**Output cần có:** `data/scoring_design.md` + `data/test_briefs.json`
**Thời gian:** 1 buổi ~2 giờ, làm trước khi team dev bắt đầu code

---

## Brief là gì?

Brief là tờ yêu cầu mà bên brand/agency gửi cho production house khi muốn làm video.
Trong hệ thống này, brief được điền vào form với các trường sau:

```
Brand:           Vinamilk
Industry:        FMCG
Campaign type:   TVC
Tone:            emotional_storytelling
Budget:          $40,000
Timeline:        6 tuần
Description:     TVC Tết 2026 nhắm vào bà mẹ 25–40 tuổi,
                 thông điệp gia đình sum vầy, phong cách ấm
                 áp chân thật, không dàn dựng quá.
```

Hệ thống nhận brief này → tìm trong 25 director profiles → trả về top 5 người phù hợp nhất kèm điểm số và lý do.

---

## 5 ví dụ brief để Thành tham khảo

Đây là 5 loại brief phổ biến — Thành đọc qua, chỉnh lại cho gần với thực tế Alien Media, hoặc thay bằng case khác nếu có case thật hơn.

### Brief 1 — TVC Tết FMCG
```
Brand:        Vinamilk
Industry:     FMCG
Type:         TVC
Tone:         emotional_storytelling
Budget:       $40,000
Timeline:     6 tuần
Description:  TVC Tết nhắm bà mẹ 25–40, gia đình sum vầy,
              ấm áp chân thật. Không quá dàn dựng, gần gũi
              với cuộc sống thật.
```
*Câu hỏi cho Thành: Với brief này, bạn sẽ nghĩ đến ai đầu tiên trong đầu? Tại sao?*

---

### Brief 2 — Product launch F&B năng động
```
Brand:        Highlands Coffee
Industry:     F&B
Type:         digital_content
Tone:         bold_graphic
Budget:       $15,000
Timeline:     3 tuần
Description:  Ra mắt dòng sản phẩm mới cho gen Z, phong cách
              nhanh mạnh, nhiều màu sắc, nhạc sôi động.
              Distribution: TikTok + Instagram Reels.
```
*Câu hỏi cho Thành: Loại brief này khác gì so với TVC truyền thống? Bạn tìm director theo tiêu chí gì?*

---

### Brief 3 — Brand film Insurance cao cấp
```
Brand:        Manulife
Industry:     Insurance
Type:         TVC
Tone:         cinematic
Budget:       $70,000
Timeline:     8 tuần
Description:  Brand film 3 phút về hành trình cuộc sống,
              phong cách điện ảnh, nhắm khách hàng 35–55
              có thu nhập cao. Cần quay nhiều location.
```
*Câu hỏi cho Thành: Budget cao hơn có đổi tiêu chí chọn người không? Experience hay style quan trọng hơn?*

---

### Brief 4 — Social content Beauty
```
Brand:        [Beauty brand]
Industry:     Beauty
Type:         social_media_content
Tone:         lifestyle
Budget:       $8,000
Timeline:     2 tuần
Description:  Series 5 video ngắn 30s cho skincare line mới,
              phong cách nhẹ nhàng tự nhiên, influencer-feel,
              lighting đẹp, không cần storyline phức tạp.
```
*Câu hỏi cho Thành: Brief nhỏ như này có khác quy trình shortlist không? Hay bạn đã biết người rồi?*

---

### Brief 5 — Corporate film Banking
```
Brand:        Techcombank
Industry:     Banking
Type:         corporate_video
Tone:         premium_brand
Budget:       $90,000
Timeline:     10 tuần
Description:  Film 5 phút về hành trình 30 năm của ngân hàng,
              phong cách sang trọng, nhiều archive footage,
              phỏng vấn CEO và khách hàng lớn.
```
*Câu hỏi cho Thành: Đây là loại brief hiếm hay phổ biến? Bạn có sẵn danh sách người cho loại này chưa?*

---

## Việc của từng người trong buổi

### Thành làm gì

Không cần chuẩn bị nhiều. Chỉ cần:

1. **Kể 3 case thật từ memory** — không cần đủ thông tin, chỉ cần nhớ đại ý:
   - Brief trông như thế nào (loại gì, brand gì, tone gì)
   - Bạn shortlist ai (tên hoặc mô tả kiểu "người hay làm đồ uống")
   - Tại sao chọn người đó (genre? style? quen làm việc rồi? giá phù hợp?)

2. **Trả lời câu hỏi của Sơn** về 5 brief ví dụ trên — đặc biệt phần *"tại sao"*

3. **Review 25 director profiles** trong `data/directors_mockup.csv` — mỗi người 10 giây, nói xem profile trông có realistic không, thiếu thứ gì

### Sơn làm gì

Trước buổi:
- Đọc kỹ 25 profiles trong `data/directors_mockup.json`
- Chuẩn bị câu hỏi cụ thể (xem phần dưới)
- Mang theo laptop để ghi chép và format ngay trong buổi

Trong buổi:
- Dẫn dắt, hỏi, ghi lại câu trả lời của Thành
- Khi Thành nói "genre quan trọng hơn" → hỏi thêm "quan trọng hơn bao nhiêu? Gấp đôi hay gấp 3?"
- Khi Thành cho ví dụ → hỏi "trường hợp nào thì khác đi?"

Sau buổi:
- Format thành `scoring_design.md` + `test_briefs.json`
- Gửi lại cho Thành check: "Mình hiểu đúng không?"

---

## Câu hỏi Sơn cần hỏi Thành

**Về scoring — để ra được weights:**

1. Khi nhận brief, thứ đầu tiên bạn nhìn vào là gì — genre (TVC/digital) hay tone/style?
2. Có khi nào bạn chọn director không có kinh nghiệm đúng ngành không? Vì sao?
3. Budget có phải dealbreaker không — nếu director tốt nhất vượt budget 20%, bạn có xem xét không?
4. Director đang booked có ảnh hưởng đến quyết định không, hay bạn vẫn đề xuất và để client chờ?
5. Performance (views, satisfaction score) có quan trọng với client không, hay client không quan tâm số đó?

**Về ground truth — để ra test briefs:**

6. Kể 1 case gần nhất: brief trông như thế nào, bạn shortlist ai, cuối cùng ai được chọn?
7. Có case nào bạn chọn người mà sau đó thấy sai không? Sai ở đâu?
8. Loại brief nào khó shortlist nhất? Tại sao khó?

---

## Output sau buổi

### `data/scoring_design.md` — Sơn viết

```markdown
# Scoring Design

## Weights đề xuất
| Dimension      | Weight | Lý do từ Thành |
|----------------|--------|----------------|
| genre_match    | 0.25   | ...            |
| style_match    | 0.20   | ...            |
| specialty_match| 0.20   | ...            |
| performance    | 0.15   | ...            |
| availability   | 0.10   | ...            |
| experience     | 0.05   | ...            |
| budget_fit     | 0.05   | ...            |

## Budget fit: soft score hay hard filter?
[Thành nói gì]

## Availability: nên xử lý như thế nào?
[Thành nói gì]

## Những điều Thành nhấn mạnh mà scoring hiện tại chưa capture được
[Ghi lại để báo Trung — có thể cần thêm dimension mới]
```

### `data/test_briefs.json` — Sơn viết, Thành approve

5 briefs thật (từ case Thành kể hoặc 5 ví dụ trên đã chỉnh), mỗi brief có:
```json
{
  "id": "TEST-001",
  "label": "TVC Tết FMCG — case thật",
  "brand": "...",
  "industry": "FMCG",
  "campaign_type": "TVC",
  "tone": "emotional_storytelling",
  "budget_usd": 40000,
  "timeline_weeks": 6,
  "description": "...",
  "expected_top3_director_ids": ["DIR-001", "DIR-008", "DIR-012"],
  "thanh_reasoning": "Chọn 3 người này vì: DIR-001 hay làm FMCG Tết, DIR-008..."
}
```

Field `thanh_reasoning` quan trọng — đây là ground truth để team dev biết kết quả nào là "đúng".

---

## Sau khi có 2 files này

Gửi cho Trung review → Trung approve weights → Đức implement vào `scoring.py`.
Không cần chờ gì khác — dev team build được ngay.
