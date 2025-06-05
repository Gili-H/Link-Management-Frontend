// הגדרת BASE_URL של השרת שלך
const BASE_URL = 'http://localhost:3000'; // ודא שזה תואם לפורט של השרת שלך

// אלמנטים מה-HTML
const userIdInput = document.getElementById('userIdInput');
const loadUserDataButton = document.getElementById('loadUserData');
const linkIdInput = document.getElementById('linkIdInput');
const loadLinkDataButton = document.getElementById('loadLinkData');

// הקנבסים של הגרפים
const linkClicksByTargetCtx = document.getElementById('linkClicksByTargetChart').getContext('2d');
const userTotalClicksCtx = document.getElementById('userTotalClicksChart').getContext('2d');
// תיקון קל: וודאי שזה userClicksByDayChart ובהתאמה ב-HTML
const userClicksByDayCtx = document.getElementById('userClicksByDayChart').getContext('2d');

let linkClicksByTargetChartInstance; // משתנים לשמירת מופעי הגרפים כדי שנוכל להשמיד אותם ולעדכן
let userTotalClicksChartInstance;
let userClicksByDayChartInstance;

// פונקציה כללית לשליפת נתונים מה-API
async function fetchData(url) {
    try {
        console.log('Fetching data from URL:', url); // <-- לוג נוסף: URL שנשלח
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert(`שגיאה בטעינת הנתונים: ${error.message}. ודא שהשרת פועל ושה-ID תקין.`);
        return null;
    }
}

// 1. גרף שמציג נתוני קליקים על קישור מסוים לפי מקורות שונים (טרגוט)
async function renderLinkClicksByTargetChart(linkId) {
    if (!linkId) return;

    // --- לוג: מה נשלח לפונקציה הזו ---
    console.log('renderLinkClicksByTargetChart called with linkId:', linkId);

    const data = await fetchData(`${BASE_URL}/api/links/${linkId}/clicks-by-target`);
    if (!data) return;

    // השמדת גרף קיים אם יש
    if (linkClicksByTargetChartInstance) {
        linkClicksByTargetChartInstance.destroy();
    }

    const labels = data.clicksByTarget.map(item => item.targetName);
    const counts = data.clicksByTarget.map(item => item.count);

    linkClicksByTargetChartInstance = new Chart(linkClicksByTargetCtx, {
        type: 'pie', // גרף עוגה מתאים לפילוח
        data: {
            labels: labels,
            datasets: [{
                label: 'קליקים לפי מקור',
                data: counts,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `קליקים לקישור: ${linkId} (סך הכל: ${data.totalClicks})`
                }
            }
        }
    });
}

