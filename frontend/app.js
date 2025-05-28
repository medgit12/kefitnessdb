
// الت
// هيئة + الإحصائيات + الأعضاء الجدد


let editingMemberId = null;
let inactiveMemberId = null;
let members = JSON.parse(localStorage.getItem('gymMembers')) || [];
let expenses = JSON.parse(localStorage.getItem('gymExpenses')) || [];
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

let subscriptions = [
    { id: 1, name: 'شهر واحد', price: 200, duration: 1 },
    { id: 2, name: 'شهرين', price: 350, duration: 2 },
    { id: 3, name: '3 أشهر', price: 500, duration: 3 },
    { id: 4, name: '6 أشهر', price: 800, duration: 6 },
    { id: 5, name: 'سنة', price: 1200, duration: 12 }
];

document.addEventListener('DOMContentLoaded', function () {
    updateNotificationIcon();
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentDate').textContent = dateString;

    updateStats();
    setupTabs();
    loadMembersPage();
    loadFinancePage();
    loadNotificationsPage();
    loadSearchPage();
    setupModals();
    
    // تعيين تاريخ اليوم تلقائيًا في نموذج العضو
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('joinDate').value = today;
});

function saveData() {
    localStorage.setItem('gymMembers', JSON.stringify(members));
    localStorage.setItem('gymExpenses', JSON.stringify(expenses));
    updateNotificationIcon();
    updateStats();
}

function addMember(fullName, phone, nationalId, joinDate, subscriptionType, gender, photoData) {
    // 1. تجهيز بيانات الاشتراك
    const subscription = subscriptions.find(sub => sub.id === parseInt(subscriptionType));

    // 2. إعداد الكائن للإرسال إلى السيرفر
    const memberData = {
        fullName,
        phone,
        nationalId,
        joinDate,
        gender: gender || 'male',
        photo: photoData || '',
        subscription,
        isArchived: false,
        isInactive: false,
        renewalHistory: [{
            date: joinDate,
            subscription: subscription,
            type: 'new'
        }]
    };

    // 3. إرسال البيانات عبر fetch إلى الباكند
    fetch('http://localhost:5000/api/members', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(memberData)
    })
    .then(response => {
        if (!response.ok) throw new Error('فشل في حفظ العضو');
        return response.json();
    })
    .then(savedMember => {
        console.log('✔️ تم إضافة العضو:', savedMember);
       loadMembersPage();             // تحديث جدول الأعضاء
    updateStats();                 // ✅ تحديث الإحصائيات العامة
    updateSubscriptionChart();     // ✅ تحديث الرسم البياني وبطاقات الاشتراكات
    closeMemberModal();            // إغلاق المودال
    editingMemberId = null;
    document.getElementById('memberForm').reset();
    })
    .catch(error => {
        console.error('❌ حدث خطأ أثناء الإضافة:', error);
    });
}

function deleteMember(id) {
    fetch(`http://localhost:5000/api/members/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('فشل في حذف العضو');
        return response.json();
    })
    .then(result => {
        console.log('🗑️ تم حذف العضو:', result.message);
        loadMembersPage(); // إعادة تحميل الجدول بعد الحذف
    })
    .catch(error => {
        console.error('❌ خطأ أثناء الحذف:', error);
    });

  closeMemberModal()
}


function markMemberInactive(memberId) {
    fetch(`http://localhost:5000/api/members/${memberId}/inactive`, {
        method: 'PUT'
    })
    .then(res => {
        if (!res.ok) throw new Error('فشل في تحويل العضو إلى منقطع');
        return res.json();
    })
    .then(result => {
        console.log('✅ تم تحويل العضو إلى منقطع');
        loadNotificationsPage();
        loadMembersPage();
        updateStats();
        updateSubscriptionChart();
        updateNotificationIcon();
    })
    .catch(err => {
        console.error('❌ خطأ أثناء التحويل إلى منقطع:', err);
    });
}


function updateStats() {
    fetch('http://localhost:5000/api/members')
        .then(res => res.json())
        .then(data => {
            members = data; // تحديث البيانات من الباكند

            const today = new Date();
            const totalMembersEl = document.getElementById('totalMembers');
            const inactiveEl = document.getElementById('inactiveMembers');
            const archivedEl = document.getElementById('archivedCount');
            const expiredEl = document.getElementById('expiredMembers');
            const activeEl = document.getElementById('activeMembers');

            const activeMembers = members.filter(m => !m.isArchived);

            if (totalMembersEl) totalMembersEl.textContent = activeMembers.length;
            if (inactiveEl) inactiveEl.textContent = activeMembers.filter(m => m.isInactive).length;
            if (archivedEl) archivedEl.textContent = members.filter(m => m.isArchived).length;

            const lateMembers = activeMembers.filter(m => {
                if (m.isInactive || !m.subscription) return false;
                const endDate = new Date(m.joinDate);
                endDate.setMonth(endDate.getMonth() + m.subscription.duration);
                return endDate < today;
            });

            if (expiredEl) expiredEl.textContent = lateMembers.length;

            const activeCount = activeMembers.filter(m => {
                if (m.isInactive || !m.subscription) return false;
                const endDate = new Date(m.joinDate);
                endDate.setMonth(endDate.getMonth() + m.subscription.duration);
                return endDate >= today;
            }).length;

            if (activeEl) activeEl.textContent = activeCount;
        })
        .catch(err => {
            console.error('❌ فشل في تحميل الإحصائيات:', err);
        });
}







