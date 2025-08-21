import { mockChromeExtension, createMockScreenshot, createMockSettings } from '@/utils/test-utils';

describe('Chrome Extension Test Setup', () => {
  beforeEach(() => {
    mockChromeExtension.resetMocks();
  });

  it('should have chrome APIs available', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime).toBeDefined();
    expect(chrome.tabs).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.downloads).toBeDefined();
  });

  it('should mock chrome.runtime.sendMessage', async () => {
    const mockResponse = { success: true };
    mockChromeExtension.mockRuntimeMessage(mockResponse);

    const response = await chrome.runtime.sendMessage({ type: 'test' });
    expect(response).toEqual(mockResponse);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'test' });
  });

  it('should mock chrome.tabs.captureVisibleTab', async () => {
    const mockDataUrl = 'data:image/png;base64,mockdata';
    mockChromeExtension.mockCaptureTab(mockDataUrl);

    const dataUrl = await chrome.tabs.captureVisibleTab();
    expect(dataUrl).toBe(mockDataUrl);
  });

  it('should mock chrome.storage operations', async () => {
    const mockData = { setting1: 'value1' };
    mockChromeExtension.mockStorageGet(mockData);

    const result = await chrome.storage.local.get();
    expect(result).toEqual(mockData);

    await chrome.storage.local.set({ setting2: 'value2' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ setting2: 'value2' });
  });

  it('should create mock screenshot data', () => {
    const screenshot = createMockScreenshot({
      annotation: 'Custom annotation'
    });

    expect(screenshot).toMatchObject({
      dataUrl: expect.stringContaining('data:image/png;base64,'),
      url: expect.any(String),
      timestamp: expect.any(Number),
      coordinates: { x: expect.any(Number), y: expect.any(Number) },
      annotation: 'Custom annotation'
    });
  });

  it('should create mock settings', () => {
    const settings = createMockSettings({
      mode: 'annotation'
    });

    expect(settings).toMatchObject({
      mode: 'annotation',
      markerColor: expect.any(String),
      saveLocation: expect.any(String),
      voiceEnabled: expect.any(Boolean)
    });
  });
});

describe('Web APIs Mocking', () => {
  it('should mock SpeechRecognition', () => {
    const recognition = new SpeechRecognition();
    expect(recognition.start).toBeDefined();
    expect(recognition.stop).toBeDefined();
    expect(recognition.addEventListener).toBeDefined();
  });

  it('should mock MediaRecorder', () => {
    const recorder = new MediaRecorder(new MediaStream());
    expect(recorder.start).toBeDefined();
    expect(recorder.stop).toBeDefined();
    expect(recorder.state).toBe('inactive');
  });

  it('should mock navigator.mediaDevices', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    expect(stream.getTracks).toBeDefined();
  });

  it('should mock URL methods', () => {
    const url = URL.createObjectURL(new Blob());
    expect(url).toBe('blob:mock-url');
    
    URL.revokeObjectURL(url);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});