let speedChart;
let navChart;
let chartDataRaw = [];
let isDragging = false;
let startX;
let scrollLeft;

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchData();
    fetchLogs();

    document.getElementById('btn-test').addEventListener('click', startManualTest);
    document.getElementById('btn-refresh-logs').addEventListener('click', fetchLogs);
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-clear-logs').addEventListener('click', clearLogs);
    document.getElementById('btn-reset-zoom').addEventListener('click', resetZoom);

    // 1分ごとにデータを更新
    setInterval(() => {
        fetchData();
        fetchLogs();
    }, 60000);

    initBrushEvents();
});

function initCharts() {
    const commonDatasets = [
        {
            label: 'Download (Mbps)',
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
        },
        {
            label: 'Upload (Mbps)',
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
        },
        {
            label: 'Ping (ms)',
            borderColor: '#f472b6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            yAxisID: 'y1'
        }
    ];

    // メイングラフ
    const ctx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: commonDatasets.map(ds => ({ ...ds, data: [] })) },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Speed (Mbps)', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: 'Ping (ms)', color: '#f472b6' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#f472b6' },
                    min: 0
                }
            }
        }
    });

    // ミニマップ用グラフ
    const navCtx = document.getElementById('navChart').getContext('2d');
    navChart = new Chart(navCtx, {
        type: 'line',
        data: { labels: [], datasets: commonDatasets.map(ds => ({ ...ds, data: [], borderWidth: 1, fill: true })) },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false },
                y1: { display: false }
            },
            elements: { point: { radius: 0 } }
        }
    });
}