// function updateSubscriptionDistribution() {
//     const subscriptionCounts = {
//         monthly: 0,
//         threeMonths: 0,
//         sixMonths: 0,
//         yearly: 0
//     };

//     members.filter(m => !m.isArchived && !m.isInactive).forEach(member => {
//         if (member.subscription.duration === 1) subscriptionCounts.monthly++;
//         else if (member.subscription.duration === 3) subscriptionCounts.threeMonths++;
//         else if (member.subscription.duration === 6) subscriptionCounts.sixMonths++;
//         else if (member.subscription.duration === 12) subscriptionCounts.yearly++;
//     });

//     const total = members.filter(m => !m.isArchived && !m.isInactive).length;
    
//     // تحديث النصوص
//     document.getElementById('monthlySubCount').textContent = subscriptionCounts.monthly;
//     document.getElementById('threeMonthSubCount').textContent = subscriptionCounts.threeMonths;
//     document.getElementById('sixMonthSubCount').textContent = subscriptionCounts.sixMonths;
//     document.getElementById('yearlySubCount').textContent = subscriptionCounts.yearly;
    
//     document.getElementById('monthlySubPercent').textContent = total > 0 ? `${Math.round((subscriptionCounts.monthly / total) * 100)}%` : '0%';
//     document.getElementById('threeMonthSubPercent').textContent = total > 0 ? `${Math.round((subscriptionCounts.threeMonths / total) * 100)}%` : '0%';
//     document.getElementById('sixMonthSubPercent').textContent = total > 0 ? `${Math.round((subscriptionCounts.sixMonths / total) * 100)}%` : '0%';
//     document.getElementById('yearlySubPercent').textContent = total > 0 ? `${Math.round((subscriptionCounts.yearly / total) * 100)}%` : '0%';

//     // تحديث المخطط الدائري
//     const ctx = document.getElementById('subscriptionDistributionChart').getContext('2d');
    
//     if (window.subscriptionDistributionChart instanceof Chart) {
//         window.subscriptionDistributionChart.destroy();
//     }

//     window.subscriptionDistributionChart = new Chart(ctx, {
//         type: 'doughnut',
//         data: {
//             labels: ['شهري', '3 أشهر', '6 أشهر', 'سنوي'],
//             datasets: [{
//                 data: [
//                     subscriptionCounts.monthly,
//                     subscriptionCounts.threeMonths,
//                     subscriptionCounts.sixMonths,
//                     subscriptionCounts.yearly
//                 ],
//                 backgroundColor: ['#4361ee', '#3f37c9', '#4cc9f0', '#f72585'],
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 legend: {
//                     position: 'bottom',
//                     rtl: true
//                 }
//             }
//         }
//     });
// }

// تحميل صفحة الأعضاء + البحث + تحديث الأعضاء
function loadMembersPage() {
    const membersTable = document.getElementById('membersTable').querySelector('tbody');

    fetch('http://localhost:5000/api/members')
        .then(response => {
            if (!response.ok) throw new Error('فشل في تحميل الأعضاء');
            return response.json();
        })
        .then(data => {
            membersTable.innerHTML = '';

            data.filter(m => !m.isArchived && !m.isInactive).forEach(member => {
                if (!member.subscription) return; // تجاهل بدون اشتراك

                const endDate = new Date(member.joinDate);
                endDate.setMonth(endDate.getMonth() + member.subscription.duration);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${member.fullName}</td>
                    <td>${member.phone}</td>
                    <td>${member.joinDate}</td>
                    <td>${member.subscription.name}</td>
                    <td>${endDate.toISOString().split('T')[0]}</td>
                    <td>
                        <button class="btn primary sm edit-btn" data-id="${member._id}"><i class="fas fa-edit"></i></button>
                        <button class="btn danger sm delete-btn" data-id="${member._id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                membersTable.appendChild(row);
            });

            setupEditAndDeleteButtons();
        })
        .catch(error => {
            console.error('❌ خطأ أثناء تحميل الأعضاء:', error);
        });
}

function updateSubscriptionChart() {
    fetch('http://localhost:5000/api/members')
        .then(res => res.json())
        .then(members => {
            const counts = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0
            };

            members.forEach(member => {
                const subId = member.subscription?.id;
                if (subId && counts.hasOwnProperty(subId)) {
                    counts[subId]++;
                }
            });

            renderSubscriptionChart(counts);
        })
        .catch(err => {
            console.error('❌ فشل في تحميل توزيع الاشتراكات:', err);
        });
}

