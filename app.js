const SERVICE_UUID = "4faac861-11a1-11ee-be56-0242ac120002";
const CHARACTERISTIC_UUID = "4faac862-11a1-11ee-be56-0242ac120002"; // Unified Handle

const CMD_CONFIG_UPDATE = 0x01;
const CMD_TRIGGER_NOTIF = 0x02;

const FIELD_IDS = {
    'ssid':      0x0A,
    'password':  0x0B,
    'token':     0x0C,
    'user_id':   0x0D,
    'message':   0x0E,
    'ble_name':  0x0F,
    'time_1':    0x10,
    'time_2':    0x11,
    'time_3':    0x12
};

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

async function executeBleTransaction(binaryBuffer, completionMessage) {
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
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        
        log(`Streaming single atomic payload byte block (${binaryBuffer.byteLength} bytes)...`);
        await characteristic.writeValue(binaryBuffer);
        
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
    let fieldsToPack = [];
    let totalPayloadSize = 1; // 1 byte allocated for Command Type ID

    const encoder = new TextEncoder();
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const [elementId, fieldId] of Object.entries(FIELD_IDS)) {
        const element = document.getElementById(elementId);
        if (!element) continue;

        const val = element.value.trim();
        if (val.length > 0) {
            if (elementId.startsWith('time_') && !timeRegex.test(val)) {
                log(`Invalid 24h formatting structure on field ID ${fieldId}. Ensure full HH:MM compilation.`, 'error');
                return;
            }

            const encodedValue = encoder.encode(val);
            if (encodedValue.length > 255) {
                log(`Payload content sizing for element ${elementId} out of range (>255).`, 'error');
                return;
            }

            fieldsToPack.push({ id: fieldId, len: encodedValue.length, data: encodedValue });
            totalPayloadSize += 2 + encodedValue.length; // 1 byte ID + 1 byte Length + Data payload
        }
    }

    if (fieldsToPack.length === 0) {
        log('No parameters populated. Transmission aborted.', 'warn');
        return;
    }

    const packet = new Uint8Array(totalPayloadSize);
    packet[0] = CMD_CONFIG_UPDATE;

    let offset = 1;
    for (const field of fieldsToPack) {
        packet[offset++] = field.id;
        packet[offset++] = field.len;
        packet.set(field.data, offset);
        offset += field.len;
    }

    executeBleTransaction(packet, 'Target parameters packed into TLV array and synced successfully.');
}

function triggerHardwareLineNotify() {
    const packet = new Uint8Array([CMD_TRIGGER_NOTIF]);
    executeBleTransaction(packet, 'Hardware alert pipeline execution command issued.');
}

log('Terminal sequence active. Monitoring pipeline ready.');