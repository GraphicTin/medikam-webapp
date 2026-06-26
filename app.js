const SERVICE_UUID = "4faac861-11a1-11ee-be56-0242ac120002";
const CONFIG_CHAR_UUID = "4faac862-11a1-11ee-be56-0242ac120002";
const TRIGGER_CHAR_UUID = "4faac863-11a1-11ee-be56-0242ac120002";

let bleDevice = null;
let bleServer = null;
let bleService = null;
let triggerCharacteristic = null;
let configCharacteristic = null;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendConfigBtn = document.getElementById('sendConfigBtn');
const statusText = document.getElementById('statusText');

connectBtn.addEventListener('click', connectBLE);
disconnectBtn.addEventListener('click', disconnectBLE);
sendConfigBtn.addEventListener('click', sendConfig);

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
        
        triggerCharacteristic = await bleService.getCharacteristic(TRIGGER_CHAR_UUID);
        configCharacteristic = await bleService.getCharacteristic(CONFIG_CHAR_UUID);

        statusText.textContent = `Connected: ${bleDevice.name}`;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        sendConfigBtn.disabled = false;
    } catch (error) {
        console.error(error);
        statusText.textContent = `Connection failed: ${error.message}`;
    }
}

async function sendTriggerValue(val) {
    if (!triggerCharacteristic) {
        alert("Connect to the device first.");
        return;
    }
    const encoder = new TextEncoder();
    try {
        await triggerCharacteristic.writeValueWithResponse(encoder.encode(val));
    } catch (error) {
        alert(`Trigger error: ${error.message}`);
    }
}

async function sendConfig() {
    if (!configCharacteristic) return;
    
    const fields = [
        document.getElementById('ssid').value,
        document.getElementById('password').value,
        document.getElementById('token').value,
        document.getElementById('userId').value,
        document.getElementById('message').value,
        document.getElementById('btName').value
    ];

    const csvPayload = fields.join(',');
    const encoder = new TextEncoder();
    try {
        await configCharacteristic.writeValueWithResponse(encoder.encode(csvPayload));
        alert("Configuration saved.");
    } catch (error) {
        alert(`Save failed: ${error.message}`);
    }
}

function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    statusText.textContent = "Disconnected";
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    sendConfigBtn.disabled = true;
    
    bleDevice = null;
    bleServer = null;
    bleService = null;
    triggerCharacteristic = null;
    configCharacteristic = null;
}