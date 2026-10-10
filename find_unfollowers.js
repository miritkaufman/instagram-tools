const fs = require('fs');

function extractUsername(item) {
    if (item.title) return item.title;
    if (item.string_list_data && item.string_list_data.length > 0) {
        const data = item.string_list_data[0];
        if (data.value && data.value !== 'undefined') return data.value;
        if (data.href) {
            const match = data.href.match(/instagram\.com\/([^\/?]+)/);
            if (match) return match[1];
        }
    }
    return null;
}

try {
    const followersSet = new Set();
    const files = fs.readdirSync('./');
    const followerFiles = files.filter(file => file.startsWith('followers_') && file.endsWith('.json'));

    if (followerFiles.length === 0) {
        throw new Error('לא נמצאו קובצי עוקבים המתחילים ב-followers_');
    }

    console.log(`נמצאו ${followerFiles.length} קובצי עוקבים. מעבד נתונים...`);

    followerFiles.forEach(file => {
        const rawData = fs.readFileSync(file, 'utf8');
        const parsedData = JSON.parse(rawData);
        
        parsedData.forEach(item => {
            const username = extractUsername(item);
            if (username) {
                followersSet.add(username);
            }
        });
    });

    console.log(`סה"כ עוקבים ייחודיים שנטענו: ${followersSet.size}`);

    const followingRaw = fs.readFileSync('following.json', 'utf8');
    const followingData = JSON.parse(followingRaw);
    const notFollowingBack = [];
    
    const followingArray = followingData.relationships_following || followingData;

    followingArray.forEach(item => {
        const username = extractUsername(item);
        if (username && item.string_list_data && item.string_list_data.length > 0) {
            const timestamp = item.string_list_data[0].timestamp;
            if (!followersSet.has(username)) {
                notFollowingBack.push({ username, timestamp });
            }
        }
    });

    notFollowingBack.sort((a, b) => a.timestamp - b.timestamp);

    let htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>רשימת לא עוקבים חזרה</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 20px; color: #262626; }
            h2 { text-align: center; margin-bottom: 5px; }
            .controls { text-align: center; margin-bottom: 20px; }
            .reset-btn { background-color: #f0f0f0; border: 1px solid #dbdbdb; padding: 8px 15px; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; }
            .user-card { background: white; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px; }
            .username { font-size: 18px; font-weight: bold; }
            .date { font-size: 14px; color: #8e8e8e; }
            .buttons { display: flex; gap: 10px; }
            .link-btn { flex: 1; text-align: center; background-color: #0095f6; color: white; padding: 12px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; }
            .link-btn:active { background-color: #0074cc; }
            .delete-btn { flex: 1; text-align: center; background-color: #ed4956; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; }
            .delete-btn:active { background-color: #c93642; }
        </style>
        <script>
            const STORAGE_KEY = 'instagram_hidden_users';

            function getHiddenUsers() {
                try {
                    const hidden = localStorage.getItem(STORAGE_KEY);
                    return hidden ? JSON.parse(hidden) : [];
                } catch(e) {
                    return [];
                }
            }

            function saveHiddenUser(username) {
                try {
                    const hidden = getHiddenUsers();
                    if (!hidden.includes(username)) {
                        hidden.push(username);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
                    }
                } catch(e) {
                    console.log('שמירה לזיכרון מקומי חסומה בדפדפן זה');
                }
            }

            function removeCard(button, username) {
                // 1. קודם כל מעלימים מהמסך כדי שזה תמיד יעבוד, אפילו אם השמירה נכשלת
                const card = button.closest('.user-card');
                card.style.display = 'none';
                
                // 2. מעדכנים את המונה מיד
                updateCounter();
                
                // 3. מנסים לשמור את המחיקה בזיכרון של האייפון
                saveHiddenUser(username);
            }

            function resetList() {
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch(e) {}
                
                // החזרה של כל השורות לתצוגה ללא רענון הדף (בטוח יותר באייפון)
                const cards = document.querySelectorAll('.user-card');
                cards.forEach(card => {
                    card.style.display = 'flex';
                });
                
                updateCounter();
            }

            function updateCounter() {
                const totalCards = document.querySelectorAll('.user-card').length;
                const hiddenCards = document.querySelectorAll('.user-card[style*="display: none"]').length;
                const visibleCount = Math.max(0, totalCards - hiddenCards);
                document.getElementById('counter').innerText = visibleCount;
            }

            window.onload = function() {
                const hiddenUsers = getHiddenUsers();
                const cards = document.querySelectorAll('.user-card');
                
                cards.forEach(card => {
                    const username = card.getAttribute('data-username');
                    if (hiddenUsers.includes(username)) {
                        card.style.display = 'none';
                    }
                });
                
                updateCounter();
            }
        </script>
    </head>
    <body>
        <h2>לא עוקבים חזרה (<span id="counter">${notFollowingBack.length}</span>)</h2>
        <div class="controls">
            <button class="reset-btn" onclick="resetList()">שחזור כל המשתמשים שהוסתרו</button>
        </div>
        <div>
    `;

    notFollowingBack.forEach((user, index) => {
        const date = new Date(user.timestamp * 1000).toLocaleDateString('he-IL');
        const profileLink = `https://www.instagram.com/${user.username}/`;
        
        htmlContent += `
            <div class="user-card" data-username="${user.username}">
                <div class="username">${user.username}</div>
                <div class="date">הוחל מעקב בתאריך: ${date}</div>
                <div class="buttons">
                    <a href="${profileLink}" target="_blank" class="link-btn">פתיחת פרופיל</a>
                    <button class="delete-btn" onclick="removeCard(this, '${user.username}')">מחק מהרשימה</button>
                </div>
            </div>
        `;
    });

    htmlContent += `
        </div>
    </body>
    </html>
    `;

    const outputFileName = 'not_following_back.html';
    fs.writeFileSync(outputFileName, htmlContent, 'utf8');

    console.log('התהליך הסתיים בהצלחה!');
    console.log('התוצאות הממוינות נשמרו בקובץ החדש: ' + outputFileName);

} catch (error) {
    console.error('אירעה שגיאה במהלך ריצת הסקריפט:', error.message);
}