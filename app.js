const SERVICE_UUID = "4faac861-11a1-11ee-be56-0242ac120002";
const CONFIG_CHAR_UUID = "4faac862-11a1-11ee-be56-0242ac120002";
const TRIGGER_CHAR_UUID = "4faac863-11a1-11ee-be56-0242ac120002";

let bleDevice = null;
let bleServer = null;
let bleService = null;
let triggerCharacteristic = null;
let configCharacteristic = null;

// UI Elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendTriggerBtn = document.getElementById('sendTriggerBtn');
const sendConfigBtn = document.getElementById('sendConfigBtn');
const statusText = document.getElementById('statusText');

// Event Listeners
connectBtn.addEventListener('click', connectBLE);
disconnectBtn.addEventListener('click', disconnectBLE);
sendTriggerBtn.addEventListener('click', sendTrigger);
sendConfigBtn.addEventListener('click', sendConfig);

async function connectBLE() {
    try {
        statusText.textContent = "Status: Searching...";
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }]
        });

        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

        statusText.textContent = "Status: Connecting...";
        bleServer = await bleDevice.gatt.connect();
        bleService = await bleServer.getPrimaryService(SERVICE_UUID);
        
        triggerCharacteristic = await bleService.getCharacteristic(TRIGGER_CHAR_UUID);
        configCharacteristic = await bleService.getCharacteristic(CONFIG_CHAR_UUID);

        statusText.textContent = `Status: Connected to ${bleDevice.name}`;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        sendTriggerBtn.disabled = false;
        sendConfigBtn.disabled = false;
    } catch (error) {
        console.error(error);
        statusText.textContent = `Error: ${error.message}`;
    }
}

async function sendTrigger() {
    if (!triggerCharacteristic) return;
    const value = document.getElementById('triggerInput').value;
    const encoder = new TextEncoder();
    try {
        await triggerCharacteristic.writeValueWithResponse(encoder.encode(value));
        alert("Trigger sent successfully");
    } catch (error) {
        alert(`Trigger write failed: ${error.message}`);
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
        alert("Configuration sync payload deployed successfully");
    } catch (error) {
        alert(`Config deployment failure: ${error.message}`);
    }
}

function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    statusText.textContent = "Status: Disconnected";
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    sendTriggerBtn.disabled = true;
    sendConfigBtn.disabled = true;
    
    bleDevice = null;
    bleServer = null;
    bleService = null;
    triggerCharacteristic = null;
    configCharacteristic = null;
}