let subscriptionChart = null;

function renderSubscriptionChart(counts) {
    const ctx = document.getElementById('subscriptionChart').getContext('2d');

    const data = {
        labels: ['شهر واحد', 'شهرين', '3 أشهر', '6 أشهر', 'سنة'],
        datasets: [{
            label: 'توزيع الاشتراكات',
            data: [
                counts[1],
                counts[2],
                counts[3],
                counts[4],
                counts[5]
            ],
            backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0',
                '#9966FF'
            ]
        }]
    };

    if (subscriptionChart) {
        subscriptionChart.destroy();
    }

    subscriptionChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'توزيع أنواع الاشتراكات'
                }
            }
        }
    });


    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);

const mapping = {
    1: { countId: 'monthlySubCount', percentId: 'monthlySubPercent' },
    2: { countId: 'twoMonthSubCount', percentId: 'twoMonthSubPercent' },
    3: { countId: 'threeMonthSubCount', percentId: 'threeMonthSubPercent' },
    4: { countId: 'sixMonthSubCount', percentId: 'sixMonthSubPercent' },
    5: { countId: 'yearlySubCount', percentId: 'yearlySubPercent' }
};

for (let subId in mapping) {
    const count = counts[subId] || 0;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    document.getElementById(mapping[subId].countId).textContent = count;
    document.getElementById(mapping[subId].percentId).textContent = `${percent}%`;
}
}



function setupEditAndDeleteButtons() {
    // زر التعديل
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditClick); // تنظيف قديم
        btn.addEventListener('click', handleEditClick);
    });

    // زر الحذف
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteClick); // تنظيف قديم
        btn.addEventListener('click', handleDeleteClick);
    });
}

// ✅ تعريف الحدث الخاص بالتعديل
function handleEditClick(e) {
    const memberId = this.getAttribute('data-id');
    editMember(memberId);
}

// ✅ تعريف الحدث الخاص بالحذف
function handleDeleteClick(e) {
    const memberId = this.getAttribute('data-id');
    if (confirm('هل تريد حذف هذا العضو؟')) {
        deleteMember(memberId);
    }
}



