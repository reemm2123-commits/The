# نشر THE UNKNOWN (Render + Vercel + MongoDB Atlas) — كله مجاني

الفكرة: المتصفح يكلّم Vercel فقط، وVercel يحوّل أي طلب `/api/...` للخادم على Render (ملف `frontend/vercel.json`).
بهذا الكوكيز تشتغل (نفس الدومين) وما تحتاج تعديل في الكود.

## 0) جهّز المشروع
1. (اختياري لكن مهم) شغّل `python scripts/download_images.py` عشان الصور تنحفظ عندك.
2. أنشئ مستودع على GitHub وارفع محتوى مجلد `the-unknown` كامل (الـ backend والـ frontend و render.yaml).

## 1) قاعدة البيانات — MongoDB Atlas
1. سجّل في mongodb.com/atlas وأنشئ Cluster مجاني (M0).
2. Database Access: أنشئ مستخدم باسم وكلمة مرور.
3. Network Access: Add IP Address ← `0.0.0.0/0` (لأن Render ما له IP ثابت).
4. Connect ← Drivers ← انسخ الرابط `mongodb+srv://...` وبدّل كلمة المرور فيه.

## 2) مفتاح «الظل» — Google Gemini (مجاني)
افتح aistudio.google.com/apikey ← Create API key ← انسخه.

## 3) الخادم — Render
1. render.com ← New ← **Blueprint** ← اختر المستودع (يقرأ `render.yaml` تلقائياً).
   أو New ← Web Service يدوياً: Root Directory = `backend`، Build = `pip install -r requirements.txt`،
   Start = `uvicorn server:app --host 0.0.0.0 --port $PORT`.
2. عبّي المتغيرات:
   - `MONGO_URL` = رابط Atlas
   - `ADMIN_EMAIL` و `ADMIN_PASSWORD` = حسابك
   - `GEMINI_API_KEY` = مفتاح قوقل
   - `CORS_ORIGINS` و `FRONTEND_URL` = رابط Vercel (تضيفه بعد الخطوة 4، ثم Save)
   - `RESEND_API_KEY` اختياري (استرجاع كلمة المرور)
3. بعد النشر افتح `https://اسم-خادمك.onrender.com/api/` لازم يرجع `{"message":"THE UNKNOWN"}`.

## 4) الواجهة — Vercel
1. افتح `frontend/vercel.json` وبدّل `YOUR-BACKEND.onrender.com` برابط Render الحقيقي (بدون https:// ... الموجود أصلاً)، وارفع التعديل على GitHub.
2. vercel.com ← Add New Project ← نفس المستودع ← **Root Directory = frontend**.
3. لا تضف أي متغيرات. اضغط Deploy.
4. خذ رابط Vercel، ارجع لـ Render وحطه في `CORS_ORIGINS` و `FRONTEND_URL`.

## 5) جرّب
افتح رابط Vercel ← سجّل حساب ← أنشئ غرفة ← افتحها من جوال ثاني بالرمز.

## ملاحظات مهمة
- Render المجاني ينام بعد 15 دقيقة، أول طلب بعده ياخذ 30–60 ثانية. حل مجاني: UptimeRobot يزور `/api/` كل 5 دقايق.
- تسجيل الدخول بقوقل انشال (كان يعتمد على خدمة Emergent). الدخول بالإيميل وكلمة المرور شغال.
- إيميل استرجاع كلمة المرور بدون دومين خاص يوصل لإيميل حساب Resend فقط.
- «الظل» عليه حد يومي من قوقل في الخطة المجانية. إذا وقف يظهر خطأ ولا يُخصم منك نقاط.