async function fetchData() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();

        if (data.length > 0) {
            updateDashboard(data);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateDashboard(data) {
    const isFirstLoad = chartDataRaw.length === 0;
    chartDataRaw = [...data].reverse();

    // 最新のデータをカードに反映
    const latest = data[0];
    document.querySelector('#card-download .value').innerHTML = `${latest.download.toFixed(1)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-upload .value').innerHTML = `${latest.upload.toFixed(1)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-ping .value').innerHTML = `${Math.round(latest.ping)} <span class="unit">ms</span>`;

    // グラフデータの準備
    const labels = chartDataRaw.map(d => {
        const date = new Date(d.timestamp + " UTC");
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const downloads = chartDataRaw.map(d => d.download);
    const uploads = chartDataRaw.map(d => d.upload);
    const pings = chartDataRaw.map(d => d.ping);

    // ミニマップの更新
    navChart.data.labels = labels;
    navChart.data.datasets[0].data = downloads;
    navChart.data.datasets[1].data = uploads;
    navChart.data.datasets[2].data = pings;
    navChart.update();

    // メイングラフの更新
    speedChart.data.labels = labels;
    speedChart.data.datasets[0].data = downloads;
    speedChart.data.datasets[1].data = uploads;
    speedChart.data.datasets[2].data = pings;
    speedChart.data.datasets.forEach(ds => ds.spanGaps = false);

    // 初回ロード時は直近6時間にフォーカス
    if (isFirstLoad) {
        setDefaultRange();
    } else {
        speedChart.update();
    }

    updateBrushUI();

    // テーブルの更新
    const tbody = document.querySelector('#table-history tbody');
    tbody.innerHTML = '';
    data.forEach(d => {
        const date = new Date(d.timestamp + " UTC");
        const tr = document.createElement('tr');
        const formatValue = (val, unit) => (val === null || val === undefined) ? `<span class="error-text">Error</span>` : `${val.toFixed(val >= 10 ? 1 : 2)} ${unit}`;
        tr.innerHTML = `
            <td>${date.toLocaleString()}</td>
            <td>${formatValue(d.download, 'Mbps')}</td>
            <td>${formatValue(d.upload, 'Mbps')}</td>
            <td>${formatValue(d.ping, 'ms')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setDefaultRange() {
    if (chartDataRaw.length === 0) return;

    const latestTime = new Date(chartDataRaw[chartDataRaw.length - 1].timestamp + " UTC").getTime();
    const sixHoursAgo = latestTime - (6 * 60 * 60 * 1000);

    let minIdx = 0;
    for (let i = chartDataRaw.length - 1; i >= 0; i--) {
        const t = new Date(chartDataRaw[i].timestamp + " UTC").getTime();
        if (t < sixHoursAgo) {
            minIdx = i + 1;
            break;
        }
    }

    // データが少ない場合は全表示
    if (minIdx >= chartDataRaw.length - 1) minIdx = 0;

    speedChart.options.scales.x.min = minIdx;
    speedChart.options.scales.x.max = chartDataRaw.length - 1;
    speedChart.update();
}

function updateBrushUI() {
    const brush = document.getElementById('nav-brush');
    const totalCount = chartDataRaw.length;
    if (totalCount < 2) {
        brush.style.left = '0%';
        brush.style.width = '100%';
        return;
    }

    const x = speedChart.scales.x;
    const minIndex = x.min !== undefined ? Math.max(0, x.min) : 0;
    const maxIndex = x.max !== undefined ? Math.min(totalCount - 1, x.max) : totalCount - 1;

    const left = (minIndex / (totalCount - 1)) * 100;
    const right = (maxIndex / (totalCount - 1)) * 100;

    brush.style.left = `${left}%`;
    brush.style.width = `${Math.max(0.1, right - left)}%`;
}

function initBrushEvents() {
    const brush = document.getElementById('nav-brush');
    const wrapper = brush.parentElement;
    const handleL = brush.querySelector('.handle-l');
    const handleR = brush.querySelector('.handle-r');

    let isMoving = false;
    let isResizingL = false;
    let isResizingR = false;
    let startX, startLeft, startWidth;

    const onStart = (e, mode) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startLeft = parseFloat(brush.style.left) || 0;
        startWidth = parseFloat(brush.style.width) || 100;

        if (mode === 'move') isMoving = true;
        if (mode === 'resizeL') isResizingL = true;
        if (mode === 'resizeR') isResizingR = true;

        document.body.style.userSelect = 'none';
    };

    brush.onmousedown = (e) => onStart(e, 'move');
    handleL.onmousedown = (e) => onStart(e, 'resizeL');
    handleR.onmousedown = (e) => onStart(e, 'resizeR');

    window.onmousemove = (e) => {
        if (!isMoving && !isResizingL && !isResizingR) return;

        const dx = ((e.clientX - startX) / wrapper.offsetWidth) * 100;

        if (isMoving) {
            let newLeft = startLeft + dx;
            newLeft = Math.max(0, Math.min(newLeft, 100 - startWidth));
            brush.style.left = `${newLeft}%`;
        } else if (isResizingL) {
            let newLeft = startLeft + dx;
            let newWidth = startWidth - dx;
            if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
            if (newWidth < 1) { newLeft = startLeft + startWidth - 1; newWidth = 1; }
            brush.style.left = `${newLeft}%`;
            brush.style.width = `${newWidth}%`;
        } else if (isResizingR) {
            let newWidth = startWidth + dx;
            if (startLeft + newWidth > 100) newWidth = 100 - startLeft;
            if (newWidth < 1) newWidth = 1;
            brush.style.width = `${newWidth}%`;
        }

        syncMainChart();
    };

    window.onmouseup = () => {
        isMoving = isResizingL = isResizingR = false;
        document.body.style.userSelect = '';
    };
}

function syncMainChart() {
    const totalCount = chartDataRaw.length;
    if (totalCount < 2) return;

    const brush = document.getElementById('nav-brush');
    const leftPercent = parseFloat(brush.style.left) / 100;
    const widthPercent = parseFloat(brush.style.width) / 100;

    const minIdx = Math.round(leftPercent * (totalCount - 1));
    const maxIdx = Math.round((leftPercent + widthPercent) * (totalCount - 1));

    speedChart.options.scales.x.min = minIdx;
    speedChart.options.scales.x.max = maxIdx;
    speedChart.update('none');
}

function resetZoom() {
    setDefaultRange();
    updateBrushUI();
}

async function startManualTest() {
    const btn = document.getElementById('btn-test');
    const status = document.getElementById('status-message');

    btn.disabled = true;
    status.innerText = '測定中... (これには1分ほどかかる場合があります)';

    try {
        const response = await fetch('/api/test', { method: 'POST' });
        const result = await response.json();

        // 測定はバックグラウンドで行われるため、少し待ってからデータを再取得
        // 実際にはポーリングなどで状態を確認するのがベストだが、簡易化のため10秒おきに数回チェック
        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            await fetchData();
            if (attempts >= 6) { // 最大1分間チェック
                clearInterval(checkInterval);
                btn.disabled = false;
                status.innerText = '測定が完了しました。';
                setTimeout(() => { status.innerText = ''; }, 5000);
            }
        }, 10000);

    } catch (error) {
        console.error('Error starting test:', error);
        btn.disabled = false;
        status.innerText = 'エラーが発生しました。';
    }
}

async function fetchLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        const viewer = document.getElementById('log-viewer');
        viewer.innerText = data.logs;
        // 一番下にスクロール
        viewer.scrollTop = viewer.scrollHeight;
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

async function clearHistory() {
    if (!confirm('全ての測定履歴を削除しますか？')) return;
    try {
        await fetch('/api/history', { method: 'DELETE' });
        fetchData(); // 画面を更新
    } catch (error) {
        console.error('Error clearing history:', error);
    }
}

async function clearLogs() {
    if (!confirm('システムログをクリアしますか？')) return;
    try {
        await fetch('/api/logs', { method: 'DELETE' });
        fetchLogs(); // 画面を更新
    } catch (error) {
        console.error('Error clearing logs:', error);
    }
}
