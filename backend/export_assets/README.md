# THE UNKNOWN — لعبة التحقيق الجماعية

> القضية 01: «الأرشيف الفضي» · The Silver Archive

لعبة تحقيق جماعية احترافية (عربي / English) تعتمد على لوحة جريمة تفاعلية، فريقين ونقاط، محقق مساعد بالذكاء الاصطناعي «الظل»، واتهام نهائي.

---

## المحتويات

```
the-unknown/
├── backend/                 FastAPI + MongoDB
│   ├── server.py            تشغيل التطبيق والفهارس
│   ├── core.py              قاعدة البيانات + التحقق من الهوية
│   ├── auth_routes.py       تسجيل الدخول (بريد/كلمة مرور + Google)
│   ├── game_routes.py       منطق اللعبة، النقاط، الغرف، «الظل»
│   ├── cases/silver_archive.json   نص القضية كاملاً (عربي + إنجليزي) والحل
│   ├── requirements.txt
│   └── .env.example
└── frontend/                React 19 + Tailwind + Framer Motion
    ├── src/pages            الصفحات (الرئيسية، الدخول، القضايا، التجهيز، اللعبة)
    ├── src/components/game  لوحة الجريمة، الأسئلة، الظل، الاتهام، الشرح التفاعلي
    ├── src/lib/i18n.js      كل نصوص الواجهة بالعربية والإنجليزية
    ├── package.json
    └── .env.example
```

## المتطلبات

- Python 3.11+
- Node.js 18+ و Yarn
- MongoDB 6+ (محلي أو MongoDB Atlas)

## التشغيل خطوة بخطوة

### 1) الخادم (Backend)

```bash
cd backend
python -m venv venv && source venv/bin/activate      # على ويندوز: venv\Scripts\activate
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
cp .env.example .env        # ثم عدّل القيم
uvicorn server:app --host 0.0.0.0 --port 8001
```

### 2) الواجهة (Frontend)

```bash
cd frontend
yarn install
cp .env.example .env        # REACT_APP_BACKEND_URL=http://localhost:8001
yarn start                  # للتطوير
yarn build                  # نسخة الإنتاج داخل build/
```

> مهم: كل مسارات الخادم تبدأ بـ `/api`. في الإنتاج اجعل الواجهة والخادم على النطاق نفسه (مثلاً `example.com` للواجهة و`example.com/api` للخادم عبر Nginx) لأن ملفات تعريف الارتباط (Cookies) مضبوطة على `SameSite=Lax` و `Secure` (تحتاج HTTPS).

## متغيرات البيئة (backend/.env)

| المتغير | الوصف |
|---|---|
| `MONGO_URL` | رابط MongoDB |
| `DB_NAME` | اسم قاعدة البيانات |
| `CORS_ORIGINS` | نطاق الواجهة، مثل `https://example.com` |
| `JWT_SECRET` | نص عشوائي طويل (64 حرفاً) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | حساب تجريبي يُنشأ تلقائياً أول تشغيل |
| `EMERGENT_LLM_KEY` | مفتاح الذكاء الاصطناعي لـ«الظل» |
| `LLM_MODEL` | `gpt-6-luna` |

## ملاحظات مهمة

- **«الظل» (المحقق المساعد):** يعمل عبر مكتبة `emergentintegrations` ومفتاح Emergent الموحّد. خارج منصة Emergent تحتاج المفتاح نفسه (برصيد) أو يمكن استبدال الاستدعاء في `game_routes.py` بمزوّد آخر.
- **تسجيل الدخول عبر Google:** يستخدم خدمة Emergent المُدارة (`auth.emergentagent.com`). تسجيل الدخول بالبريد وكلمة المرور يعمل في أي استضافة دون أي إعداد إضافي.
- **إضافة قضايا جديدة:** انسخ `backend/cases/silver_archive.json` وعدّل المحتوى (الأدلة، الأسئلة، الإجابات، الحل) بنفس البنية، وستظهر القضية تلقائياً في «ملفات القضايا». الصور تُضاف في `frontend/src/lib/assets.js`.
- الإجابات والحل لا تُرسل أبداً إلى المتصفح قبل انتهاء اللعبة.

## قواعد اللعب

| الحدث | النقاط |
|---|---|
| إجابة صحيحة | +100 |
| إجابة خاطئة | −25 (محاولتان لكل فريق في كل سؤال) |
| سؤال «الظل» | −20 للفريق السائل |
| اتهام صحيح | +300 وتُغلق القضية |
| اتهام خاطئ | −150 (محاولة واحدة لكل فريق) |

- ينتقل الدور بعد كل محاولة إجابة أو اتهام.
- يُفتح الاتهام النهائي بعد إغلاق 4 أسئلة.
- بعض الأسئلة تكشف أدلة مختومة على اللوحة.
- اللعب على جهاز واحد (تبادل الأدوار) أو جهازين برمز غرفة من 6 خانات.

---

# English quick start

1. **Backend:** `cd backend && pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ && cp .env.example .env && uvicorn server:app --port 8001`
2. **Frontend:** `cd frontend && yarn install && cp .env.example .env && yarn start` (or `yarn build` for production)
3. Serve frontend and `/api` from the same HTTPS domain (cookies are `Secure; SameSite=Lax`).
4. The AI assistant uses `emergentintegrations` + `EMERGENT_LLM_KEY` (model `gpt-6-luna`). Google login uses Emergent-managed auth; email/password login works anywhere.
5. New cases: drop a JSON file following `backend/cases/silver_archive.json` into `backend/cases/`.

© THE UNKNOWN