function updateMember(id, fullName, phone, nationalId, joinDate, subscriptionType, gender, photoData) {
    const subscription = subscriptions.find(sub => sub.id === parseInt(subscriptionType));

    const updatedData = {
        fullName,
        phone,
        nationalId,
        joinDate,
        gender: gender || 'male',
        photo: photoData || '',
        subscription
    };

    fetch(`http://localhost:5000/api/members/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
    .then(res => {
        if (!res.ok) throw new Error('فشل في تعديل العضو');
        return res.json();
    })
   .then(data => {
    console.log('✏️ تم تحديث العضو:', data);
    editingMemberId = null;
    loadMembersPage();    
    // إغلاق النموذج:
  closeMemberModal()
})

    .catch(err => console.error('❌ خطأ أثناء التحديث:', err));

    
}


function renewMember(memberId, subscriptionType) {
    const subscriptionsMap = {
        1: { id: 1, name: 'شهر واحد', price: 200, duration: 1 },
        2: { id: 2, name: 'شهرين', price: 350, duration: 2 },
        3: { id: 3, name: '3 أشهر', price: 500, duration: 3 },
        4: { id: 4, name: '6 أشهر', price: 800, duration: 6 },
        5: { id: 5, name: 'سنة', price: 1200, duration: 12 }
    };

    const subscription = subscriptionsMap[parseInt(subscriptionType)];
    const today = new Date().toISOString().split('T')[0];

    const updatedData = {
        joinDate: today,
        subscription: subscription
    };

    fetch(`http://localhost:5000/api/members/${memberId}/renew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
        .then(res => {
            if (!res.ok) throw new Error('فشل في التجديد');
            return res.json();
        })
        .then(data => {
            console.log('✅ تم تجديد الاشتراك:', data);
            closeRenewModal();

            // 🔄 إعادة تحميل كل شيء بعد التجديد
            fetch('http://localhost:5000/api/members')
                .then(res => res.json())
                .then(freshData => {
                    members = freshData;
                    loadMembersPage();
                    loadNotificationsPage();
                    updateStats();
                    updateSubscriptionChart();
                    updateNotificationIcon();
                });
        })
        .catch(err => {
            console.error('❌ خطأ أثناء التجديد:', err);
        });
}



function searchMembers(query) {
    const normalizedQuery = query.toLowerCase().trim();
    return members.filter(member => {
        if (member.isArchived) return false;
        const normalizedName = member.fullName.toLowerCase();
        const normalizedId = member.nationalId.toLowerCase();
        return normalizedName.includes(normalizedQuery) || normalizedId.includes(normalizedQuery);
    });
}

function loadSearchPage() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults').querySelector('tbody');
    const memberDetailsSection = document.getElementById('memberDetailsSection');
    const paymentHistoryTable = document.getElementById('paymentHistoryTable').querySelector('tbody');

    function renderSearchResults(query) {
        const results = searchMembers(query);
        searchResults.innerHTML = '';
        memberDetailsSection.style.display = 'none';

        if (results.length === 0) {
            searchResults.innerHTML = '<tr><td colspan="7" class="no-results">لا توجد نتائج مطابقة</td></tr>';
            return;
        }

        results.forEach(member => {
            const row = document.createElement('tr');
            row.className = 'search-result-row';
            row.setAttribute('data-id', member._id);
            row.innerHTML = `
                <td class="photo-column">
                    ${member.photo ?
                        `<img src="${member.photo}" class="member-photo" alt="${member.fullName}" data-id="${member._id}">` :
                        `<div class="member-photo-placeholder"><i class="fas fa-user"></i></div>`
                    }
                </td>
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${member.nationalId}</td>
                <td>${member.joinDate}</td>
                <td>${member.subscription?.name || 'غير متوفر'}</td>
                <td>${member.subscription?.price || 0} درهم</td>
            `;
            searchResults.appendChild(row);
        });

        document.querySelectorAll('.search-result-row').forEach(row => {
            row.addEventListener('click', function () {
                const memberId = this.getAttribute('data-id');
                const member = members.find(m => m._id === memberId);

                if (member) {
                    document.getElementById('memberDetailName').textContent = member.fullName;
                    document.getElementById('memberDetailPhone').textContent = member.phone;
                    document.getElementById('memberDetailNationalId').textContent = member.nationalId;
                    document.getElementById('memberDetailJoinDate').textContent = member.joinDate;

                    if (member.photo) {
                        document.getElementById('memberDetailPhoto').src = member.photo;
                    } else {
                        document.getElementById('memberDetailPhoto').src = '';
                        document.getElementById('memberDetailPhoto').alt = 'لا توجد صورة';
                    }

                    paymentHistoryTable.innerHTML = '';
                    if (member.renewalHistory) {
                        member.renewalHistory.forEach(record => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${record.date}</td>
                                <td>${record.subscription.name}</td>
                                <td>${record.subscription.price} درهم</td>
                                <td><span class="status-badge status-active">مدفوع</span></td>
                            `;
                            paymentHistoryTable.appendChild(row);
                        });
                    }

                    memberDetailsSection.style.display = 'block';
                    memberDetailsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        setupImageClickHandlers();
    }

    searchInput.addEventListener('input', function () {
        renderSearchResults(this.value);
    });

    renderSearchResults('');
}



// التقارير المالية + الرسوم البيانية
function loadFinancePage() {
    const yearFilter = document.getElementById('yearFilter');
    
    // تعبئة فلتر السنوات
    populateYearFilter();
    
    // تحديث التقرير المالي
    updateFinancialReport();
    
    // أحداث التصدير
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPdf);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    
    yearFilter.addEventListener('change', updateFinancialReport);
}

function populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    yearFilter.innerHTML = '<option value="">اختر سنة</option>';
    
    // الحصول على جميع السنوات الموجودة في بيانات الأعضاء
    const years = [...new Set(members.map(m => new Date(m.joinDate).getFullYear()))];
    
    // إضافة السنوات إلى الفلتر
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    // تعيين السنة الحالية كاختيار افتراضي
    const currentYear = new Date().getFullYear();
    yearFilter.value = currentYear;
}

function updateFinancialReport() {
    const selectedYear = parseInt(document.getElementById('yearFilter').value) || new Date().getFullYear();

    if (!Array.isArray(members) || members.length === 0) {
        fetch('http://localhost:5000/api/members')
            .then(res => res.json())
            .then(data => {
                members = data;
                updateFinancialReport();
            });
        return;
    }

    const monthlyIncome = new Array(12).fill(0);
    const monthlyMembers = new Array(12).fill(0);

    members.filter(m => !m.isArchived && m.subscription).forEach(member => {
        const date = new Date(member.joinDate);
        if (date.getFullYear() === selectedYear) {
            const month = date.getMonth();
            monthlyIncome[month] += member.subscription.price || 0;
            monthlyMembers[month]++;
        }
    });

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];

    const monthlyIncomeList = document.getElementById('monthlyIncomeList');
    monthlyIncomeList.innerHTML = '';

    monthlyIncome.forEach((income, index) => {
        const item = document.createElement('div');
        item.className = 'monthly-item';
        item.innerHTML = `
            <span class="month-name">${monthNames[index]}</span>
            <span class="month-value">${income} درهم</span>
        `;
        monthlyIncomeList.appendChild(item);
    });

    const monthlyMembersList = document.getElementById('monthlyMembersList');
    monthlyMembersList.innerHTML = '';

    monthlyMembers.forEach((count, index) => {
        const item = document.createElement('div');
        item.className = 'monthly-item';
        item.innerHTML = `
            <span class="month-name">${monthNames[index]}</span>
            <span class="month-value">${count}</span>
        `;
        monthlyMembersList.appendChild(item);
    });

    updateYearlyTrendChart(monthlyIncome);
}


function populateYearFilter() {
    // تحميل الأعضاء أولًا إذا لم يكونوا محملين
    if (!Array.isArray(members) || members.length === 0) {
        fetch('http://localhost:5000/api/members')
            .then(res => res.json())
            .then(data => {
                members = data;
                populateYearFilter(); // إعادة التشغيل بعد تحميل البيانات
            });
        return;
    }

    const years = new Set();

    members.forEach(member => {
        const year = new Date(member.joinDate).getFullYear();
        years.add(year);
    });

    // تحويل Set إلى Array وترتيب السنوات تنازليًا
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    const yearSelect = document.getElementById('yearFilter');
    yearSelect.innerHTML = '<option value="">اختر سنة</option>';

    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}


// function calculateYearlyGrowth(year) {
//     const prevYear = year - 1;
    
//     const currentYearIncome = members.filter(m => !m.isArchived).reduce((sum, member) => {
//         const date = new Date(member.joinDate);
//         if (date.getFullYear() === year) {
//             return sum + member.subscription.price;
//         }
//         return sum;
//     }, 0);
    
//     const prevYearIncome = members.filter(m => !m.isArchived).reduce((sum, member) => {
//         const date = new Date(member.joinDate);
//         if (date.getFullYear() === prevYear) {
//             return sum + member.subscription.price;
//         }
//         return sum;
//     }, 0);
    
//     if (prevYearIncome === 0) return currentYearIncome === 0 ? '0' : '100';
    
//     return ((currentYearIncome - prevYearIncome) / prevYearIncome * 100).toFixed(2);
// }

// function updateNetIncomeReport(year) {
//     const currentMonth = new Date().getMonth();
//     const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
    
//     // حساب إيرادات الشهر الحالي
//     const monthlyIncome = members.filter(m => !m.isArchived).reduce((sum, member) => {
//         const date = new Date(member.joinDate);
//         if (date.getFullYear() === year && date.getMonth() === currentMonth) {
//             return sum + member.subscription.price;
//         }
//         return sum;
//     }, 0);
    
//     // حساب مصروفات الشهر الحالي
//     const monthlyExpenses = expenses.reduce((sum, expense) => {
//         if (expense.year === year && expense.month === currentMonth + 1) {
//             return sum + expense.amount;
//         }
//         return sum;
//     }, 0);
    
//     // حساب صافي الربح الشهري
//     const monthlyNetIncome = monthlyIncome - monthlyExpenses;
    
//     // حساب نسبة التغيير عن الشهر الماضي
//     const prevMonthIncome = members.filter(m => !m.isArchived).reduce((sum, member) => {
//         const date = new Date(member.joinDate);
//         if (date.getFullYear() === year && date.getMonth() === currentMonth - 1) {
//             return sum + member.subscription.price;
//         }
//         return sum;
//     }, 0);
    
//     const prevMonthExpenses = expenses.reduce((sum, expense) => {
//         if (expense.year === year && expense.month === currentMonth) {
//             return sum + expense.amount;
//         }
//         return sum;
//     }, 0);
    
//     const prevMonthNetIncome = prevMonthIncome - prevMonthExpenses;
//     const monthlyChange = prevMonthNetIncome !== 0 ? 
//         ((monthlyNetIncome - prevMonthNetIncome) / prevMonthNetIncome * 100).toFixed(2) : 0;
    
//     // تحديث بطاقة الدخل الشهري
//     document.getElementById('monthlyIncome').textContent = `${monthlyIncome} درهم`;
//     document.getElementById('monthlyExpenses').textContent = `${monthlyExpenses} درهم`;
//     document.getElementById('monthlyNetIncome').textContent = `${monthlyNetIncome} درهم`;
    
//     const monthlyChangeElement = document.getElementById('monthlyChange');
//     monthlyChangeElement.textContent = `${monthlyChange}%`;
//     monthlyChangeElement.className = monthlyChange >= 0 ? 'income-item change positive' : 'income-item change negative';
    
//     // حساب الإيرادات السنوية
//     const yearlyIncome = members.filter(m => !m.isArchived).reduce((sum, member) => {
//         const date = new Date(member.joinDate);
//         if (date.getFullYear() === year) {
//             return sum + member.subscription.price;
//         }
//         return sum;
//     }, 0);
    
//     // حساب المصروفات السنوية
//     const yearlyExpenses = expenses.reduce((sum, expense) => {
//         if (expense.year === year) {
//             return sum + expense.amount;
//         }
//         return sum;
//     }, 0);
    
//     // حساب صافي الربح السنوي
//     const yearlyNetIncome = yearlyIncome - yearlyExpenses;
    
//     // حساب نسبة النمو السنوي
//     const yearlyGrowth = calculateYearlyGrowth(year);
    
//     // تحديث بطاقة الدخل السنوي
//     document.getElementById('yearlyIncome').textContent = `${yearlyIncome} درهم`;
//     document.getElementById('yearlyExpenses').textContent = `${yearlyExpenses} درهم`;
//     document.getElementById('yearlyNetIncome').textContent = `${yearlyNetIncome} درهم`;
    
//     const yearlyGrowthElement = document.getElementById('yearlyGrowth');
//     yearlyGrowthElement.textContent = `${yearlyGrowth}%`;
//     yearlyGrowthElement.className = parseFloat(yearlyGrowth) >= 0 ? 'income-item change positive' : 'income-item change negative';
    
//     // تحديث مؤشرات الأداء
//     document.getElementById('currentMonthProfit').textContent = 
//         `${monthlyNetIncome} درهم (${monthlyChange >= 0 ? '↑' : '↓'}${Math.abs(monthlyChange)}%)`;
    
//     const avgMonthlyProfit = (yearlyNetIncome / (currentMonth + 1)).toFixed(2);
//     document.getElementById('avgMonthlyProfit').textContent = `${avgMonthlyProfit} درهم`;
// }

function updateYearlyTrendChart(monthlyIncome) {
    const ctx = document.getElementById('yearlyTrendChart').getContext('2d');
    const selectedYear = parseInt(document.getElementById('yearFilter').value) || new Date().getFullYear();

    if (window.yearlyTrendChart instanceof Chart) {
        window.yearlyTrendChart.destroy();
    }

    window.yearlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
            datasets: [{
                label: 'إجمالي الإيرادات',
                data: monthlyIncome,
                borderColor: '#4895ef',
                backgroundColor: 'rgba(72, 149, 239, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `الاتجاه السنوي للإيرادات - ${selectedYear}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'المبلغ (درهم)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'الشهر'
                    }
                }
            }
        }
    });
}


function exportToPdf() {
    const element = document.querySelector('.tab-content.active');
    const opt = {
        margin: 0.5,
        filename: `تقرير_مالي_${new Date().getFullYear()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
}

function exportToExcel() {
    const year = parseInt(document.getElementById('yearFilter').value) || new Date().getFullYear();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
    
    // تحضير بيانات الإيرادات الشهرية
    const monthlyIncome = new Array(12).fill(0);
    members.filter(m => !m.isArchived).forEach(member => {
        const date = new Date(member.joinDate);
        if (date.getFullYear() === year) {
            monthlyIncome[date.getMonth()] += member.subscription.price;
        }
    });
    
    // تحضير بيانات المشتركين الجدد
    const monthlyMembers = new Array(12).fill(0);
    members.filter(m => !m.isArchived).forEach(member => {
        const date = new Date(member.joinDate);
        if (date.getFullYear() === year) {
            monthlyMembers[date.getMonth()]++;
        }
    });
    
    // تحضير بيانات المصروفات الشهرية
    const monthlyExpenses = new Array(12).fill(0);
    expenses.forEach(expense => {
        if (expense.year === year) {
            monthlyExpenses[expense.month - 1] += expense.amount;
        }
    });
    
    // إنشاء مصفوفة البيانات
    const data = [
        ['الشهر', 'الإيرادات', 'المشتركون الجدد', 'المصروفات', 'صافي الربح'],
        ...monthlyIncome.map((income, index) => [
            monthNames[index],
            income,
            monthlyMembers[index],
            monthlyExpenses[index],
            income - monthlyExpenses[index]
        ]),
        ['المجموع', 
            monthlyIncome.reduce((a, b) => a + b, 0),
            monthlyMembers.reduce((a, b) => a + b, 0),
            monthlyExpenses.reduce((a, b) => a + b, 0),
            monthlyIncome.reduce((a, b) => a + b, 0) - monthlyExpenses.reduce((a, b) => a + b, 0)
        ]
    ];
    
    // إنشاء مصنف Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `تقرير ${year}`);
    
    // تصدير الملف
    XLSX.writeFile(wb, `تقرير_مالي_${year}.xlsx`);
}

// الإشعارات + المودالات (النوافذ المنبثقة)
function loadNotificationsPage() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '';

    const today = new Date();

    const expiredMembers = members.filter(member => {
        if (member.isArchived || member.isInactive || !member.subscription) return false;

        const endDate = new Date(member.joinDate);
        endDate.setMonth(endDate.getMonth() + member.subscription.duration);

        return endDate < today;
    });

    if (expiredMembers.length === 0) {
        container.innerHTML = '<p style="text-align:center">لا توجد إشعارات حاليًا</p>';
        return;
    }

    expiredMembers.forEach(member => {
        const endDate = new Date(member.joinDate);
        endDate.setMonth(endDate.getMonth() + member.subscription.duration);
        const daysExpired = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));

        const card = document.createElement('div');
        card.className = 'notification-card';
        card.innerHTML = `
            <div class="notification-header">
                ${member.photo ?
                    `<img src="${member.photo}" class="notification-avatar">` :
                    `<div class="member-photo-placeholder"><i class="fas fa-user"></i></div>`
                }
                <div class="notification-user">
                    <h3>${member.fullName}</h3>
                    <p>${member.phone}</p>
                </div>
            </div>
            <div class="notification-body">
                <p class="notification-message">
                    انتهى اشتراك هذا العضو منذ ${daysExpired} يوم.
                </p>
            </div>
            <div class="notification-footer">
                <span class="days-expired">منتهي منذ ${daysExpired} يوم</span>
                <div class="notification-actions">
                    <button class="btn success sm renew-btn" data-id="${member._id}"><i class="fas fa-sync-alt"></i> تجديد</button>
                    <button class="btn danger sm inactive-btn" data-id="${member._id}"><i class="fas fa-user-slash"></i> إنقطاع</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    setupImageClickHandlers();

    document.querySelectorAll('.renew-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const memberId = this.getAttribute('data-id');
            openRenewModal(memberId);
        });
    });

    document.querySelectorAll('.inactive-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const memberId = this.getAttribute('data-id');
            openInactiveModal(memberId);
        });
    });
}