// 2. גרף שמציג נתוני קליקים על כל הקישורים של משתמש מסוים לפי כמות כוללת
async function renderUserTotalClicksChart(userId) {
    if (!userId) return;

    // --- לוג: מה נשלח לפונקציה הזו ---
    console.log('renderUserTotalClicksChart called with userId:', userId);

    const userData = await fetchData(`${BASE_URL}/api/users/${userId}`);
    if (!userData || !userData.links) return;

    // השמדת גרף קיים אם יש
    if (userTotalClicksChartInstance) {
        userTotalClicksChartInstance.destroy();
    }

    // נצטרך לאסוף את הנתונים מכל הקישורים
    const linkLabels = [];
    const linkClickCounts = [];

    // יצירת מערך של פרומיסים לשליפת נתוני קליקים מכל קישור
    const linkDataPromises = userData.links.map(link => { // <--- שינוי כאן: link במקום linkId
        // --- לוג: ID של הקישור שנשלף עבור גרף משתמש ---
        console.log('Fetching individual link data for user chart. Link ID:', link._id); // <--- שינוי כאן: link._id
        return fetchData(`${BASE_URL}/api/links/${link._id}`); // <--- שינוי כאן: link._id
    });

    const allLinkData = await Promise.all(linkDataPromises);

    allLinkData.forEach(link => {
        if (link) {
            linkLabels.push(link.originalUrl.length > 30 ? link.originalUrl.substring(0, 27) + '...' : link.originalUrl); // קיצור URL ארוכים לתוויות
            linkClickCounts.push(link.clicks.length);
        }
    });

    userTotalClicksChartInstance = new Chart(userTotalClicksCtx, {
        type: 'bar', // גרף עמודות מתאים להשוואה בין קישורים
        data: {
            labels: linkLabels,
            datasets: [{
                label: 'מספר קליקים',
                data: linkClickCounts,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `קליקים כוללים לקישורי משתמש: ${userId}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'מספר קליקים'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'קישור מקוצר (URL מקורי)'
                    }
                }
            }
        }
    });
}

// 3. גרף שמציג נתוני קליקים על כל הקישורים של משתמש מסוים לפי יום בשבוע
async function renderUserClicksByDayChart(userId) {
    if (!userId) return;

    // --- לוג: מה נשלח לפונקציה הזו ---
    console.log('renderUserClicksByDayChart called with userId:', userId);

    const userData = await fetchData(`${BASE_URL}/api/users/${userId}`);
    if (!userData || !userData.links) return;

    // השמדת גרף קיים אם יש
    if (userClicksByDayChartInstance) {
        userClicksByDayChartInstance.destroy();
    }

    const clicksByDay = {
        'ראשון': 0, 'שני': 0, 'שלישי': 0, 'רביעי': 0,
        'חמישי': 0, 'שישי': 0, 'שבת': 0
    };
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    // יצירת מערך של פרומיסים לשליפת נתוני קליקים מכל קישור
    const linkDataPromises = userData.links.map(link => { // <--- שינוי כאן: link במקום linkId
        // --- לוג: ID של הקישור שנשלף עבור גרף יומי של משתמש ---
        console.log('Fetching individual link data for user daily chart. Link ID:', link._id); // <--- שינוי כאן: link._id
        return fetchData(`${BASE_URL}/api/links/${link._id}`); // <--- שינוי כאן: link._id
    });

    const allLinkData = await Promise.all(linkDataPromises);

    allLinkData.forEach(link => {
        if (link && link.clicks) {
            link.clicks.forEach(click => {
                const date = new Date(click.insertedAt);
                const dayOfWeek = date.getDay(); // 0 = ראשון, 1 = שני, ..., 6 = שבת
                clicksByDay[dayNames[dayOfWeek]]++;
            });
        }
    });

    userClicksByDayChartInstance = new Chart(userClicksByDayCtx, {
        type: 'line', // גרף קו מתאים לטרנדים יומיים
        data: {
            labels: dayNames,
            datasets: [{
                label: 'מספר קליקים',
                data: Object.values(clicksByDay),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false, // לא למלא את האזור מתחת לקו
                tension: 0.1 // קיעור הקו
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `פילוח קליקים לפי יום בשבוע עבור משתמש: ${userId}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'מספר קליקים'
                    },
                    ticks: {
                        stepSize: 1 // קליקים הם מספרים שלמים
                    }
                }
                ,
                x: {
                    title: {
                        display: true,
                        text: 'יום בשבוע'
                    }
                }
            }
        }
    });
}

// מאזינים לאירועי לחיצה על הכפתורים
loadLinkDataButton.addEventListener('click', () => {
    const linkId = linkIdInput.value;
    // --- לוג: מה נשלף מהקלט של הקישור ---
    console.log('Link ID input value:', linkId, 'Type:', typeof linkId);
    if (linkId) {
        renderLinkClicksByTargetChart(linkId);
    } else {
        alert('אנא הזן מזהה קישור.');
    }
});

loadUserDataButton.addEventListener('click', () => {
    const userId = userIdInput.value;
    // --- לוג: מה נשלף מהקלט של המשתמש ---
    console.log('User ID input value:', userId, 'Type:', typeof userId);
    if (userId) {
        renderUserTotalClicksChart(userId);
        renderUserClicksByDayChart(userId);
    } else {
        alert('אנא הזן מזהה משתמש.');
    }
});

// אתחול ראשוני (אופציונלי): טען נתונים כלליים או הסבר למשתמש
document.addEventListener('DOMContentLoaded', () => {
    // ניתן להציג כאן הוראות או טקסטים התחלתיים
    console.log('Client application loaded. Enter User/Link IDs to load data.');
});