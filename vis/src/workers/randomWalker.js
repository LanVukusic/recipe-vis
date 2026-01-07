// This is a simple Web Worker that will handle random walks
// It runs in a separate thread and doesn't have access to the DOM

self.onmessage = function (event) {
  console.log('Worker received message:', event.data);

  // For now, just echo back what we received
  self.postMessage({
    type: 'ECHO',
    data: event.data
  });
};
