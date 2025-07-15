async function loadMemeData() {
    try {
        console.log('CSV 파일 로딩 시작');
        const basePath = getBasePath();
        const response = await fetch(`${basePath}/memes.csv`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        console.log('받은 CSV 데이터:', data);
        
        // 빈 줄 제거하고 CSV 파싱
        const rows = data.split('\n')
            .filter(row => row.trim() !== '')
            .map(row => {
                const columns = row.split(',').map(col => col.trim());
                console.log('파싱된 행:', columns);
                return columns;
            });
        
        console.log('최종 파싱된 데이터:', rows);
        return rows;
    } catch (error) {
        console.error('밈 데이터를 불러오는데 실패했습니다:', error);
        return null;
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
}

function padNumber(num) {
    return num.toString().padStart(2, '0');
}

function calculateYears(currentYear, sinceYear) {
    if (!sinceYear) return null;
    const years = currentYear - parseInt(sinceYear);
    return years;
}

function formatSpecialDay(specialDay, years, format) {
    if (!years) return specialDay;
    
    let formattedText;
    switch (format) {
        case 'birthday':
            formattedText = `${specialDay}의 ${years}번째 생일`;
            break;
        case 'anniversary':
            formattedText = `${specialDay} ${years}주년`;
            break;
        default:
            formattedText = specialDay;
    }
    
    // 모바일 디바이스를 위한 줄바꿈 처리
    if (window.innerWidth <= 809) {
        return `<span>오늘은</span><span><strong>${formattedText}</strong></span><span>입니다!</span>`;
    } else {
        return formattedText;
    }
}

// 저장소 이름을 포함한 기본 경로 설정
const getBasePath = () => {
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        // GitHub Pages인 경우 전체 URL 반환
        const pathSegments = window.location.pathname.split('/');
        const repoName = pathSegments[1];
        return `${window.location.origin}/${repoName}`;
    }
    return window.location.origin; // 로컬 환경에서는 origin 반환
};

// 메타태그 업데이트 함수
function updateMetaTags(imageUrl, description) {
    // 현재 페이지의 완전한 URL
    const pageUrl = window.location.href.split('?')[0];
    
    // 이미지 URL을 완전한 절대 URL로 변환
    let absoluteImageUrl;
    if (imageUrl.startsWith('http')) {
        absoluteImageUrl = imageUrl;
    } else {
        // 상대 경로를 절대 URL로 변환
        const basePath = getBasePath();
        absoluteImageUrl = `${basePath}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`.split('?')[0];
    }

    // Open Graph 메타태그 업데이트
    document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);
    document.querySelector('meta[property="og:title"]').setAttribute('content', description);
    document.querySelector('meta[property="og:image"]').setAttribute('content', absoluteImageUrl);
    
    // Twitter Card 메타태그 업데이트
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', description);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', absoluteImageUrl);
    
    console.log('메타태그 업데이트됨:', {
        url: pageUrl,
        image: absoluteImageUrl,
        description: description
    });
}

