const ESP32_IP = "10.161.238.248"; // <-- REPLACE WITH YOUR ESP32 IP ADDRESS

document.addEventListener('DOMContentLoaded', () => {
    ['time_1', 'time_2', 'time_3'].forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        
        element.addEventListener('input', (e) => {
            let cursor = e.target.selectionStart;
            let originalLen = e.target.value.length;
            let num = e.target.value.replace(/[^0-9]/g, '');
            
            if (num.length >= 1) {
                let h1 = parseInt(num[0]);
                if (h1 > 2) num = '2' + num.slice(1);
            }
            if (num.length >= 2) {
                let h = parseInt(num.slice(0, 2));
                if (h > 23) num = '23' + num.slice(2);
            }
            if (num.length >= 3) {
                let m1 = parseInt(num[2]);
                if (m1 > 5) num = num.slice(0, 2) + '5' + num.slice(3);
            }
            if (num.length >= 4) {
                let m = parseInt(num.slice(2, 4));
                if (m > 59) num = num.slice(0, 2) + '59';
            }

            if (num.length > 2) {
                e.target.value = num.slice(0, 2) + ':' + num.slice(2, 4);
            } else {
                e.target.value = num;
            }

            if (e.target.value.length > originalLen && cursor === 3) cursor++;
            e.target.setSelectionRange(cursor, cursor);
        });

        element.addEventListener('blur', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length === 0) return;
            
            while (val.length < 4) {
                val = val + '0';
            }
            e.target.value = val.slice(0, 2) + ':' + val.slice(2, 4);
        });
    });
});

function log(message, type = 'info') {
    const consoleBox = document.getElementById('consoleLog');
    if (!consoleBox) return;
    const timestamp = new Date().toLocaleTimeString();
    let prefix = '>> ';
    let color = '#334155';
    
    if (type === 'error') { color = '#dc2626'; prefix = '[ERR] '; }
    if (type === 'warn') { color = '#d97706'; prefix = '[WRN] '; }
    if (type === 'success') { color = '#16a34a'; prefix = '[OK ] '; }
    
    consoleBox.innerHTML += `<span style="color: ${color}">${timestamp} ${prefix}${message}</span><br/>`;
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearLog() { document.getElementById('consoleLog').innerHTML = ''; }

function setInterfaceLock(isLocked) {
    const overlay = document.getElementById('pipelineLock');
    const btnTx = document.getElementById('btnTx');
    const btnTest = document.getElementById('btnTest');
    
    if (overlay) overlay.style.display = isLocked ? 'flex' : 'none';
    if (btnTx) btnTx.disabled = isLocked;
    if (btnTest) btnTest.disabled = isLocked;
}

async function sendActiveConfig() {
    const t1 = document.getElementById('time_1').value.trim();
    const t2 = document.getElementById('time_2').value.trim();
    const t3 = document.getElementById('time_3').value.trim();

    if (!t1 && !t2 && !t3) {
        log('No parameters populated. Transmission aborted.', 'warn');
        return;
    }

    const timesArray = [t1, t2, t3].filter(t => t.length > 0).join(',');

    const params = new URLSearchParams();
    params.append('times', timesArray);

    ['ssid', 'password', 'token', 'user_id', 'ble_name', 'message'].forEach(id => {
        const val = document.getElementById(id)?.value.trim();
        if (val) params.append(id, val);
    });

    setInterfaceLock(true);
    
    const maxAttempts = 12; // Covers the 10-second sleep cycle
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log(`Sync attempt ${attempt}/${maxAttempts} (Waiting for ESP32 wake window)...`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout per attempt

            const response = await fetch(`http://${ESP32_IP}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                log('Parameters synced successfully via Wi-Fi.', 'success');
                setInterfaceLock(false);
                return;
            }
        } catch (error) {
            // Suppress network errors during deep sleep and proceed to next retry
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s before retrying
    }

    log('Network transmission timed out. ESP32 handshake failed.', 'error');
    setInterfaceLock(false);
}

async function triggerHardwareLineNotify() {
    setInterfaceLock(true);
    log('Issuing hardware test trigger request...');

    try {
        const response = await fetch(`http://${ESP32_IP}/test`, {
            method: 'POST'
        });

        if (response.ok) {
            log('Hardware alert pipeline execution command issued.', 'success');
        } else {
            log(`Server error status: ${response.status}`, 'error');
        }
    } catch (error) {
        log(`Network transmission failure: ${error.message}`, 'error');
    } finally {
        setInterfaceLock(false);
    }
}

log('Terminal sequence active. Monitoring pipeline ready.');