function updateNotificationIcon() {
    fetch('http://localhost:5000/api/members')
        .then(res => res.json())
        .then(data => {
            const today = new Date();
            const icon = document.getElementById('notificationIcon');

            const alertExists = data.some(member => {
                if (member.isArchived || member.isInactive || !member.subscription) return false;

                const endDate = new Date(member.joinDate);
                endDate.setMonth(endDate.getMonth() + member.subscription.duration);
                return endDate < today;
            });

            if (icon) {
                icon.classList.toggle('alarm', alertExists);
            }
        })
        .catch(err => console.error('❌ فشل في تحديث حالة الإشعارات:', err));
}







// عرض الصورة + المودالات + التبويبات
function setupImageClickHandlers() {
    document.querySelectorAll('.member-photo, .notification-avatar').forEach(img => {
        img.addEventListener('click', function (e) {
            e.stopPropagation();
            const modal = document.getElementById('imageModal');
            const expanded = document.getElementById('expandedImage');
            expanded.src = this.src || '';
            modal.style.display = 'flex';
        });
    });

    const closeBtns = document.querySelectorAll('.modal .close-btn, .close-image-btn');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // إغلاق النافذة عند النقر خارجها
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

function setupModals() {
    const memberModal = document.getElementById('memberModal');
    const renewModal = document.getElementById('renewModal');
    const inactiveModal = document.getElementById('inactiveModal');

    document.getElementById('addMemberBtn').addEventListener('click', function () {
        openMemberModal();
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            btn.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('memberForm').onsubmit = function (e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const nationalId = document.getElementById('nationalId').value;
    const joinDate = document.getElementById('joinDate').value;
    const subscription = document.getElementById('subscription').value;
    const gender = document.getElementById('gender').value;

    // الصورة (اختياري)
    const photoInput = document.getElementById('memberPhoto');
    let photoData = '';
    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (event) {
            photoData = event.target.result;

            // 🔁 هنا يتم التحقق: هل تعديل أم إضافة جديدة؟
            if (editingMemberId) {
                updateMember(editingMemberId, fullName, phone, nationalId, joinDate, subscription, gender, photoData);
            } else {
                addMember(fullName, phone, nationalId, joinDate, subscription, gender, photoData);
            }
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        // بدون صورة
        if (editingMemberId) {
            updateMember(editingMemberId, fullName, phone, nationalId, joinDate, subscription, gender, photoData);
        } else {
            addMember(fullName, phone, nationalId, joinDate, subscription, gender, photoData);
        }
    }
};


  document.getElementById('renewForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const memberId = this.getAttribute('data-id');
    const subscription = document.getElementById('renewSubscription').value;
    renewMember(memberId, subscription);
    closeRenewModal();              // ✅ إغلاق المودال بطريقة نظيفة
});


  document.getElementById('confirmInactiveBtn').addEventListener('click', () => {
    if (inactiveMemberId) {
        markMemberInactive(inactiveMemberId);
        closeInactiveModal();
    }
});
    // إدارة معاينة الصورة
    document.getElementById('memberPhoto').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImage.src = event.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.style.display = 'none';
        }
    });

    document.querySelector('.remove-photo-btn').addEventListener('click', function() {
        document.getElementById('memberPhoto').value = '';
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('previewImage').src = '';
    }); 
}