async function updateTodayMeme() {
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('today-date').textContent = `${formattedDate}`;

    const memeData = await loadMemeData();
    if (!memeData) {
        console.error('밈 데이터를 불러오지 못했습니다.');
        return;
    }

    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayDateString = `${month}/${day}`;
    
    const todayRow = memeData.slice(1).find(row => {
        return row[0].trim() === todayDateString;
    });
    
    if (todayRow) {
        const specialDay = todayRow[1].trim();
        const sinceYear = todayRow[2].trim();
        const format = todayRow[3].trim();
        const currentYear = today.getFullYear();
        const years = calculateYears(currentYear, sinceYear);
        
        const monthStr = padNumber(month);
        const dayStr = padNumber(day);
        const basePath = getBasePath();
        const imageUrl = `/resource/${monthStr}${dayStr}.webp`;
        
        // none 타입 처리
        if (format === 'none') {
            const noneMessages = [
                '오늘은 행복한 날 입니다',
                '오늘은 나이스 데이 입니다'
            ];
            const randomMsg = noneMessages[Math.floor(Math.random() * noneMessages.length)];
            document.getElementById('special-day').innerHTML = randomMsg;
            // 이미지 로드 처리
            const imgElement = document.getElementById('meme-image');
            imgElement.onerror = () => {
                const defaultImageUrl = '/resource/thumbnail.png';
                imgElement.src = `${basePath}${defaultImageUrl}`;
            };
            imgElement.src = `${basePath}${imageUrl}`;
            // 메타태그 업데이트
            updateMetaTags(imageUrl, randomMsg);
            return;
        }
        
        const formattedSpecialDay = formatSpecialDay(specialDay, years, format);
        if (window.innerWidth <= 809) {
            document.getElementById('special-day').innerHTML = formattedSpecialDay;
        } else {
            document.getElementById('special-day').innerHTML = `오늘은 <strong>${formattedSpecialDay}</strong> 입니다`;
        }

        // 이미지 로드 처리
        const imgElement = document.getElementById('meme-image');
        imgElement.onerror = () => {
            const defaultImageUrl = '/resource/thumbnail.png';
            imgElement.src = `${basePath}${defaultImageUrl}`;
        };
        imgElement.src = `${basePath}${imageUrl}`;
        
        // 메타태그 업데이트
        updateMetaTags(imageUrl, formattedSpecialDay);
    } else {
        document.getElementById('special-day').textContent = '오늘은 특별한 날이 없습니다.';
        const defaultImageUrl = '/resource/thumbnail.png';
        document.getElementById('meme-image').src = `${basePath}${defaultImageUrl}`;
    }
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', updateTodayMeme);

// 화면 크기 변경 시에도 텍스트 포맷 업데이트
window.addEventListener('resize', updateTodayMeme);

// 공유 기능 구현
async function shareContent() {
    try {
        const specialDayText = document.getElementById('special-day').textContent;
        const imageElement = document.getElementById('meme-image');
        const currentUrl = window.location.href;
        
        // 공유할 텍스트 포맷팅 (오늘은 뒤에 두 칸 공백)
        const shareText = `오늘은  ${specialDayText.replace('오늘은 ', '').replace(' 입니다', '')} 입니다!\n${currentUrl}`;

        if (navigator.share && navigator.canShare) {
            // 이미지를 Blob으로 변환
            const response = await fetch(imageElement.src);
            const blob = await response.blob();
            const imageFile = new File([blob], 'meme.webp', { type: 'image/webp' });

            // 공유 데이터 생성
            const shareData = {
                files: [imageFile],
                text: shareText
            };

            // 공유 가능한지 확인
            if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // 이미지 공유가 지원되지 않으면 텍스트만 공유
                await navigator.share({
                    text: shareText
                });
            }
        } else {
            // Web Share API가 지원되지 않는 경우 클립보드에 복사
            await navigator.clipboard.writeText(shareText);
            
            const shareButton = document.getElementById('share-button');
            const originalText = shareButton.innerHTML;
            shareButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
                복사 완료!
            `;
            
            setTimeout(() => {
                shareButton.innerHTML = originalText;
            }, 3000);
        }
    } catch (error) {
        console.error('공유 처리 중 오류:', error);
    }
}

// 폭죽 효과 함수
function triggerFireworks() {
    // 화면 크기에 따라 파티클 수 조정
    const particleCount = window.innerWidth < 768 ? 70 : 100;
    
    // 왼쪽에서 터지는 폭죽
    confetti({
        particleCount: particleCount,
        spread: 60,
        origin: { x: 0.2, y: 0.6 },
        colors: ['#ff718d', '#fdbb2d', '#22c1c3', '#ff9a9e'],
        zIndex: 1001
    });
    
    // 오른쪽에서 터지는 폭죽
    confetti({
        particleCount: particleCount,
        spread: 60,
        origin: { x: 0.8, y: 0.6 },
        colors: ['#ff718d', '#fdbb2d', '#22c1c3', '#ff9a9e'],
        zIndex: 1001
    });
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', () => {
    updateTodayMeme();
    
    const shareButton = document.getElementById('share-button');
    shareButton.addEventListener('click', shareContent);

    // 페이지 로드 후 약간의 딜레이를 주고 폭죽 효과 실행
    setTimeout(triggerFireworks, 500);
}); 