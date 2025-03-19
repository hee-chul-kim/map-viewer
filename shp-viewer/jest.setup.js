// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the FileReader API which is not available in jsdom
class MockFileReader {
  onload = null;
  onerror = null;
  result = null;

  readAsArrayBuffer(blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
);
