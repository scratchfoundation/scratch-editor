# Face & Body Play (Epic 11)

สามเกมที่เล่นด้วยกล้อง ประกอบจากบล็อก `Sparky` ที่ปล่อยไปแล้วทั้งหมด

| ไฟล์ | เกม | แกนควบคุม |
|---|---|---|
| `a-head-tilt-maze.sb3` | เขาวงกตเอียงหัว | ตำแหน่งหน้า (ซ้าย/ขวา) + **ขนาดหน้า** (โน้มเข้า = ตกเร็ว) |
| `b-face-count-party.sb3` | ปาร์ตี้นับหน้า | จำนวนหน้าที่กล้องเห็น (`face_count_N`) |
| `c-motion-freeze-tag.sb3` | แข่งหยุดนิ่ง | เห็นหน้า + `detect motion` |

กติกาของเกมมองเห็นได้ในบล็อก ไม่ซ่อนใน custom block และข้อความทั้งหมดเป็นภาษาไทยระดับ ป.5

**สร้างจากสคริปต์ ไม่ใช่แก้ด้วยมือ** — ตัวสร้างและบันทึกการออกแบบ (รวมรายการ edge case
E-1..E-9 ที่แก้ไปแล้ว) อยู่ที่ `design-artifacts/face-play-examples/`

```bash
cd design-artifacts/face-play-examples
python3 build_examples.py && python3 validate_sb3.py && python3 simulate.py
```

> อย่าเอา prototype ใน `design-artifacts/face-play-prototypes/` ไปสอน — ชุดนั้นเป็นหลักฐาน
> การวิเคราะห์ ยังมีบั๊กตอนรันจริงที่ชุดนี้แก้แล้ว
