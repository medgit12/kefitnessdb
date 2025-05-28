const express = require('express');
const router = express.Router();
const Member = require('../models/Member');


// ✅ 1. جلب جميع الأعضاء
router.get('/', async (req, res) => {
    try {
        const members = await Member.find();
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: 'فشل في تحميل الأعضاء' });
    }
});


// ✅ 2. جلب عضو محدد حسب الـ ID
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'العضو غير موجود' });
        res.json(member);
    } catch (err) {
        res.status(500).json({ error: 'فشل في تحميل بيانات العضو' });
    }
});


// ✅ 3. إضافة عضو جديد
router.post('/', async (req, res) => {
    try {
        const newMember = new Member(req.body);
        await newMember.save();
        res.status(201).json(newMember);
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء حفظ العضو.' });
    }
});


// ✅ 4. تعديل عضو حسب الـ ID
router.put('/:id', async (req, res) => {
    try {
        const updated = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'العضو غير موجود' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء التحديث' });
    }
});


// ✅ 5. حذف عضو حسب الـ ID
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Member.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'العضو غير موجود' });
        res.json({ message: 'تم الحذف بنجاح' });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء الحذف' });
    }
});


// 🔍 البحث عن أعضاء حسب الاسم أو رقم الهاتف أو البطاقة
router.get('/search/:query', async (req, res) => {
    const searchText = req.params.query;
    const regex = new RegExp(searchText, 'i'); // بحث غير حساس لحالة الأحرف

    try {
        const results = await Member.find({
            $or: [
                { fullName: regex },
                { phone: regex },
                { nationalId: regex }
            ],
            isArchived: false
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء البحث' });
    }
});
router.put('/:id/renew', async (req, res) => {
    const { joinDate, subscription } = req.body;

    try {
        const member = await Member.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'العضو غير موجود' });

        member.renewalHistory.push({
            date: new Date().toISOString().split('T')[0],
            subscription: member.subscription
        });

        member.subscription = subscription;
        member.joinDate = joinDate;
        member.isInactive = false;

        await member.save();
        res.json(member);
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء التجديد' });
    }
});


router.put('/:id/inactive', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'العضو غير موجود' });

        member.isInactive = true;
        await member.save();

        res.json({ message: 'تم تحويل العضو إلى منقطع' });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء الإجراء' });
    }
});



module.exports = router;
