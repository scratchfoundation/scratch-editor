# ตัวอย่างโปรเจกต์ Sparky

เปิดใน Spark scratch-editor: **File → Load from your computer** แล้วเลือกไฟล์ `.sb3`
ตัวอย่างที่ใช้บอร์ดต้องกดปุ่ม Sparky ในแถบซ้ายเพื่อเชื่อมต่อก่อน

```
examples/
├─ 1-sensors/       เซนเซอร์ทีละตัว — ใช้สอนบล็อกพื้นฐาน
├─ 2-ai-camera/     กล้อง + AI บนบอร์ด — Face & Body, Face ID
├─ 3-scratch-only/  เกม Scratch ล้วน ไม่ต้องต่อบอร์ด
└─ _authoring/      ของสำหรับคนสร้างตัวอย่าง ไม่ใช่ไฟล์สอน
```

## 1-sensors — เซนเซอร์ทีละตัว

| ไฟล์ | เซนเซอร์ | บล็อกหลักที่ใช้ |
|---|---|---|
| `imu/IMU_roll_test.sb3` | IMU | `imuRoll` |
| `imu/IMU_Pitch_test.sb3` | IMU | `imuPitch`, LED |
| `imu/SparkyGame_ShakeCounter.sb3` | IMU | `whenShake`, LED, buzzer |
| `light/DayNight_v3_Sparky.sb3` | Light | `lightLevel`, `whenBright`, LED, buzzer |
| `mic/SoundBarTest_Sparky.sb3` | Mic | `micLevel`, LED |
| `tof/AlarmSensor.sb3` | ToF | `whenNear`, `setTofThreshold`, LED, buzzer |
| `tof/DistanceRuler_mm_Sparky.sb3` | ToF | `tofDistance`, ปุ่ม, LED, buzzer |
| `tof/ParkingSensor_mm_Sparky.sb3` | ToF | `tofDistance`, LED, buzzer |

`tof/ParkingSensor_mm_Sparky.zip` + `.unpacked/` คือไฟล์เดียวกันในรูปแบบที่แตกไว้แล้ว
(ติดมากับชุดที่ลูกค้าส่งให้ เก็บไว้เผื่ออ้างอิง — ตัวที่ใช้สอนคือ `.sb3`)

## 2-ai-camera — กล้อง + AI บนบอร์ด

ต้องใช้บอร์ดที่มีกล้องและเฟิร์มแวร์ที่รองรับ ถ้าบอร์ดทำไม่ได้ บล็อกจะตอบค่า mock
พร้อม toast ภาษาไทยครั้งเดียว (FR28) โปรเจกต์ไม่ error

| โฟลเดอร์ | ไฟล์ | เรื่อง |
|---|---|---|
| `face-play/` | `a-head-tilt-maze.sb3` | เขาวงกตเอียงหัว — คุมลูกบอลด้วยตำแหน่ง/ขนาดใบหน้า |
| | `b-face-count-party.sb3` | ปาร์ตี้นับหน้า — ฉากเปลี่ยนตามจำนวนคนที่กล้องเห็น |
| | `c-motion-freeze-tag.sb3` | แข่งหยุดนิ่ง — เห็นหน้า + ภาพขยับ = โดนจับ |
| `face-id/` | `d-face-id-door.sb3` | ประตูอัจฉริยะ — รายชื่อที่อนุญาต + ประตูความมั่นใจ |
| | `e-face-id-checkin.sb3` | เช็คชื่อเข้าเรียน — แปลงรหัสช่องเป็นชื่อในโปรเจกต์เอง |
| | `f-face-id-greeting.sb3` | ทักทายอัตโนมัติ — ใช้ `detect face` เป็นประตูกันบล็อกที่ช้า |

ชุด `face-id/` ต้องให้ครูลงทะเบียนหน้าในแผง Advanced ของ middleware ก่อน
รายละเอียดและข้อจำกัดของบล็อกอยู่ใน `face-id/README.md`

## 3-scratch-only — ไม่ต้องต่อบอร์ด

`Ice Cream Shop 2.sb3`, `Laser Connect! (Puzzle Game).sb3`, `bike.sb3`
เกม Scratch ล้วน (ไม่มีบล็อก Sparky เลย) ใช้สอนพื้นฐาน Scratch หรือใช้เป็นตัวตั้งต้นให้เด็กเติมเซนเซอร์เอง

## _authoring — สำหรับคนสร้างตัวอย่าง

- `Sparky_System_Prompt.md` — system prompt สำหรับให้ LLM ช่วยออกแบบ `.sb3` ของ Sparky
- `project.json` — โครงโปรเจกต์เปล่าไว้เป็นจุดตั้งต้น

## หมายเหตุสำหรับผู้พัฒนา

ไฟล์ใน `2-ai-camera/` **สร้างจากสคริปต์** ไม่ใช่แก้ด้วยมือ:

| โฟลเดอร์ | ตัวสร้าง |
|---|---|
| `face-play/` | `design-artifacts/face-play-examples/build_examples.py` |
| `face-id/` | `design-artifacts/face-id-examples/build_face_id_examples.py` |

ทั้งสองชุดมี `validate_sb3.py` (ตรวจโครงสร้าง) และ `simulate.py` (ตรวจพฤติกรรม) อยู่ข้าง ๆ ตัวสร้าง
แก้ตัวอย่าง = แก้สคริปต์แล้วรันใหม่ ไม่งั้นงานที่แก้ด้วยมือจะถูกทับ

ไฟล์ในโฟลเดอร์ `1-sensors/` และ `3-scratch-only/` มาจากลูกค้า สร้างใหม่จากสคริปต์ไม่ได้
