import { api } from './api.js';
import { formatValue, formatPing, formatTime, escapeHtml } from './utils.js';
import { getCommonDatasets, getChartOptions } from './chart-config.js';

let speedChart;
let navChart;
let chartDataRaw = [];

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchData();
    fetchLogs();
    updateStatusInfo();

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
    // メイングラフ
    const ctx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: getCommonDatasets() },
        options: getChartOptions()
    });

    // ミニマップ用グラフ
    const navCtx = document.getElementById('navChart').getContext('2d');
    navChart = new Chart(navCtx, {
        type: 'line',
        data: { labels: [], datasets: getCommonDatasets().map(ds => ({ ...ds, borderWidth: 1, fill: true })) },
        options: getChartOptions({
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false },
                y1: { display: false }
            },
            elements: { point: { radius: 0 } }
        })
    });
}

async function fetchData() {
    try {
        const data = await api.fetchHistory();
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
    document.querySelector('#card-download .value').innerHTML = `${formatValue(latest.download)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-upload .value').innerHTML = `${formatValue(latest.upload)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-ping .value').innerHTML = `${formatPing(latest.ping)} <span class="unit">ms</span>`;

    // グラフデータの準備
    const labels = chartDataRaw.map(d => formatTime(d.timestamp));
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
}

function setDefaultRange() {
    if (chartDataRaw.length === 0) return;

    // iOS Safari互換: ISO 8601形式に変換
    const latestTimestamp = chartDataRaw[chartDataRaw.length - 1].timestamp.replace(' ', 'T') + 'Z';
    const latestTime = new Date(latestTimestamp).getTime();
    const sixHoursAgo = latestTime - (6 * 60 * 60 * 1000);

    let minIdx = 0;
    for (let i = chartDataRaw.length - 1; i >= 0; i--) {
        const isoTs = chartDataRaw[i].timestamp.replace(' ', 'T') + 'Z';
        const t = new Date(isoTs).getTime();
        if (t < sixHoursAgo) {
            minIdx = i + 1;
            break;
        }
    }

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
        await api.startTest();
        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            await fetchData();
            await fetchLogs();
            if (attempts >= 6) {
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
        const data = await api.fetchLogs();
        const viewer = document.getElementById('log-viewer');

        const lines = data.logs.split('\n');
        const html = lines.map(line => {
            if (!line.trim()) return '';
            let typeClass = 'log-info';
            if (line.includes('ERROR')) typeClass = 'log-error';
            else if (line.includes('WARNING')) typeClass = 'log-warning';

            const escapedLine = escapeHtml(line);
            return `<span class="log-line ${typeClass}">${escapedLine}</span>`;
        }).join('');

        viewer.innerHTML = html;
        viewer.scrollTop = viewer.scrollHeight;
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

async function clearHistory() {
    if (!confirm('全ての測定履歴を削除しますか？')) return;
    try {
        await api.clearHistory();
        fetchData();
    } catch (error) {
        console.error('Error clearing history:', error);
    }
}

async function clearLogs() {
    if (!confirm('システムログをクリアしますか？')) return;
    try {
        await api.clearLogs();
        fetchLogs();
    } catch (error) {
        console.error('Error clearing logs:', error);
    }
}
async function updateStatusInfo() {
    try {
        const data = await api.fetchStatus();

        // 自動測定バッジの更新
        const badge = document.getElementById('auto-test-badge');
        if (data && data.interval) {
            const intervalStr = data.interval.replace(/'/g, '"');
            try {
                const interval = JSON.parse(intervalStr);
                let text = '';
                if (interval.hours) text += `${interval.hours}h `;
                if (interval.minutes) text += `${interval.minutes}m `;
                if (interval.seconds) text += `${interval.seconds}s `;
                badge.innerHTML = `<span class="pulse"></span> Auto-measurement: every ${text.trim()}`;
            } catch (e) {
                badge.innerHTML = `<span class="pulse"></span> Auto-measurement: ${data.interval}`;
            }
        }

        // 次回測定予定時刻の更新
        const nextRunEl = document.getElementById('next-run-time');
        if (data && data.next_run) {
            const nextDate = new Date(data.next_run);
            const formatted = nextDate.toLocaleString(undefined, {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            nextRunEl.innerText = `次回定期測定予定: ${formatted}`;
        } else {
            nextRunEl.innerText = '';
        }

    } catch (error) {
        console.error('Error fetching status:', error);
    }
}
