const SERVICE_UUID = "4faac861-11a1-11ee-be56-0242ac120002";
const CONFIG_CHAR_UUID = "4faac862-11a1-11ee-be56-0242ac120002";
const TRIGGER_CHAR_UUID = "4faac863-11a1-11ee-be56-0242ac120002";

let bleDevice = null;
let bleServer = null;
let bleService = null;
let triggerChar = null;
let configChar = null;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const syncBtn = document.getElementById('syncBtn');
const statusText = document.getElementById('statusText');
const triggerButtons = document.querySelectorAll('.trigger-btn');

connectBtn.addEventListener('click', connectBLE);
disconnectBtn.addEventListener('click', disconnectBLE);
syncBtn.addEventListener('click', sendActiveConfiguration);

triggerButtons.forEach(btn => {
    btn.disabled = true;
    btn.addEventListener('click', () => executeTrigger(btn.getAttribute('data-trigger')));
});

async function connectBLE() {
    try {
        statusText.textContent = "Searching...";
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }]
        });

        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        statusText.textContent = "Connecting...";
        
        bleServer = await bleDevice.gatt.connect();
        bleService = await bleServer.getPrimaryService(SERVICE_UUID);
        
        triggerChar = await bleService.getCharacteristic(TRIGGER_CHAR_UUID);
        configChar = await bleService.getCharacteristic(CONFIG_CHAR_UUID);

        statusText.textContent = `Connected: ${bleDevice.name}`;
        statusText.style.color = "#2b6cb0";
        
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        syncBtn.disabled = false;
        triggerButtons.forEach(btn => btn.disabled = false);
    } catch (error) {
        console.error(error);
        statusText.textContent = `Error: ${error.message}`;
        statusText.style.color = "#c53030";
    }
}

async function executeTrigger(value) {
    if (!triggerChar) return;
    try {
        const encoder = new TextEncoder();
        await triggerChar.writeValueWithResponse(encoder.encode(value));
    } catch (error) {
        alert(`Trigger communication error: ${error.message}`);
    }
}

async function sendActiveConfiguration() {
    if (!configChar) return;

    // Map DOM IDs to the exact string keys your C++ firmware conditions look for
    const lookup = {
        'cfg_SSID': 'SSID',
        'cfg_PASSWORD': 'PASSWORD',
        'cfg_TOKEN': 'TOKEN',
        'cfg_USER_ID': 'USER_ID',
        'cfg_MESSAGE': 'MESSAGE',
        'cfg_BLUETOOTH': 'BLUETOOTH',
        'cfg_TIME_1': 'TIME_1',
        'cfg_TIME_2': 'TIME_2',
        'cfg_TIME_3': 'TIME_3'
    };

    let payloads = [];

    for (const [elementId, configKey] of Object.entries(lookup)) {
        const inputVal = document.getElementById(elementId).value.trim();
        if (inputVal.length > 0) {
            // Generates "KEY=value" strings to feed your firmware line parser loop
            payloads.push(`${configKey}=${inputVal}`);
        }
    }

    if (payloads.length === 0) {
        alert("No configuration changes found.");
        return;
    }

    const encoder = new TextEncoder();
    try {
        // Sequential writes for each modified field to fit MTU limits safely
        for (const item of payloads) {
            await configChar.writeValueWithResponse(encoder.encode(item));
        }
        alert("Modifications synced successfully.");
    } catch (error) {
        alert(`Sync failed: ${error.message}`);
    }
}

function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    statusText.textContent = "Disconnected";
    statusText.style.color = "#718096";
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    syncBtn.disabled = true;
    triggerButtons.forEach(btn => btn.disabled = true);
    
    bleDevice = null;
    bleServer = null;
    bleService = null;
    triggerChar = null;
    configChar = null;
}