const SERVICE_UUID = "4faac861-11a1-11ee-be56-0242ac120002";
const CONFIG_CHAR_UUID = "4faac862-11a1-11ee-be56-0242ac120002";
const TRIGGER_CHAR_UUID = "4faac863-11a1-11ee-be56-0242ac120002";

// Auto-formatter to force strict HH:MM typing mechanics
['time_1', 'time_2', 'time_3'].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 2) {
            value = value.slice(0, 2) + ':' + value.slice(2, 4);
        }
        e.target.value = value;
    });
});

function log(message, type = 'info') {
    const consoleBox = document.getElementById('consoleLog');
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
    
    if (isLocked) {
        overlay.style.display = 'flex';
        btnTx.disabled = true;
        btnTest.disabled = true;
    } else {
        overlay.style.display = 'none';
        btnTx.disabled = false;
        btnTest.disabled = false;
    }
}

async function executeBleTransaction(characteristicUuid, payloadArray, completionMessage) {
    setInterfaceLock(true);
    log('Scanning host wireless adapters for advertising target...');
    
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }]
        });
        
        const disconnectHandler = () => { log('Link terminated by hardware window boundary.', 'error'); };
        device.addEventListener('gattserverdisconnected', disconnectHandler);

        log('Initializing session handshake...');
        const server = await device.gatt.connect();
        
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(characteristicUuid);
        
        const encoder = new TextEncoder();
        
        for (const item of payloadArray) {
            const payload = encoder.encode(item);
            log(`Streaming raw data array payload: "${item}" (${payload.length} bytes)...`);
            await characteristic.writeValue(payload);
        }
        
        log(completionMessage, 'success');
        
        device.removeEventListener('gattserverdisconnected', disconnectHandler);
        await device.gatt.disconnect();
        log('Session closed cleanly.');
    } catch (error) {
        log(`Pipeline exception error: ${error.message}`, 'error');
    } finally {
        setInterfaceLock(false);
    }
}

function sendActiveConfig() {
    const lookup = {
        'ssid': 'SSID',
        'password': 'PASSWORD',
        'token': 'TOKEN',
        'user_id': 'USER_ID',
        'ble_name': 'BLUETOOTH',
        'time_1': 'TIME_1',
        'time_2': 'TIME_2',
        'time_3': 'TIME_3',
        'message': 'MESSAGE'
    };

    let activePayloads = [];
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const [elementId, key] of Object.entries(lookup)) {
        const val = document.getElementById(elementId).value.trim();
        if (val.length > 0) {
            if (elementId.startsWith('time_') && !timeRegex.test(val)) {
                log(`Invalid 24h formatting context on ${key.toLowerCase()}. Use HH:MM execution standards.`, 'error');
                return;
            }
            activePayloads.push(`${key}=${val}`);
        }
    }

    if (activePayloads.length === 0) {
        log('No parameters populated. Transmission aborted.', 'warn');
        return;
    }

    executeBleTransaction(CONFIG_CHAR_UUID, activePayloads, 'Target parameters synced and verified.');
}

function triggerHardwareLineNotify() {
    executeBleTransaction(TRIGGER_CHAR_UUID, ["1"], 'Hardware alert pipeline execution command issued.');
}

log('Terminal sequence active. Monitoring pipeline ready.');