function openMemberModal(isEdit = false) {
    const modal = document.getElementById('memberModal');

    // إزالة أي قيود display قد تسبب المشاكل
    modal.style.display = '';
    modal.classList.add('show');

    if (!isEdit) {
        document.getElementById('memberForm').reset();
        editingMemberId = null;
    }
}



function editMember(id) {
    fetch(`http://localhost:5000/api/members/${id}`)
        .then(res => res.json())
        .then(member => {
            console.log('البيانات المستلمة للتعديل:', member);

            document.getElementById('fullName').value = member.fullName;
            document.getElementById('phone').value = member.phone;
            document.getElementById('nationalId').value = member.nationalId;
            document.getElementById('joinDate').value = member.joinDate;
            document.getElementById('gender').value = member.gender;
            document.getElementById('subscription').value = member.subscription.id;

            editingMemberId = member._id;

            // closeMemberModal(); // ← لإعادة ضبط المودال
            openMemberModal(true);  // ← فتح النموذج بشكل نظيف
        });
}



function openRenewModal(id) {
    const modal = document.getElementById('renewModal');
    const form = document.getElementById('renewForm');
    form.setAttribute('data-id', id);
    modal.style.display = 'flex';
}

function openInactiveModal(memberId) {
    inactiveMemberId = memberId;
    document.getElementById('inactiveModal').classList.add('show');
}

