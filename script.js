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
    // GitHub Pages인 경우 저장소 이름을 포함한 경로 반환
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        // URL에서 저장소 이름 추출
        const pathSegments = window.location.pathname.split('/');
        const repoName = pathSegments[1]; // 첫 번째 세그먼트가 저장소 이름
        return `/${repoName}`;
    }
    return ''; // 로컬 환경에서는 빈 문자열 반환
};

async function updateTodayMeme() {
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('today-date').textContent = `${formattedDate}`;

    const memeData = await loadMemeData();
    if (!memeData) {
        console.error('밈 데이터를 불러오지 못했습니다.');
        return;
    }

    // 헤더를 제외하고 날짜 매칭
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayDateString = `${month}/${day}`;
    
    console.log('현재 날짜:', todayDateString);
    console.log('검색할 데이터:', memeData);
    
    // 헤더 제외하고 1번 인덱스부터 검색
    const todayRow = memeData.slice(1).find(row => {
        console.log('비교 중:', row[0], todayDateString, row[0].trim() === todayDateString);
        return row[0].trim() === todayDateString;
    });
    
    console.log('찾은 데이터:', todayRow);
    
    if (todayRow) {
        const specialDay = todayRow[1].trim();
        const sinceYear = todayRow[2].trim();
        const format = todayRow[3].trim();
        const currentYear = today.getFullYear();
        const years = calculateYears(currentYear, sinceYear);
        
        const monthStr = padNumber(month);
        const dayStr = padNumber(day);
        const timestamp = new Date().getTime();
        const basePath = getBasePath();
        const baseImageUrl = `${basePath}/resource/${monthStr}${dayStr}.webp`;
        const imageUrl = `${baseImageUrl}?t=${timestamp}`;
        
        console.log('경로 정보:', {
            기본경로: basePath,
            이미지경로: baseImageUrl
        });
        
        const formattedSpecialDay = formatSpecialDay(specialDay, years, format);
        if (window.innerWidth <= 809) {
            document.getElementById('special-day').innerHTML = formattedSpecialDay;
        } else {
            document.getElementById('special-day').innerHTML = `오늘은 <strong>${formattedSpecialDay}</strong> 입니다`;
        }

        // 이미지 로드 처리
        const imgElement = document.getElementById('meme-image');
        imgElement.onerror = () => {
            console.error('이미지 로드 실패. 파일 경로 확인:', baseImageUrl);
            // 이미지 로드 실패시 기본 이미지로 대체
            imgElement.src = `${basePath}/resource/default.webp?t=${timestamp}`;
            // 메타태그도 기본 이미지로 업데이트
            updateMetaTags(`${basePath}/resource/default.webp`, formattedSpecialDay);
        };
        imgElement.onload = () => {
            console.log('이미지 로드 성공:', baseImageUrl);
            // 메타태그 업데이트
            updateMetaTags(baseImageUrl, formattedSpecialDay);
        };
        imgElement.src = imageUrl;
        
    } else {
        console.log('오늘 날짜의 데이터를 찾지 못했습니다.');
        document.getElementById('special-day').textContent = '오늘은 특별한 날이 없습니다.';
        const timestamp = new Date().getTime();
        const basePath = getBasePath();
        const defaultImageUrl = `${basePath}/resource/default.webp`;
        document.getElementById('meme-image').src = `${defaultImageUrl}?t=${timestamp}`;
        // 데이터가 없는 경우에도 메타태그 업데이트
        updateMetaTags(defaultImageUrl, '오늘은 특별한 날이 없습니다.');
    }
}

// 메타태그 업데이트 함수
async function updateMetaTags(imageUrl, description) {
    // 현재 페이지의 완전한 URL
    const pageUrl = window.location.href.split('?')[0]; // 쿼리 파라미터 제거
    
    // 이미지 URL을 완전한 절대 URL로 변환
    let absoluteImageUrl;
    if (imageUrl.startsWith('http')) {
        absoluteImageUrl = imageUrl;
    } else {
        // 상대 경로인 경우 현재 도메인 기준으로 완전한 URL 생성
        const baseUrl = window.location.origin;
        absoluteImageUrl = new URL(imageUrl.split('?')[0], baseUrl).href; // 쿼리 파라미터 제거
    }

    // 이미지 크기를 가져오는 Promise를 반환하는 함수
    function getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }

    try {
        // 이미지 크기 가져오기
        const dimensions = await getImageDimensions(absoluteImageUrl);
        
        // Open Graph 메타태그 업데이트
        document.getElementById('og-url').setAttribute('content', pageUrl);
        document.getElementById('og-title').setAttribute('content', description);
        document.getElementById('og-image').setAttribute('content', absoluteImageUrl);
        document.getElementById('og-image:width').setAttribute('content', dimensions.width.toString());
        document.getElementById('og-image:height').setAttribute('content', dimensions.height.toString());
        
        // Twitter Card 메타태그 업데이트
        document.getElementById('twitter-url').setAttribute('content', pageUrl);
        document.getElementById('twitter-title').setAttribute('content', description);
        document.getElementById('twitter-image').setAttribute('content', absoluteImageUrl);
        
        console.log('메타태그 업데이트됨:', {
            url: pageUrl,
            image: absoluteImageUrl,
            description: description,
            dimensions: dimensions
        });
    } catch (error) {
        console.error('이미지 크기 가져오기 실패:', error);
        // 이미지 로드 실패 시 기본 크기 설정
        document.getElementById('og-image:width').setAttribute('content', '1200');
        document.getElementById('og-image:height').setAttribute('content', '630');
    }
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', updateTodayMeme);

// 화면 크기 변경 시에도 텍스트 포맷 업데이트
window.addEventListener('resize', updateTodayMeme);

// 공유 기능 구현
async function shareContent() {
    const currentUrl = window.location.href;
    const shareData = {
        title: '오늘의 밈 캘린더',
        text: document.getElementById('special-day').textContent,
        url: currentUrl
    };

    try {
        // 공유 시트 시도
        await navigator.share(shareData);
    } catch (error) {
        // 공유 시트가 지원되지 않거나 실패한 경우 링크 복사
        await navigator.clipboard.writeText(currentUrl);
        
        const shareButton = document.getElementById('share-button');
        const originalText = shareButton.innerHTML;
        shareButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
            링크 복사됨!
        `;
        
        setTimeout(() => {
            shareButton.innerHTML = originalText;
        }, 3000);
    }
}

// 공유 버튼 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    updateTodayMeme();
    
    const shareButton = document.getElementById('share-button');
    shareButton.addEventListener('click', shareContent);
}); 