function closeInactiveModal() {
    document.getElementById('inactiveModal').classList.remove('show');
    inactiveMemberId = null;
}



function setupTabs() {
    const tabs = document.querySelectorAll('.nav-menu li');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const selectedTab = this.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            document.getElementById(selectedTab).classList.add('active');

            if (selectedTab === 'dashboard') {
                updateStats();
            }
            if (selectedTab === 'finance') {
                updateFinancialReport();
            }
            if (selectedTab === 'members') loadMembersPage();
            if (selectedTab === 'notifications') loadNotificationsPage();
            if (selectedTab === 'search') loadSearchPage();
        });
    });
}



// ✅ دالة إغلاق نافذة إضافة/تعديل العضو
function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    modal.classList.remove('show');
    modal.style.display = ''; // ← نعيدها للوضع الطبيعي حتى لا تعلق
}

function closeRenewModal() {
    const modal = document.getElementById('renewModal');
    modal.style.display = 'none';
    document.getElementById('renewForm').reset();
}



// ✅ ربط زر × بزر الإغلاق
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMemberModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeMemberModal);
    }
});

updateSubscriptionChart();
window.addEventListener('DOMContentLoaded', () => {
    updateFinancialReport();
});

document.getElementById('yearFilter').addEventListener('change', () => {
    updateFinancialReport();
});

window.addEventListener('DOMContentLoaded', () => {
    populateYearFilter();         // ← أولًا نملأ السنوات
    updateFinancialReport();     // ← بعدها نعرض التقرير
});

// فتح وإغلاق نافذة تسجيل الدخول
document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('show');
});

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

// فتح وإغلاق نافذة إنشاء حساب
document.getElementById('registerBtn').addEventListener('click', () => {
    document.getElementById('registerModal').classList.add('show');
});

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('show');
}

// window.addEventListener('DOMContentLoaded', () => {
//     // زر تسجيل الدخول
//     const loginBtn = document.getElementById('loginBtn');
//     if (loginBtn) {
//         loginBtn.addEventListener('click', () => {
//             document.getElementById('loginModal').classList.add('show');
//         });
//     }

//     // زر إنشاء الحساب
//     const registerBtn = document.getElementById('registerBtn');
//     if (registerBtn) {
//         registerBtn.addEventListener('click', () => {
//             document.getElementById('registerModal').classList.add('show');
//         });
//     }
// });

// window.addEventListener('DOMContentLoaded', () => {
//     updateNotificationIcon();
// });




// mongodb+srv://dbmed942:hBqiWd49ZkX36hqG@cluster0.pooissq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0